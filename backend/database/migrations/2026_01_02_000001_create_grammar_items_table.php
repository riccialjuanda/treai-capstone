<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bank soal Grammar Practice (pilihan ganda, benar/salah, susun kalimat).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('grammar_items')) {
            return;
        }

        Schema::create('grammar_items', function (Blueprint $table) {
            $table->increments('id');
            $table->enum('level', ['beginner', 'pre_intermediate', 'intermediate']);
            $table->enum('type', ['multiple_choice', 'true_false', 'sentence_arrange']);
            $table->string('focus', 80)->default('General Grammar');
            $table->text('prompt');
            $table->string('sentence', 255)->nullable();
            $table->json('options')->nullable();
            $table->string('answer', 255);
            $table->text('explanation')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['level', 'type'], 'idx_grammar_level_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grammar_items');
    }
};
