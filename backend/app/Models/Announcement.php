<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pengumuman instruktur untuk siswa (muncul di notifikasi dashboard siswa).
 */
class Announcement extends Model
{
    protected $table = 'announcements';

    public $timestamps = false;

    protected $fillable = [
        'created_by',
        'title',
        'message',
        'audience',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
