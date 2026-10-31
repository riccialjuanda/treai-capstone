<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Riwayat percakapan TOEFLy (AI) per pengguna.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_messages')) {
            return;
        }

        Schema::create('ai_messages', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id');
            $table->enum('sender', ['user', 'toefly']);
            $table->text('message_text');
            $table->text('translation')->nullable();
            $table->text('feedback')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id', 'idx_message_user');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_messages');
    }
};
