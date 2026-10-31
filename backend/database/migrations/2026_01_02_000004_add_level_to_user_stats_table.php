<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menambahkan kolom level belajar (Beginner / Pre-Intermediate / Intermediate).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_stats') || Schema::hasColumn('user_stats', 'level')) {
            return;
        }

        Schema::table('user_stats', function (Blueprint $table) {
            $table->string('level', 30)->default('beginner')->after('weekly_completed');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_stats') || ! Schema::hasColumn('user_stats', 'level')) {
            return;
        }

        Schema::table('user_stats', function (Blueprint $table) {
            $table->dropColumn('level');
        });
    }
};
