<?php

use App\Models\AccessScan;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('persiste escaneo exitoso con atributos requeridos', function () {
    $scan = AccessScan::create([
        'ticket_id' => '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        'movie_title' => 'Avatar 2: El Sentido del Agua',
        'hall_name' => 'Sala IMAX 1',
        'seat_code' => 'C-8',
        'scanned_at' => now(),
        'result' => AccessScan::RESULT_SUCCESS,
        'validator_email' => 'boletero@cine.local',
    ]);

    expect($scan->exists)->toBeTrue();
    expect($scan->isSuccess())->toBeTrue();
    expect($scan->isRejected())->toBeFalse();
    expect($scan->movie_title)->toBe('Avatar 2: El Sentido del Agua');
});

test('persiste escaneo rechazado por firma inválida', function () {
    $scan = AccessScan::create([
        'ticket_id' => 'fake-ticket-uuid',
        'movie_title' => null,
        'hall_name' => null,
        'seat_code' => null,
        'scanned_at' => now(),
        'result' => AccessScan::RESULT_INVALID_SIGNATURE,
        'validator_email' => 'boletero@cine.local',
    ]);

    expect($scan->isSuccess())->toBeFalse();
    expect($scan->isRejected())->toBeTrue();
    expect($scan->result)->toBe(AccessScan::RESULT_INVALID_SIGNATURE);
});

test('scope recent limita a un maximo y ordena descendentemente', function () {
    for ($i = 1; $i <= 25; $i++) {
        AccessScan::create([
            'ticket_id' => "ticket-{$i}",
            'scanned_at' => now()->addSeconds($i),
            'result' => AccessScan::RESULT_SUCCESS,
            'validator_email' => 'boletero@cine.local',
        ]);
    }

    $recent = AccessScan::recent(20)->get();
    expect($recent->count())->toBe(20);
    expect($recent->first()->ticket_id)->toBe('ticket-25');
});
