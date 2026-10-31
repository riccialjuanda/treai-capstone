<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hasil penilaian pelafalan (Pronunciation Lab) per percobaan rekaman.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pronunciation_attempts')) {
            return;
        }

        Schema::create('pronunciation_attempts', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->string('level', 30)->default('beginner');
            $table->string('target_text', 255);
            $table->text('transcript')->nullable();
            $table->unsignedTinyInteger('score')->default(0);
            $table->unsignedTinyInteger('clarity')->default(0);
            $table->unsignedTinyInteger('accuracy')->default(0);
            $table->json('words')->nullable();
            $table->text('feedback')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'created_at'], 'idx_pronunciation_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pronunciation_attempts');
    }
};
