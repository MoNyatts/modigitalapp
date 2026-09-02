<?php

use App\Http\Controllers\Web\ActivityController;
use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\CommunicationController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\EventController;
use App\Http\Controllers\Web\QrCodeController;
use App\Http\Controllers\Web\ReportController;
use App\Http\Controllers\Web\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn() => view('welcome'))->name('home');

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/admissions', [DashboardController::class, 'admissions'])->name('admissions.index');
    Route::get('/upcoming-events', [DashboardController::class, 'upcomingEvents'])->name('upcoming-events.index');

    Route::resource('events', EventController::class);
    Route::post('events/{event}/staff', [EventController::class, 'assignStaff'])->name('events.staff');

    Route::post('events/{event}/activities', [ActivityController::class, 'store'])->name('activities.store');
    Route::put('events/{event}/activities/{activity}', [ActivityController::class, 'update'])->name('activities.update');
    Route::post('events/{event}/activities/{activity}/duplicate', [ActivityController::class, 'duplicate'])->name('activities.duplicate');
    Route::delete('events/{event}/activities/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');

    Route::get('events/{event}/qrcodes', [QrCodeController::class, 'index'])->name('qrcodes.index');
    Route::post('events/{event}/qrcodes/upload', [QrCodeController::class, 'upload'])->name('qrcodes.upload');
    Route::get('events/{event}/qrcodes/download', [QrCodeController::class, 'downloadZip'])->name('qrcodes.download');
    Route::post('events/{event}/qrcodes/bulk', [QrCodeController::class, 'bulk'])->name('qrcodes.bulk');
    Route::get('events/{event}/qrcodes/{qrCode}/download', [QrCodeController::class, 'download'])->name('qrcodes.download-one');
    Route::get('qrcodes/template', [QrCodeController::class, 'template'])->name('qrcodes.template');
    Route::patch('events/{event}/qrcodes/{qrCode}/invalidate', [QrCodeController::class, 'invalidate'])->name('qrcodes.invalidate');

    Route::resource('users', UserController::class)->except(['show']);

    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/{event}', [ReportController::class, 'show'])->name('reports.show');
    Route::get('reports/{event}/export', [ReportController::class, 'export'])->name('reports.export');

    Route::get('communication/contacts', [CommunicationController::class, 'contacts'])->name('communication.contacts');
    Route::post('communication/contacts/import', [CommunicationController::class, 'importContacts'])->name('communication.contacts.import');
    Route::get('communication/contacts/template', [CommunicationController::class, 'contactTemplate'])->name('communication.contacts.template');
    Route::delete('communication/contacts/all', [CommunicationController::class, 'deleteAllContacts'])->name('communication.contacts.deleteAll');
    Route::delete('communication/contacts/{contact}', [CommunicationController::class, 'deleteContact'])->name('communication.contacts.delete');

    Route::get('communication/messages', [CommunicationController::class, 'messages'])->name('communication.messages');
    Route::post('communication/messages', [CommunicationController::class, 'compose'])->name('communication.compose');
    Route::get('communication/messages/{message}', [CommunicationController::class, 'messageDetail'])->name('communication.messages.show');
    Route::get('communication/balance', [CommunicationController::class, 'balance'])->name('communication.balance');
});
