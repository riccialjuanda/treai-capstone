<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Statistik & target belajar pengguna.
 */
class UserStat extends Model
{
    protected $table = 'user_stats';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'study_minutes',
        'practice_sessions',
        'learning_streak',
        'toefl_goal',
        'weekly_goal',
        'weekly_completed',
        'level',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'study_minutes' => 'integer',
        'practice_sessions' => 'integer',
        'learning_streak' => 'integer',
        'toefl_goal' => 'integer',
        'weekly_goal' => 'integer',
        'weekly_completed' => 'integer',
        'level' => 'string',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
