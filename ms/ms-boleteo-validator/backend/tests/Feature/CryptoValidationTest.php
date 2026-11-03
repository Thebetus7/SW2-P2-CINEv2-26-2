<?php

use App\Services\CryptoValidationService;

test('aprueba firma criptografica legitima generada con clave institucional', function () {
    $service = new CryptoValidationService('clave_secreta_universitaria_mcp');

    $ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    $seatId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    $showtimeId = '123e4567-e89b-12d3-a456-426614174000';
    $issuedAt = '2026-11-03T18:30:00Z';

    $sig = $service->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    $payload = [
        'ticketId' => $ticketId,
        'seatId' => $seatId,
        'showtimeId' => $showtimeId,
        'issuedAt' => $issuedAt,
        'sig' => $sig,
    ];

    expect($service->validateSignature($payload))->toBeTrue();
});

test('rechaza firma con un solo caracter adulterado (RB-BOL-01)', function () {
    $service = new CryptoValidationService('clave_secreta_universitaria_mcp');

    $ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    $seatId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    $showtimeId = '123e4567-e89b-12d3-a456-426614174000';
    $issuedAt = '2026-11-03T18:30:00Z';

    $sig = $service->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    // Alterar el último caracter de la firma hexadecimal
    $lastChar = substr($sig, -1);
    $alteredLastChar = ($lastChar === '0') ? '1' : '0';
    $tamperedSig = substr($sig, 0, -1).$alteredLastChar;

    $payload = [
        'ticketId' => $ticketId,
        'seatId' => $seatId,
        'showtimeId' => $showtimeId,
        'issuedAt' => $issuedAt,
        'sig' => $tamperedSig,
    ];

    expect($service->validateSignature($payload))->toBeFalse();
});

test('rechaza codigo cuando el asiento ha sido adulterado a otra fila o butaca', function () {
    $service = new CryptoValidationService('clave_secreta_universitaria_mcp');

    $ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    $realSeat = 'C-8';
    $tamperedSeat = 'A-1';
    $showtimeId = '123e4567-e89b-12d3-a456-426614174000';
    $issuedAt = '2026-11-03T18:30:00Z';

    $sig = $service->generateSignature($ticketId, $realSeat, $showtimeId, $issuedAt);

    $payload = [
        'ticketId' => $ticketId,
        'seatId' => $tamperedSeat,
        'showtimeId' => $showtimeId,
        'issuedAt' => $issuedAt,
        'sig' => $sig,
    ];

    expect($service->validateSignature($payload))->toBeFalse();
});

test('rechaza firma firmada con clave secreta apocrifa o desconocida', function () {
    $legitService = new CryptoValidationService('clave_secreta_universitaria_mcp');
    $rogueService = new CryptoValidationService('clave_falsa_hacker_123');

    $ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    $seatId = 'C-8';
    $showtimeId = 'show-1';
    $issuedAt = '2026-11-03T18:30:00Z';

    $rogueSig = $rogueService->generateSignature($ticketId, $seatId, $showtimeId, $issuedAt);

    $payload = [
        'ticketId' => $ticketId,
        'seatId' => $seatId,
        'showtimeId' => $showtimeId,
        'issuedAt' => $issuedAt,
        'sig' => $rogueSig,
    ];

    expect($legitService->validateSignature($payload))->toBeFalse();
});
