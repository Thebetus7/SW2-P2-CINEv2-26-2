<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/boleteo');
});

Route::get('/login', function () {
    return response()->json([
        'message' => 'Portal de autenticación de boleteros.',
    ], 200);
})->name('login');

Route::middleware('role.boletero')->group(function () {
    Route::get('/boleteo', function () {
        return response()->json([
            'status' => 'ACTIVE',
            'view' => 'BoleteoScanner',
            'message' => 'Consola de Boleteo Operativa',
        ]);
    })->name('boleteo.scanner');
});
