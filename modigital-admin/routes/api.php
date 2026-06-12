<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ScanController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'backend' => 'laravel']));

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/scan', [ScanController::class, 'store']);
    Route::get('/scan/status', [ScanController::class, 'status']);
    Route::get('/activities/{activity}/feed', [ScanController::class, 'feed']);
});
