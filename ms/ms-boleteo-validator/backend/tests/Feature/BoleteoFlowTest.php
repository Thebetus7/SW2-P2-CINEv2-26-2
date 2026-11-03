<?php

use App\Models\AccessScan;
use App\Services\CryptoValidationService;
use App\Services\TicketAuthClient;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Escenario 1: Validación Exitosa de Boleto Legítimo (SC-05.1.1)
 *
 * Given que el boletero "boletero@cine.local" tiene activo el panel de boleteo
 * When un cliente presenta su código QR dinámico legítimo para la butaca "C-8" de la película "Avatar 2"
 * Then el sistema comprueba que la firma HMAC-SHA256 es auténtica
 * And MS TICKET-AUTH confirma que el ticket pasa a estado "USED"
 * And retorna resultado exitoso con datos de sala y butaca
 * And el registro se agrega a la lista de validaciones recientes del turno
 */
test('SC-05.1.1: valida exitosamente un boleto legítimo con firma HMAC auténtica y actualiza a USED', function () {
    $secret = 'clave_secreta_universitaria_mcp';
    $cryptoService = new CryptoValidationService($secret);
    app()->instance(CryptoValidationService::class, $cryptoService);

    $ticketId = 'tck-legitimo-avatar-001';
    $seatId = 'seat-c8-uuid';
    $showtimeId = 'showtime-avatar-2026';
    $issuedAt = '2026-11-03T18:00:00Z';
    $validSignature = $cryptoService->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    // Mockeamos la respuesta 200 de Ticket-Auth transicionando a USED
    $ticketAuthMock = Mockery::mock(TicketAuthClient::class);
    $ticketAuthMock->shouldReceive('useTicket')
        ->once()
        ->with($ticketId, $validSignature, Mockery::any(), Mockery::any())
        ->andReturn([
            'success' => true,
            'status' => 'USED',
            'movieTitle' => 'Avatar 2: El Sentido del Agua',
            'hallName' => 'Sala 1 (IMAX)',
            'seatLabel' => 'C-8',
            'message' => 'Acceso concedido exitosamente.',
            'errorCode' => null,
            'statusCode' => 200,
        ]);
    app()->instance(TicketAuthClient::class, $ticketAuthMock);

    $response = $this->withHeaders(['X-User-Role' => 'BOLETERO'])->postJson('/api/validate-ticket', [
        'payload' => [
            'ticketId' => $ticketId,
            'seatId' => $seatId,
            'showtimeId' => $showtimeId,
            'issuedAt' => $issuedAt,
            'sig' => $validSignature,
        ],
        'validatorEmail' => 'boletero@cine.local',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'valid' => true,
            'status' => 'USED',
            'movieTitle' => 'Avatar 2: El Sentido del Agua',
            'hallName' => 'Sala 1 (IMAX)',
            'seatLabel' => 'C-8',
            'message' => 'ACCESO AUTORIZADO',
        ]);

    // Comprobar que se persistió en la tabla de escaneos de turno
    $this->assertDatabaseHas('access_scans', [
        'ticket_id' => $ticketId,
        'result' => AccessScan::RESULT_SUCCESS,
        'movie_title' => 'Avatar 2: El Sentido del Agua',
        'seat_code' => 'C-8',
        'validator_email' => 'boletero@cine.local',
    ]);
});

/**
 * Escenario 2: Intento de Reingreso con Boleto Ya Utilizado (SC-05.1.2)
 *
 * Given que un boleto para la butaca "C-8" ya fue escaneado y marcado como "USED" hace 10 minutos
 * When el mismo código QR es presentado nuevamente ante la cámara
 * Then el sistema detecta que el estado actual en el backend es "ALREADY_USED" (HTTP 409 Conflict)
 * And retorna motivo explícito de rechazo "Boleto ya utilizado con anterioridad"
 * And persiste en auditoría el intento de reingreso con resultado ALREADY_USED
 */
test('SC-05.1.2: rechaza intento de reingreso con boleto previamente utilizado (ALREADY_USED)', function () {
    $secret = 'clave_secreta_universitaria_mcp';
    $cryptoService = new CryptoValidationService($secret);
    app()->instance(CryptoValidationService::class, $cryptoService);

    $ticketId = 'tck-ya-usado-reingreso-002';
    $seatId = 'seat-c8-uuid';
    $showtimeId = 'showtime-avatar-2026';
    $issuedAt = '2026-11-03T18:00:00Z';
    $validSignature = $cryptoService->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    // Mockeamos que Ticket-Auth rechaza con 409 Conflict reportando que el boleto ya fue usado
    $ticketAuthMock = Mockery::mock(TicketAuthClient::class);
    $ticketAuthMock->shouldReceive('useTicket')
        ->once()
        ->andReturn([
            'success' => false,
            'status' => 'ALREADY_USED',
            'movieTitle' => 'Avatar 2: El Sentido del Agua',
            'hallName' => 'Sala 1 (IMAX)',
            'seatLabel' => 'C-8',
            'message' => 'El boleto ya fue utilizado con anterioridad a las 18:35.',
            'errorCode' => 'TICKET_ALREADY_USED',
            'statusCode' => 409,
        ]);
    app()->instance(TicketAuthClient::class, $ticketAuthMock);

    $response = $this->withHeaders(['X-User-Role' => 'BOLETERO'])->postJson('/api/validate-ticket', [
        'payload' => [
            'ticketId' => $ticketId,
            'seatId' => $seatId,
            'showtimeId' => $showtimeId,
            'issuedAt' => $issuedAt,
            'sig' => $validSignature,
        ],
        'validatorEmail' => 'boletero@cine.local',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'valid' => false,
            'reason' => 'ALREADY_USED',
            'message' => 'ACCESO RECHAZADO: Boleto ya utilizado con anterioridad',
        ]);

    // Comprobar que se registró el intento de reingreso
    $this->assertDatabaseHas('access_scans', [
        'ticket_id' => $ticketId,
        'result' => AccessScan::RESULT_ALREADY_USED,
        'movie_title' => 'Avatar 2: El Sentido del Agua',
        'seat_code' => 'C-8',
    ]);
});

/**
 * Escenario 3: Código QR Falsificado o Alterado (SC-05.1.3)
 *
 * Given que una persona genera un código QR alterando el asiento a "A-1" sin la clave institucional
 * When el lector procesa el código QR falso
 * Then el algoritmo recalcula HMAC-SHA256 con "clave_secreta_universitaria_mcp"
 * And detecta que la firma calculada no coincide con el campo "sig"
 * And rechaza la solicitud de inmediato sin consultar a TicketAuthClient (RB-BOL-01)
 * And persiste en auditoría el intento fraudulento con resultado INVALID_SIGNATURE
 */
test('SC-05.1.3: rechaza código QR falsificado con asiento alterado sin consultar la red (RB-BOL-01)', function () {
    $secret = 'clave_secreta_universitaria_mcp';
    $cryptoService = new CryptoValidationService($secret);
    app()->instance(CryptoValidationService::class, $cryptoService);

    // Verificamos que TicketAuthClient jamás deba ser llamado ante firma inválida
    $ticketAuthMock = Mockery::mock(TicketAuthClient::class);
    $ticketAuthMock->shouldNotReceive('useTicket');
    app()->instance(TicketAuthClient::class, $ticketAuthMock);

    $ticketId = 'tck-autentico-original';
    $originalSeatId = 'seat-c8-uuid';
    $showtimeId = 'showtime-avatar-2026';
    $issuedAt = '2026-11-03T18:00:00Z';
    // Generar firma legítima para el asiento C-8
    $validSignature = $cryptoService->generateSignature($ticketId, $originalSeatId, $showtimeId, $issuedAt);

    // El atacante altera el número de butaca a "A-1" manteniendo la firma de C-8
    $tamperedPayload = [
        'ticketId' => $ticketId,
        'seatId' => 'seat-A1-adulterado',
        'showtimeId' => $showtimeId,
        'issuedAt' => $issuedAt,
        'sig' => $validSignature, // Firma no corresponde al asiento A-1
    ];

    $response = $this->withHeaders(['X-User-Role' => 'BOLETERO'])->postJson('/api/validate-ticket', [
        'payload' => $tamperedPayload,
        'validatorEmail' => 'boletero@cine.local',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'valid' => false,
            'reason' => 'INVALID_SIGNATURE',
            'message' => 'ACCESO DENEGADO: Firma criptográfica ilegítima / Código adulterado',
        ]);

    // Comprobar que quedó registrado como firma inválida en BD local
    $this->assertDatabaseHas('access_scans', [
        'ticket_id' => $ticketId,
        'result' => AccessScan::RESULT_INVALID_SIGNATURE,
        'seat_code' => 'seat-A1-adulterado',
        'validator_email' => 'boletero@cine.local',
    ]);
});
