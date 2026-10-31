<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom "prompt" pada bank materi: isi soal/kalimat yang benar-benar
 * dilatih siswa saat membuka materi dari instruktur.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('content_items') || Schema::hasColumn('content_items', 'prompt')) {
            return;
        }

        Schema::table('content_items', function (Blueprint $table) {
            $table->text('prompt')->nullable()->after('category');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('content_items') || ! Schema::hasColumn('content_items', 'prompt')) {
            return;
        }

        Schema::table('content_items', function (Blueprint $table) {
            $table->dropColumn('prompt');
        });
    }
};
