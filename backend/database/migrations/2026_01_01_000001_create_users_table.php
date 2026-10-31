<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel pengguna SpeakTOEFL AI.
 *
 * Catatan: database `treai_capstone` legacy sudah berisi data nyata, jadi
 * migrasi ini dilewati bila tabelnya sudah ada (tidak menimpa data).
 *
 * Kolom sandi bernama `password_hash` agar cocok dengan skema lama; model
 * User memetakannya lewat getAuthPassword().
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            return;
        }

        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 120);
            $table->string('email', 190)->unique('uq_users_email');
            $table->string('password_hash', 255);
            $table->enum('role', ['user', 'admin', 'teacher'])->default('user');
            $table->enum('status', ['Aktif', 'Menunggu', 'Ditangguhkan'])->default('Aktif');
            $table->unsignedInteger('practice_count')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
