<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Statistik & target belajar per pengguna (satu baris per pengguna).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_stats')) {
            return;
        }

        Schema::create('user_stats', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->primary();
            $table->unsignedInteger('study_minutes')->default(0);
            $table->unsignedInteger('practice_sessions')->default(0);
            $table->unsignedInteger('learning_streak')->default(0);
            $table->unsignedInteger('toefl_goal')->default(90);
            $table->unsignedInteger('weekly_goal')->default(10);
            $table->unsignedInteger('weekly_completed')->default(0);

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_stats');
    }
};
