<?php

use App\Services\CryptoValidationService;

test('calcula y valida firma HMAC-SHA256 legítima', function () {
    $service = new CryptoValidationService('clave_secreta_universitaria_mcp');

    $ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    $seatId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    $showtimeId = '123e4567-e89b-12d3-a456-426614174000';
    $issuedAt = '2026-11-03T18:30:00Z';

    $signature = $service->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    $payload = [
        'ticketId' => $ticketId,
        'seatId' => $seatId,
        'showtimeId' => $showtimeId,
        'issuedAt' => $issuedAt,
        'sig' => $signature,
    ];

    expect($service->validateSignature($payload))->toBeTrue();
});

test('rechaza firma si cualquier campo del payload es alterado', function () {
    $service = new CryptoValidationService('clave_secreta_universitaria_mcp');

    $ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    $seatId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    $showtimeId = '123e4567-e89b-12d3-a456-426614174000';
    $issuedAt = '2026-11-03T18:30:00Z';

    $signature = $service->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    // Asiento adulterado (A-1 en vez de C-8)
    $alteredPayload = [
        'ticketId' => $ticketId,
        'seatId' => 'adulterado-seat-0000',
        'showtimeId' => $showtimeId,
        'issuedAt' => $issuedAt,
        'sig' => $signature,
    ];

    expect($service->validateSignature($alteredPayload))->toBeFalse();
});

test('rechaza payload con campos incompletos o tipos inválidos', function () {
    $service = new CryptoValidationService;

    expect($service->validateSignature([]))->toBeFalse();
    expect($service->validateSignature(['ticketId' => 'abc']))->toBeFalse();
});
