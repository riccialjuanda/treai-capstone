<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrammarAttempt;
use App\Models\PracticeSession;
use App\Models\PronunciationAttempt;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Statistik & progres belajar pengguna.
 */
class StatsController extends Controller
{
    use ApiResponse;

    public function show(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        return $this->ok([
            'stats' => UserData::fetchStats($userId),
            'recentHistory' => UserData::fetchRecentHistory($userId),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $current = UserData::fetchStats($userId);
        $merged = array_merge($current, array_intersect_key($request->all(), $current));

        return $this->ok([
            'stats' => UserData::saveStats($userId, $merged),
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        PracticeSession::where('user_id', $userId)->delete();
        GrammarAttempt::where('user_id', $userId)->delete();
        PronunciationAttempt::where('user_id', $userId)->delete();
        User::where('id', $userId)->update(['practice_count' => 0]);

        $fresh = UserData::saveStats($userId, [
            'studyMinutes' => 0,
            'practiceSessions' => 0,
            'learningStreak' => 0,
            'toeflGoal' => 90,
            'weeklyGoal' => 5,
            'weeklyCompleted' => 0,
        ]);

        return $this->ok([
            'stats' => $fresh,
            'recentHistory' => [],
        ]);
    }
}
