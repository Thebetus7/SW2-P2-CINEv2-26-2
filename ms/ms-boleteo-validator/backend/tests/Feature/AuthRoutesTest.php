<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('bloquea acceso a la API con 403 si el rol no es BOLETERO', function () {
    $response = $this->postJson('/api/validate-ticket', [
        'payload' => ['ticketId' => 'test-id'],
    ]);

    $response->assertStatus(403)
        ->assertJson([
            'error' => 'FORBIDDEN',
            'message' => 'Acceso denegado: Se requiere rol BOLETERO para operar la consola de validación.',
        ]);
});

test('permite acceso a la API si el header X-User-Role es BOLETERO', function () {
    $response = $this->withHeaders([
        'X-User-Role' => 'BOLETERO',
    ])->postJson('/api/validate-ticket', [
        'payload' => [
            'ticketId' => 'fake-ticket',
            'seatId' => 'A-1',
            'showtimeId' => 'show-1',
            'issuedAt' => '2026-11-03T18:00:00Z',
            'sig' => 'fake-signature',
        ],
    ]);

    // Debe superar el middleware de autenticación (retornando respuesta del controlador, no 403)
    $response->assertStatus(200);
});

test('permite acceso con JWT valido con claim role BOLETERO', function () {
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode(['sub' => '123', 'role' => 'BOLETERO', 'email' => 'boletero@cine.local']));
    $fakeJwt = "{$header}.{$payload}.fakesignature";

    $response = $this->withHeaders([
        'Authorization' => "Bearer {$fakeJwt}",
    ])->getJson('/api/scans/recent');

    $response->assertStatus(200);
});

test('redirige peticion web no autorizada en /boleteo hacia /login', function () {
    $response = $this->get('/boleteo');

    $response->assertRedirect(route('login'));
});

test('permite acceso a /boleteo con rol BOLETERO', function () {
    $response = $this->withHeaders([
        'X-User-Role' => 'BOLETERO',
    ])->get('/boleteo');

    $response->assertStatus(200)
        ->assertJsonFragment(['status' => 'ACTIVE']);
});
