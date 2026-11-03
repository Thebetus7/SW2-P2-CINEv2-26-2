<?php

use App\Services\TicketAuthClient;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;

test('procesa respuesta 200 exitosa de Ticket-Auth transicionando a USED', function () {
    $mock = new MockHandler([
        new Response(200, ['Content-Type' => 'application/json'], json_encode([
            'valid' => true,
            'status' => 'USED',
            'movieTitle' => 'Avatar 2: El Sentido del Agua',
            'hallName' => 'Sala IMAX 1',
            'seatLabel' => 'C-8',
        ])),
    ]);

    $handlerStack = HandlerStack::create($mock);
    $client = new Client(['handler' => $handlerStack]);

    $ticketAuthClient = new TicketAuthClient($client, 'http://localhost:8081');
    $result = $ticketAuthClient->useTicket(
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        'b5a932c0f21448d3885d56b00684f09d846b4f74d022b7a9768fb7d206f40b3c',
        '2026-11-03T18:30:00Z',
        'jwt-token-boletero'
    );

    expect($result['success'])->toBeTrue();
    expect($result['status'])->toBe('USED');
    expect($result['movieTitle'])->toBe('Avatar 2: El Sentido del Agua');
    expect($result['hallName'])->toBe('Sala IMAX 1');
    expect($result['seatLabel'])->toBe('C-8');
    expect($result['statusCode'])->toBe(200);
});

test('maneja respuesta 409 Conflict cuando el ticket ya fue utilizado', function () {
    $mock = new MockHandler([
        new Response(409, ['Content-Type' => 'application/json'], json_encode([
            'valid' => false,
            'errorCode' => 'TICKET_ALREADY_USED',
            'message' => 'El boleto ya fue utilizado con anterioridad.',
        ])),
    ]);

    $handlerStack = HandlerStack::create($mock);
    $client = new Client(['handler' => $handlerStack]);

    $ticketAuthClient = new TicketAuthClient($client, 'http://localhost:8081');
    $result = $ticketAuthClient->useTicket(
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        'signature-valida'
    );

    expect($result['success'])->toBeFalse();
    expect($result['status'])->toBe('ALREADY_USED');
    expect($result['errorCode'])->toBe('TICKET_ALREADY_USED');
    expect($result['statusCode'])->toBe(409);
});

test('maneja excepcion de conexion sin romper el flujo operativo', function () {
    $mock = new MockHandler([
        new RequestException('Connection refused', new Request('POST', 'test')),
    ]);

    $handlerStack = HandlerStack::create($mock);
    $client = new Client(['handler' => $handlerStack]);

    $ticketAuthClient = new TicketAuthClient($client, 'http://localhost:8081');
    $result = $ticketAuthClient->useTicket('ticket-uuid', 'signature');

    expect($result['success'])->toBeFalse();
    expect($result['errorCode'])->toBe('CONNECTION_FAILED');
    expect($result['statusCode'])->toBe(503);
});
