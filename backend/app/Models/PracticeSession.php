<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Riwayat sesi latihan pengguna.
 */
class PracticeSession extends Model
{
    protected $table = 'practice_sessions';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'type',
        'detail',
        'score',
        'duration_seconds',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'duration_seconds' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
