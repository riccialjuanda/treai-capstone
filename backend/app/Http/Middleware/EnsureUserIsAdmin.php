<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Membatasi akses hanya untuk pengguna dengan peran administrator.
 * Dipasang setelah middleware auth, jadi pengguna dijamin sudah terautentikasi.
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'error' => 'Akses ditolak. Hanya administrator yang diizinkan.',
            ], 403);
        }

        return $next($request);
    }
}
