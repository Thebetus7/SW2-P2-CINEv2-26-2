<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;

class TicketAuthClient
{
    private ClientInterface $client;

    private string $baseUrl;

    public function __construct(?ClientInterface $client = null, ?string $baseUrl = null)
    {
        $this->baseUrl = rtrim($baseUrl ?? (string) config('services.ticket_auth.url', 'http://localhost:8081'), '/');
        $this->client = $client ?? new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 5.0,
            'connect_timeout' => 2.0,
        ]);
    }

    /**
     * Consume la API de MS TICKET-AUTH para transicionar el estado del boleto a USED.
     *
     * @param  string  $ticketId  Identificador UUID del boleto.
     * @param  string  $signature  Firma criptográfica validada previamente.
     * @param  string|null  $scannedAt  Marca temporal de lectura ISO8601.
     * @param  string|null  $jwtToken  Token Bearer de la sesión del boletero.
     * @return array{
     *     success: bool,
     *     status: string,
     *     movieTitle: ?string,
     *     hallName: ?string,
     *     seatLabel: ?string,
     *     message: string,
     *     errorCode: ?string,
     *     statusCode: int
     * }
     */
    public function useTicket(
        string $ticketId,
        string $signature,
        ?string $scannedAt = null,
        ?string $jwtToken = null
    ): array {
        $timestamp = $scannedAt ?? now()->toIso8601String();
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if ($jwtToken) {
            $headers['Authorization'] = "Bearer {$jwtToken}";
        }

        $url = "{$this->baseUrl}/api/v1/tickets/{$ticketId}/use";

        $payload = [
            'ticketId' => $ticketId,
            'qrSignature' => $signature,
            'scannedAt' => $timestamp,
        ];

        try {
            $response = $this->client->request('POST', $url, [
                'headers' => $headers,
                'json' => $payload,
            ]);

            $statusCode = $response->getStatusCode();
            $body = json_decode((string) $response->getBody(), true) ?? [];

            return [
                'success' => true,
                'status' => $body['status'] ?? 'USED',
                'movieTitle' => $body['movieTitle'] ?? null,
                'showtimeId' => $body['showtimeId'] ?? null,
                'hallName' => $body['hallName'] ?? 'Sala General',
                'seatLabel' => $body['seatLabel'] ?? 'S/A',
                'message' => 'Acceso autorizado correctamente.',
                'errorCode' => null,
                'statusCode' => $statusCode,
            ];
        } catch (ClientException $e) {
            $statusCode = $e->getResponse() ? $e->getResponse()->getStatusCode() : 400;
            $body = $e->getResponse() ? json_decode((string) $e->getResponse()->getBody(), true) : [];

            if ($statusCode === 409) {
                return [
                    'success' => false,
                    'status' => 'ALREADY_USED',
                    'movieTitle' => $body['movieTitle'] ?? null,
                    'hallName' => $body['hallName'] ?? null,
                    'seatLabel' => $body['seatLabel'] ?? null,
                    'message' => $body['message'] ?? 'El boleto ya fue utilizado con anterioridad.',
                    'errorCode' => $body['errorCode'] ?? 'TICKET_ALREADY_USED',
                    'statusCode' => 409,
                ];
            }

            return [
                'success' => false,
                'status' => 'ERROR',
                'movieTitle' => null,
                'hallName' => null,
                'seatLabel' => null,
                'message' => $body['message'] ?? $e->getMessage(),
                'errorCode' => $body['errorCode'] ?? 'CLIENT_ERROR',
                'statusCode' => $statusCode,
            ];
        } catch (RequestException|GuzzleException $e) {
            Log::error("Error de comunicación con Ticket-Auth [{$ticketId}]: ".$e->getMessage());

            return [
                'success' => false,
                'status' => 'ERROR',
                'movieTitle' => null,
                'hallName' => null,
                'seatLabel' => null,
                'message' => 'Falla de conexión con MS TICKET-AUTH. Verifique la conectividad de red.',
                'errorCode' => 'CONNECTION_FAILED',
                'statusCode' => 503,
            ];
        }
    }
}
