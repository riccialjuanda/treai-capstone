<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Kode reset kata sandi yang dikirim ke email pengguna.
 */
class PasswordResetCode extends Model
{
    protected $table = 'password_reset_codes';

    protected $primaryKey = 'email';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'email',
        'code_hash',
        'attempts',
        'expires_at',
        'created_at',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];
}
