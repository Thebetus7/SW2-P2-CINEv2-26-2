<?php

use App\Http\Controllers\BoleteoController;
use Illuminate\Support\Facades\Route;

Route::middleware('role.boletero')->group(function () {
    Route::post('/validate-ticket', [BoleteoController::class, 'validateTicket']);
    Route::get('/scans/recent', [BoleteoController::class, 'recentScans']);
});
