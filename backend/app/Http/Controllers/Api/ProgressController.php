<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Learning History & Progress: ringkasan perkembangan belajar siswa
 * dan pemilihan level (Beginner / Pre-Intermediate / Intermediate).
 */
class ProgressController extends Controller
{
    use ApiResponse;

    public function show(Request $request): JsonResponse
    {
        return $this->ok(UserData::fetchProgress((int) $request->user()->id));
    }

    public function setLevel(Request $request): JsonResponse
    {
        $requested = (string) $request->input('level', '');

        if (! array_key_exists($requested, UserData::LEVELS)) {
            return $this->fail(
                'Level tidak dikenali. Pilih Beginner, Pre-Intermediate, atau Intermediate.',
                422
            );
        }

        $stats = UserData::saveStats((int) $request->user()->id, ['level' => $requested]);

        return $this->ok([
            'level' => $stats['level'],
            'levelLabel' => UserData::levelLabel($stats['level']),
            'levels' => UserData::levelList(),
            'stats' => $stats,
        ]);
    }

    /**
     * Daftar level belajar (dapat diakses sebelum memilih level).
     */
    public function levels(): JsonResponse
    {
        return $this->ok(['levels' => UserData::levelList()]);
    }
}
