<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Preferensi belajar pengguna.
 */
class UserPreference extends Model
{
    protected $table = 'user_preferences';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'voice_name',
        'speech_rate',
        'auto_voice_reply',
        'bilingual_mode',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'speech_rate' => 'float',
        'auto_voice_reply' => 'boolean',
        'bilingual_mode' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
