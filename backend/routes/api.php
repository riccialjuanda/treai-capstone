<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\GrammarController;
use App\Http\Controllers\Api\PreferenceController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\PronunciationController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rute API SpeakTOEFL AI
|--------------------------------------------------------------------------
|
| Bentuk respons dipertahankan seperti backend lama:
|   sukses -> {success:true, data:...}   gagal -> {success:false, error:...}
|
*/

// Info layanan — dipakai frontend untuk memastikan backend dapat dijangkau.
Route::get('/', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'service' => 'SpeakTOEFL AI API',
            'version' => '1.0.0',
            'time' => now()->toIso8601String(),
            'routes' => ['auth', 'users', 'students', 'content', 'announcements', 'stats', 'sessions', 'preferences', 'ai', 'grammar', 'pronunciation', 'progress'],
        ],
    ]);
});

// Autentikasi (tanpa token).
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);

// Lupa kata sandi — dibatasi agar tidak bisa dipakai spam permintaan kode.
Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:10,1');
Route::post('auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

// Status AI bersifat publik agar frontend bisa menyembunyikan fitur bila belum dikonfigurasi.
Route::get('ai/status', [AiController::class, 'status']);

// Endpoint yang memerlukan login.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // Profil pengguna: ubah nama/email dan ganti kata sandi.
    Route::put('auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('auth/password', [AuthController::class, 'updatePassword']);

    Route::get('stats', [StatsController::class, 'show']);
    Route::match(['put', 'post'], 'stats', [StatsController::class, 'update']);
    Route::post('stats/reset', [StatsController::class, 'reset']);

    Route::get('sessions', [SessionController::class, 'index']);
    Route::post('sessions', [SessionController::class, 'store']);

    Route::get('preferences', [PreferenceController::class, 'show']);
    Route::match(['put', 'post'], 'preferences', [PreferenceController::class, 'update']);

    Route::get('content', [ContentController::class, 'index']);

    // Pengumuman instruktur — dibaca semua pengguna yang login.
    Route::get('announcements', [AnnouncementController::class, 'index']);

    Route::post('ai/chat', [AiController::class, 'chat']);

    // Grammar Practice
    Route::get('grammar/items', [GrammarController::class, 'index']);
    Route::post('grammar/submit', [GrammarController::class, 'submit']);
    Route::get('grammar/summary', [GrammarController::class, 'summary']);

    // Pronunciation Lab
    Route::get('pronunciation/targets', [PronunciationController::class, 'targets']);
    Route::post('pronunciation/evaluate', [PronunciationController::class, 'evaluate']);
    Route::get('pronunciation/history', [PronunciationController::class, 'history']);

    // Learning History, Progress & Levels
    Route::get('progress', [ProgressController::class, 'show']);
    Route::get('levels', [ProgressController::class, 'levels']);
    Route::put('level', [ProgressController::class, 'setLevel']);

    // Khusus administrator.
    Route::middleware('admin')->group(function () {
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::match(['put', 'patch'], 'users', [UserController::class, 'update']);
        Route::delete('users', [UserController::class, 'destroy']);

        // Pemantauan progres belajar siswa.
        Route::get('students', [StudentController::class, 'index']);
        Route::get('students/{id}', [StudentController::class, 'show'])->whereNumber('id');

        Route::post('content', [ContentController::class, 'store']);
        Route::delete('content', [ContentController::class, 'destroy']);

        // Pengumuman instruktur ke siswa.
        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::delete('announcements', [AnnouncementController::class, 'destroy']);
    });
});
