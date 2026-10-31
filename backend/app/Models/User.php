<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Pengguna aplikasi SpeakTOEFL AI.
 */
class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    /**
     * Tabel hanya memiliki kolom created_at (diisi default MySQL),
     * jadi Eloquent tidak mengelola timestamp secara otomatis.
     */
    public $timestamps = false;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password_hash',
        'role',
        'status',
        'practice_count',
    ];

    /**
     * @var array<int, string>
     */
    protected $hidden = [
        'password_hash',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'practice_count' => 'integer',
    ];

    /**
     * Laravel memakai kolom `password_hash`, bukan `password`.
     */
    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }

    public function stats(): HasOne
    {
        return $this->hasOne(UserStat::class, 'user_id');
    }

    public function preferences(): HasOne
    {
        return $this->hasOne(UserPreference::class, 'user_id');
    }

    public function practiceSessions(): HasMany
    {
        return $this->hasMany(PracticeSession::class, 'user_id');
    }

    public function aiMessages(): HasMany
    {
        return $this->hasMany(AiMessage::class, 'user_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
