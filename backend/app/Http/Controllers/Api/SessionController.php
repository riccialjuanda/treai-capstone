<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PracticeSession;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Riwayat sesi latihan pengguna.
 */
class SessionController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        return $this->ok(UserData::fetchRecentHistory((int) $request->user()->id, 20));
    }

    public function store(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $type = trim((string) $request->input('type', '')) ?: 'Latihan';
        $detail = trim((string) $request->input('detail', ''));
        $score = trim((string) $request->input('score', ''));
        $duration = max(0, (int) $request->input('durationSeconds', 0));

        $session = PracticeSession::create([
            'user_id' => $userId,
            'type' => $type,
            'detail' => $detail,
            'score' => $score,
            'duration_seconds' => $duration,
        ]);

        // Perbarui statistik agregat + jumlah sesi pada profil pengguna.
        $stats = UserData::fetchStats($userId);
        $stats['practiceSessions'] = $stats['practiceSessions'] + 1;
        $stats['studyMinutes'] = $stats['studyMinutes'] + 5;
        $stats['weeklyCompleted'] = min($stats['weeklyGoal'], $stats['weeklyCompleted'] + 1);
        $stats = UserData::saveStats($userId, $stats);

        User::where('id', $userId)->increment('practice_count');

        return $this->ok([
            'session' => [
                'id' => 'h_' . $session->id,
                'date' => 'Baru saja',
                'type' => $type,
                'detail' => $detail,
                'score' => $score,
            ],
            'stats' => $stats,
        ], [], 201);
    }
}
