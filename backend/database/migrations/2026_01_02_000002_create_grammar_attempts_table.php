<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jawaban siswa pada setiap soal grammar (untuk analisis progres).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('grammar_attempts')) {
            return;
        }

        Schema::create('grammar_attempts', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('item_id');
            $table->string('level', 30);
            $table->string('type', 30);
            $table->string('user_answer', 255)->default('');
            $table->boolean('is_correct')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('item_id')->references('id')->on('grammar_items')->onDelete('cascade');
            $table->index(['user_id', 'created_at'], 'idx_attempts_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grammar_attempts');
    }
};
