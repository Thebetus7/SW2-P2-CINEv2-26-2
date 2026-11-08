<?php

namespace App\Http\Controllers;

use App\Models\AccessScan;
use App\Services\CryptoValidationService;
use App\Services\TicketAuthClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BoleteoController extends Controller
{
    public function __construct(
        protected CryptoValidationService $cryptoService,
        protected TicketAuthClient $ticketAuthClient
    ) {}

    /**
     * Valida el código QR escaneado aplicando la regla RB-BOL-01:
     * Comprueba HMAC-SHA256 localmente antes de consultar a la red.
     */
    public function validateTicket(Request $request): JsonResponse
    {
        // El payload puede llegar dentro de 'payload' o directamente en la raíz de la petición
        $payload = $request->input('payload');
        if (! is_array($payload)) {
            $payload = [
                'ticketId' => $request->input('ticketId'),
                'seatId' => $request->input('seatId'),
                'showtimeId' => $request->input('showtimeId'),
                'issuedAt' => $request->input('issuedAt'),
                'sig' => $request->input('sig'),
            ];
        }

        $validatorEmail = (string) ($request->input('validatorEmail')
            ?? $request->user()?->email
            ?? 'boletero@cine.local');

        $ticketId = (string) ($payload['ticketId'] ?? 'UNKNOWN');

        // RB-BOL-01: Verificación Criptográfica Previa a la Red
        $isSignatureValid = $this->cryptoService->validateSignature($payload);

        if (! $isSignatureValid) {
            // Registrar intento ilegítimo en auditoría local
            $scan = AccessScan::create([
                'ticket_id' => $ticketId,
                'movie_title' => null,
                'hall_name' => null,
                'seat_code' => $payload['seatId'] ?? null,
                'scanned_at' => now(),
                'result' => AccessScan::RESULT_INVALID_SIGNATURE,
                'validator_email' => $validatorEmail,
            ]);

            $this->emitTelemetry('BOLETO_FIRMA_INVALIDA', 'ERROR', "Rechazo de boleto #{$ticketId}: firma criptográfica ilegítima", [
                'ticketId' => $ticketId,
                'validator' => $validatorEmail,
            ]);

            return response()->json([
                'valid' => false,
                'reason' => 'INVALID_SIGNATURE',
                'message' => 'ACCESO DENEGADO: Firma criptográfica ilegítima / Código adulterado',
                'scan' => $scan,
            ], 200);
        }

        // Si la firma es auténtica, consultar y sincronizar con MS TICKET-AUTH (IC-05.1)
        $bearerToken = $request->bearerToken();
        $authResponse = $this->ticketAuthClient->useTicket(
            $ticketId,
            (string) ($payload['sig'] ?? ''),
            now()->toIso8601String(),
            $bearerToken
        );

        if ($authResponse['success']) {
            // Obtener el título desde la función real; no fabricar uno si falla.
            if (empty($authResponse['movieTitle']) && ! empty($authResponse['showtimeId'])) {
                try {
                    $baseUrl = rtrim((string) config('services.cinema_core.url'), '/');
                    $showtime = Http::timeout(2)->get($baseUrl.'/api/v1/showtimes/'.$authResponse['showtimeId']);
                    if ($showtime->successful()) {
                        $authResponse['movieTitle'] = $showtime->json('movie.title');
                    }
                } catch (\Illuminate\Http\Client\ConnectionException $exception) {
                    Log::warning('No se pudo obtener la película de la función', ['error' => $exception->getMessage()]);
                }
            }
            $scan = AccessScan::create([
                'ticket_id' => $ticketId,
                'movie_title' => $authResponse['movieTitle'],
                'hall_name' => $authResponse['hallName'],
                'seat_code' => $authResponse['seatLabel'],
                'scanned_at' => now(),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => $validatorEmail,
            ]);

            $this->emitTelemetry('BOLETO_VALIDADO', 'SUCCESS', "Boleto #{$ticketId} validado exitosamente en {$authResponse['hallName']}", [
                'ticketId' => $ticketId,
                'movieTitle' => $authResponse['movieTitle'],
                'hallName' => $authResponse['hallName'],
                'seatLabel' => $authResponse['seatLabel'],
            ]);

            return response()->json([
                'valid' => true,
                'status' => 'USED',
                'movieTitle' => $authResponse['movieTitle'],
                'hallName' => $authResponse['hallName'],
                'seatLabel' => $authResponse['seatLabel'],
                'message' => 'ACCESO AUTORIZADO',
                'scan' => $scan,
            ], 200);
        }

        // Caso: Boleto ya utilizado con anterioridad (RB-BOL-02)
        if ($authResponse['status'] === 'ALREADY_USED') {
            $scan = AccessScan::create([
                'ticket_id' => $ticketId,
                'movie_title' => $authResponse['movieTitle'],
                'hall_name' => $authResponse['hallName'],
                'seat_code' => $authResponse['seatLabel'],
                'scanned_at' => now(),
                'result' => AccessScan::RESULT_ALREADY_USED,
                'validator_email' => $validatorEmail,
            ]);

            $this->emitTelemetry('BOLETO_RECHAZADO_DUPLICADO', 'WARN', "Alerta: Boleto #{$ticketId} ya había sido canjeado previamente", [
                'ticketId' => $ticketId,
                'movieTitle' => $authResponse['movieTitle'],
                'validator' => $validatorEmail,
            ]);

            return response()->json([
                'valid' => false,
                'reason' => 'ALREADY_USED',
                'message' => 'ACCESO RECHAZADO: Boleto ya utilizado con anterioridad',
                'details' => $authResponse['message'],
                'scan' => $scan,
            ], 200);
        }

        // Caso de falla de conexión u otro error transitorio
        return response()->json([
            'valid' => false,
            'reason' => 'NETWORK_OR_SERVER_ERROR',
            'message' => $authResponse['message'],
            'errorCode' => $authResponse['errorCode'],
        ], 503);
    }

    /**
     * Retorna los últimos 20 escaneos registrados en la base de datos.
     */
    public function recentScans(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit', 20);
        $scans = AccessScan::recent($limit)->get();

        return response()->json([
            'scans' => $scans,
            'count' => $scans->count(),
        ]);
    }

    /**
     * Emite telemetría asíncrona no bloqueante (fire-and-forget) a la Consola IA-MCP (RF-09.3, RB-02).
     */
    private function emitTelemetry(string $actionType, string $severity, string $summary, array $metadata = []): void
    {
        try {
            $mcpUrl = rtrim((string) config('services.ia_mcp.url', 'http://localhost:8001'), '/');
            Http::timeout(1)->async()->post("{$mcpUrl}/api/v1/logs/ingest", [
                'sourceService' => 'ms-boleteo-validator',
                'actorRole' => 'BOLETERO',
                'actionType' => $actionType,
                'severity' => $severity,
                'summary' => $summary,
                'metadata' => $metadata,
            ]);
        } catch (\Throwable $e) {
            // No bloquear ni penalizar tiempos de respuesta de taquilla
            Log::debug('Telemetría no entregada a ms-ia-mcp: ' . $e->getMessage());
        }
    }
}
