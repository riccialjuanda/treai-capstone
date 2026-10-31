<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pemantauan progres belajar siswa (khusus administrator / instruktur).
 * Dipakai panel admin untuk melihat perkembangan tiap pelajar.
 */
class StudentController extends Controller
{
    use ApiResponse;

    /**
     * Daftar siswa beserta ringkasan aktivitas belajarnya.
     */
    public function index(Request $request): JsonResponse
    {
        $role = (string) $request->query('role', '');

        $query = User::query()->orderBy('name');
        if ($role !== '') {
            $query->where('role', $role);
        } else {
            $query->whereIn('role', ['user', 'teacher']);
        }

        $students = $query->get()->map(function (User $user): array {
            $userId = (int) $user->id;
            $progress = UserData::fetchProgress($userId);
            $lastHistory = UserData::fetchRecentHistory($userId, 1);

            return [
                'id' => $userId,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'joined' => UserData::publicUser($user)['joined'],
                'level' => $progress['level'],
                'levelLabel' => $progress['levelLabel'],
                'overallScore' => $progress['totals']['overallScore'],
                'practiceSessions' => $progress['totals']['practiceSessions'],
                'studyMinutes' => $progress['totals']['studyMinutes'],
                'learningStreak' => $progress['totals']['learningStreak'],
                'questionsAnswered' => $progress['totals']['questionsAnswered'],
                'recordingsScored' => $progress['totals']['recordingsScored'],
                'skills' => $progress['skills'],
                'lastPractice' => $lastHistory[0]['date'] ?? '-',
            ];
        })->all();

        return $this->ok(['students' => $students]);
    }

    /**
     * Rincian progres satu siswa (level, kemampuan, tren, dan riwayat latihan).
     */
    public function show(int $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return $this->fail('Siswa tidak ditemukan.', 404);
        }

        return $this->ok([
            'user' => UserData::publicUser($user),
            'progress' => UserData::fetchProgress($id),
        ]);
    }
}
