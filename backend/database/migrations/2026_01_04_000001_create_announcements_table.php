<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pengumuman dari instruktur/admin yang tampil di dashboard siswa.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('announcements')) {
            return;
        }

        Schema::create('announcements', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('created_by')->nullable();
            $table->string('title', 200);
            $table->text('message');
            $table->enum('audience', ['all', 'user', 'teacher'])->default('all');
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at', 'idx_announcement_created');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
