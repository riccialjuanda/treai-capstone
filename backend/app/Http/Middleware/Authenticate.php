<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Backend ini murni API (tanpa halaman login web), jadi permintaan yang
     * belum terautentikasi selalu dibiarkan memunculkan AuthenticationException
     * agar ditangani Handler menjadi respons 401 berformat JSON.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}
