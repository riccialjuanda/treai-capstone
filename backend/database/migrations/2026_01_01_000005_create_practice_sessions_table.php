<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Riwayat sesi latihan TOEFL pengguna.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('practice_sessions')) {
            return;
        }

        Schema::create('practice_sessions', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->string('type', 100);
            $table->string('detail', 255)->default('');
            $table->string('score', 40)->default('');
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id', 'idx_session_user');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('practice_sessions');
    }
};
