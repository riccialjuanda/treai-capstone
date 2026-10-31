<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Catatan jawaban siswa per soal grammar.
 */
class GrammarAttempt extends Model
{
    protected $table = 'grammar_attempts';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'item_id',
        'level',
        'type',
        'user_answer',
        'is_correct',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'item_id' => 'integer',
        'is_correct' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(GrammarItem::class, 'item_id');
    }
}
