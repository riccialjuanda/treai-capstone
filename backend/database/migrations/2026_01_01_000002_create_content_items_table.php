<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bank materi / soal TOEFL. Dilewati bila tabel sudah ada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('content_items')) {
            return;
        }

        Schema::create('content_items', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title', 200);
            $table->enum('section', ['Speaking', 'Reading', 'Listening', 'Writing']);
            $table->string('category', 120);
            $table->enum('difficulty', ['Beginner', 'Intermediate', 'Advanced'])->default('Intermediate');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_items');
    }
};
