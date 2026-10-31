<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pesan percakapan TOEFLy (AI).
 */
class AiMessage extends Model
{
    protected $table = 'ai_messages';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'sender',
        'message_text',
        'translation',
        'feedback',
    ];

    protected $casts = [
        'user_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
