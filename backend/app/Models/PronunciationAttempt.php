<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Hasil penilaian pelafalan (Pronunciation Lab).
 */
class PronunciationAttempt extends Model
{
    protected $table = 'pronunciation_attempts';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'level',
        'target_text',
        'transcript',
        'score',
        'clarity',
        'accuracy',
        'words',
        'feedback',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'score' => 'integer',
        'clarity' => 'integer',
        'accuracy' => 'integer',
        'words' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
