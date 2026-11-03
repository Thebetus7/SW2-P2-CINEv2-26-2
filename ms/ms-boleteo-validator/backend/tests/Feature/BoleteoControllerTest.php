<?php

use App\Models\AccessScan;
use App\Services\CryptoValidationService;
use App\Services\TicketAuthClient;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rechaza firma adulterada sin consultar TicketAuthClient (RB-BOL-01)', function () {
    $cryptoService = new CryptoValidationService('clave_secreta_universitaria_mcp');

    // Mockeamos TicketAuthClient asegurando que nunca debe ser invocado si la firma es inválida
    $ticketAuthMock = Mockery::mock(TicketAuthClient::class);
    $ticketAuthMock->shouldNotReceive('useTicket');
    app()->instance(TicketAuthClient::class, $ticketAuthMock);

    $invalidPayload = [
        'ticketId' => 'ticket-falsificado-uuid',
        'seatId' => 'A-1',
        'showtimeId' => 'showtime-1',
        'issuedAt' => '2026-11-03T18:30:00Z',
        'sig' => 'firma-totalmente-falsa-1234567890abcdef',
    ];

    $response = $this->withHeaders(['X-User-Role' => 'BOLETERO'])->postJson('/api/validate-ticket', [
        'payload' => $invalidPayload,
        'validatorEmail' => 'boletero@cine.local',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'valid' => false,
            'reason' => 'INVALID_SIGNATURE',
            'message' => 'ACCESO DENEGADO: Firma criptográfica ilegítima / Código adulterado',
        ]);

    // Verificar registro en BD local
    $this->assertDatabaseHas('access_scans', [
        'ticket_id' => 'ticket-falsificado-uuid',
        'result' => AccessScan::RESULT_INVALID_SIGNATURE,
        'validator_email' => 'boletero@cine.local',
    ]);
});

test('autoriza acceso cuando firma es legítima y TicketAuth responde 200 (SC-05.1.1)', function () {
    $cryptoService = new CryptoValidationService('clave_secreta_universitaria_mcp');
    app()->instance(CryptoValidationService::class, $cryptoService);

    $ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    $seatId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    $showtimeId = '123e4567-e89b-12d3-a456-426614174000';
    $issuedAt = '2026-11-03T18:30:00Z';
    $signature = $cryptoService->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    $ticketAuthMock = Mockery::mock(TicketAuthClient::class);
    $ticketAuthMock->shouldReceive('useTicket')
        ->once()
        ->andReturn([
            'success' => true,
            'status' => 'USED',
            'movieTitle' => 'Avatar 2: El Sentido del Agua',
            'hallName' => 'Sala IMAX 1',
            'seatLabel' => 'C-8',
            'message' => 'Acceso autorizado correctamente.',
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
            'sig' => $signature,
        ],
        'validatorEmail' => 'boletero@cine.local',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'valid' => true,
            'status' => 'USED',
            'movieTitle' => 'Avatar 2: El Sentido del Agua',
            'hallName' => 'Sala IMAX 1',
            'seatLabel' => 'C-8',
            'message' => 'ACCESO AUTORIZADO',
        ]);

    $this->assertDatabaseHas('access_scans', [
        'ticket_id' => $ticketId,
        'result' => AccessScan::RESULT_SUCCESS,
        'movie_title' => 'Avatar 2: El Sentido del Agua',
        'seat_code' => 'C-8',
    ]);
});

test('retorna historial reciente de escaneos en recentScans', function () {
    AccessScan::create([
        'ticket_id' => 'ticket-hist-1',
        'movie_title' => 'Dune 2',
        'hall_name' => 'Sala 3',
        'seat_code' => 'D-12',
        'scanned_at' => now(),
        'result' => AccessScan::RESULT_SUCCESS,
        'validator_email' => 'boletero@cine.local',
    ]);

    $response = $this->withHeaders(['X-User-Role' => 'BOLETERO'])->getJson('/api/scans/recent');

    $response->assertStatus(200)
        ->assertJsonStructure(['scans', 'count'])
        ->assertJsonFragment(['ticket_id' => 'ticket-hist-1']);
});
