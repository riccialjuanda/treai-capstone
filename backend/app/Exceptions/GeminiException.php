<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Galat terklasifikasi dari layanan Gemini, dipakai untuk menyusun pesan
 * ramah ke pengguna dan kode galat pada respons API.
 */
class GeminiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $reason = 'AI_ERROR',
        public readonly int $status = 502,
        public readonly int $retryAfter = 0
    ) {
        parent::__construct($message);
    }
}
