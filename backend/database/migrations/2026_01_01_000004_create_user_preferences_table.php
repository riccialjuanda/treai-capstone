<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Preferensi belajar (suara, kecepatan bicara, terjemahan) per pengguna.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_preferences')) {
            return;
        }

        Schema::create('user_preferences', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->primary();
            $table->string('voice_name', 150)->default('');
            $table->decimal('speech_rate', 3, 2)->default(0.95);
            $table->boolean('auto_voice_reply')->default(true);
            $table->boolean('bilingual_mode')->default(true);

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
