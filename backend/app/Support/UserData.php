<?php

namespace App\Support;

use App\Models\GrammarAttempt;
use App\Models\GrammarItem;
use App\Models\PracticeSession;
use App\Models\PronunciationAttempt;
use App\Models\User;
use App\Models\UserPreference;
use App\Models\UserStat;

/**
 * Helper data pengguna: statistik, preferensi, riwayat, dan representasi
 * publik pengguna. Bentuk keluaran dipertahankan sama dengan backend lama.
 */
class UserData
{
    /** Level belajar yang tersedia beserta keterangannya. */
    public const LEVELS = [
        'beginner' => [
            'label' => 'Beginner',
            'cefr' => 'A1 - A2',
            'description' => 'Kalimat dasar, waktu sederhana, dan kosakata sehari-hari.',
        ],
        'pre_intermediate' => [
            'label' => 'Pre-Intermediate',
            'cefr' => 'B1',
            'description' => 'Percakapan sehari-hari, past tense, dan kalimat majemuk sederhana.',
        ],
        'intermediate' => [
            'label' => 'Intermediate',
            'cefr' => 'B2 - C1',
            'description' => 'Struktur lanjutan, inversi, subjunctive, dan ungkapan formal.',
        ],
    ];

    /**
     * Pastikan baris statistik & preferensi sudah ada untuk pengguna ini.
     */
    public static function ensureRows(int $userId): void
    {
        UserStat::firstOrCreate(['user_id' => $userId]);
        UserPreference::firstOrCreate(['user_id' => $userId]);
    }

    public static function roleLabel(string $role): string
    {
        return match ($role) {
            'admin' => 'Administrator',
            'teacher' => 'Instruktur / Teacher',
            default => 'Pelajar / Student',
        };
    }

    /**
     * Daftar level belajar untuk ditampilkan di frontend.
     *
     * @return array<int, array<string, string>>
     */
    public static function levelList(): array
    {
        $list = [];

        foreach (self::LEVELS as $id => $meta) {
            $list[] = [
                'id' => $id,
                'label' => $meta['label'],
                'cefr' => $meta['cefr'],
                'description' => $meta['description'],
            ];
        }

        return $list;
    }

    public static function normalizeLevel(mixed $value): string
    {
        $level = (string) $value;

        return array_key_exists($level, self::LEVELS) ? $level : 'beginner';
    }

    public static function levelLabel(string $level): string
    {
        return self::LEVELS[$level]['label'] ?? self::LEVELS['beginner']['label'];
    }

    /**
     * Mengubah nilai yang tersimpan (mis. "88/100", "8/10", "88") menjadi angka 0-100.
     */
    public static function scoreToInt(mixed $score): int
    {
        if (is_numeric($score)) {
            return max(0, min(100, (int) round((float) $score)));
        }

        $text = (string) $score;
        if (! preg_match('/(\d+(?:\.\d+)?)/', $text, $match)) {
            return 0;
        }

        $value = (float) $match[1];
        if (preg_match('#/\s*(\d+(?:\.\d+)?)#', $text, $denominator) && (float) $denominator[1] > 0 && (float) $denominator[1] <= 10) {
            $value = $value / (float) $denominator[1] * 100;
        }

        return max(0, min(100, (int) round($value)));
    }

    public static function publicUser(User $user): array
    {
        return [
            'id' => (int) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'roleLabel' => self::roleLabel((string) $user->role),
            'status' => $user->status,
            'practiceCount' => (int) $user->practice_count,
            'joined' => self::formatDate($user->created_at),
        ];
    }

    public static function fetchStats(int $userId): array
    {
        self::ensureRows($userId);

        $row = UserStat::where('user_id', $userId)->first();

        return [
            'studyMinutes' => (int) ($row->study_minutes ?? 0),
            'practiceSessions' => (int) ($row->practice_sessions ?? 0),
            'learningStreak' => (int) ($row->learning_streak ?? 0),
            'toeflGoal' => (int) ($row->toefl_goal ?? 90),
            'weeklyGoal' => (int) ($row->weekly_goal ?? 10),
            'weeklyCompleted' => (int) ($row->weekly_completed ?? 0),
            'level' => self::normalizeLevel($row->level ?? 'beginner'),
        ];
    }

    public static function saveStats(int $userId, array $stats): array
    {
        self::ensureRows($userId);

        $current = self::fetchStats($userId);

        UserStat::where('user_id', $userId)->update([
            'study_minutes' => max(0, (int) ($stats['studyMinutes'] ?? $current['studyMinutes'])),
            'practice_sessions' => max(0, (int) ($stats['practiceSessions'] ?? $current['practiceSessions'])),
            'learning_streak' => max(0, (int) ($stats['learningStreak'] ?? $current['learningStreak'])),
            'toefl_goal' => min(120, max(0, (int) ($stats['toeflGoal'] ?? $current['toeflGoal']))),
            'weekly_goal' => max(1, (int) ($stats['weeklyGoal'] ?? $current['weeklyGoal'])),
            'weekly_completed' => max(0, (int) ($stats['weeklyCompleted'] ?? $current['weeklyCompleted'])),
            'level' => self::normalizeLevel($stats['level'] ?? $current['level']),
        ]);

        return self::fetchStats($userId);
    }

    public static function fetchPreferences(int $userId): array
    {
        self::ensureRows($userId);

        $row = UserPreference::where('user_id', $userId)->first();

        return [
            'voiceName' => (string) ($row->voice_name ?? ''),
            'speechRate' => (float) ($row->speech_rate ?? 0.95),
            'autoVoiceReply' => (bool) ($row->auto_voice_reply ?? true),
            'bilingualMode' => (bool) ($row->bilingual_mode ?? true),
        ];
    }

    public static function savePreferences(int $userId, array $prefs): array
    {
        $current = self::fetchPreferences($userId);

        $next = [
            'voiceName' => array_key_exists('voiceName', $prefs) ? (string) $prefs['voiceName'] : $current['voiceName'],
            'speechRate' => array_key_exists('speechRate', $prefs) ? (float) $prefs['speechRate'] : $current['speechRate'],
            'autoVoiceReply' => array_key_exists('autoVoiceReply', $prefs) ? (bool) $prefs['autoVoiceReply'] : $current['autoVoiceReply'],
            'bilingualMode' => array_key_exists('bilingualMode', $prefs) ? (bool) $prefs['bilingualMode'] : $current['bilingualMode'],
        ];

        UserPreference::where('user_id', $userId)->update([
            'voice_name' => $next['voiceName'],
            'speech_rate' => $next['speechRate'],
            'auto_voice_reply' => $next['autoVoiceReply'] ? 1 : 0,
            'bilingual_mode' => $next['bilingualMode'] ? 1 : 0,
        ]);

        return $next;
    }

    public static function fetchRecentHistory(int $userId, int $limit = 10): array
    {
        $limit = max(1, min(50, $limit));

        return PracticeSession::where('user_id', $userId)
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(static fn (PracticeSession $row): array => [
                'id' => 'h_' . $row->id,
                'date' => self::formatDate($row->created_at),
                'type' => $row->type,
                'detail' => $row->detail,
                'score' => $row->score,
            ])
            ->all();
    }

    /**
     * Ringkasan perkembangan belajar: level, kemampuan per keterampilan,
     * tren nilai harian, dan area yang perlu diperkuat.
     *
     * @return array<string, mixed>
     */
    public static function fetchProgress(int $userId, int $days = 14): array
    {
        self::ensureRows($userId);

        $days = max(3, min(60, $days));
        $stats = self::fetchStats($userId);

        // --- Jawaban grammar ---
        $grammarRows = GrammarAttempt::where('user_id', $userId)->get(['level', 'type', 'is_correct']);
        $grammarTotal = $grammarRows->count();
        $grammarCorrect = $grammarRows->where('is_correct', true)->count();

        // --- Level belajar ---
        $levels = [];
        foreach (self::LEVELS as $id => $meta) {
            $owned = $grammarRows->where('level', $id);
            $total = $owned->count();
            $correct = $owned->where('is_correct', true)->count();

            $levels[] = [
                'id' => $id,
                'label' => $meta['label'],
                'cefr' => $meta['cefr'],
                'description' => $meta['description'],
                'active' => $id === $stats['level'],
                'bankSize' => GrammarItem::where('level', $id)->count(),
                'attempts' => $total,
                'accuracy' => $total > 0 ? (int) round($correct / $total * 100) : 0,
            ];
        }

        // --- Area yang perlu diperkuat (akurasi terendah) ---
        $focusAreas = GrammarAttempt::query()
            ->join('grammar_items', 'grammar_items.id', '=', 'grammar_attempts.item_id')
            ->where('grammar_attempts.user_id', $userId)
            ->selectRaw('grammar_items.focus as focus, COUNT(*) as total, SUM(grammar_attempts.is_correct) as correct')
            ->groupBy('grammar_items.focus')
            ->get()
            ->map(static function ($row): array {
                $total = (int) $row->total;
                $correct = (int) $row->correct;

                return [
                    'focus' => (string) $row->focus,
                    'total' => $total,
                    'correct' => $correct,
                    'accuracy' => $total > 0 ? (int) round($correct / $total * 100) : 0,
                ];
            })
            ->sortBy('accuracy')
            ->take(4)
            ->values()
            ->all();

        // --- Keterampilan per jenis latihan ---
        $speakingRows = PracticeSession::where('user_id', $userId)
            ->where('type', 'like', '%Speaking%')
            ->get(['score']);

        $speakingScores = $speakingRows
            ->map(static fn (PracticeSession $row): int => self::scoreToInt($row->score))
            ->filter(static fn (int $value): bool => $value > 0)
            ->values();

        $pronunciation = PronunciationAttempt::where('user_id', $userId)
            ->selectRaw('COUNT(*) as total, AVG(score) as average, MAX(score) as best')
            ->first();

        $pronunciationTotal = (int) ($pronunciation->total ?? 0);

        $skills = [
            [
                'id' => 'speaking',
                'label' => 'Speaking',
                'english' => 'Speaking Fluency',
                'sessions' => $speakingRows->count(),
                'averageScore' => $speakingScores->isNotEmpty() ? (int) round((float) $speakingScores->avg()) : 0,
            ],
            [
                'id' => 'grammar',
                'label' => 'Grammar',
                'english' => 'Grammar Accuracy',
                'sessions' => $grammarTotal,
                'averageScore' => $grammarTotal > 0 ? (int) round($grammarCorrect / $grammarTotal * 100) : 0,
            ],
            [
                'id' => 'pronunciation',
                'label' => 'Pronunciation',
                'english' => 'Pronunciation Clarity',
                'sessions' => $pronunciationTotal,
                'averageScore' => $pronunciationTotal > 0 ? (int) round((float) ($pronunciation->average ?? 0)) : 0,
            ],
        ];

        // --- Tren nilai harian (dari sesi latihan) ---
        $since = now()->subDays($days - 1)->startOfDay();

        $buckets = [];
        foreach (PracticeSession::where('user_id', $userId)->where('created_at', '>=', $since)->get(['score', 'created_at']) as $row) {
            $key = date('Y-m-d', strtotime((string) $row->created_at));
            $buckets[$key][] = self::scoreToInt($row->score);
        }

        $trend = [];
        for ($offset = $days - 1; $offset >= 0; $offset--) {
            $day = now()->subDays($offset)->startOfDay();
            $key = $day->format('Y-m-d');
            $scores = array_values(array_filter($buckets[$key] ?? [], static fn (int $value): bool => $value > 0));

            $trend[] = [
                'date' => $key,
                'label' => $day->format('d M'),
                'sessions' => count($buckets[$key] ?? []),
                'score' => $scores !== [] ? (int) round(array_sum($scores) / count($scores)) : 0,
            ];
        }

        $scored = array_values(array_filter(
            array_column($skills, 'averageScore'),
            static fn (int $value): bool => $value > 0
        ));

        return [
            'levels' => $levels,
            'level' => $stats['level'],
            'levelLabel' => self::levelLabel($stats['level']),
            'skills' => $skills,
            'focusAreas' => $focusAreas,
            'trend' => $trend,
            'trendDays' => $days,
            'recentHistory' => self::fetchRecentHistory($userId, 20),
            'totals' => [
                'practiceSessions' => $stats['practiceSessions'],
                'studyMinutes' => $stats['studyMinutes'],
                'learningStreak' => $stats['learningStreak'],
                'weeklyGoal' => $stats['weeklyGoal'],
                'weeklyCompleted' => $stats['weeklyCompleted'],
                'questionsAnswered' => $grammarTotal,
                'recordingsScored' => $pronunciationTotal,
                'overallScore' => $scored !== [] ? (int) round(array_sum($scored) / count($scored)) : 0,
            ],
        ];
    }

    private static function formatDate(mixed $value): string
    {
        if ($value === null || $value === '') {
            return date('d M Y');
        }

        $timestamp = strtotime((string) $value);

        return $timestamp ? date('d M Y', $timestamp) : date('d M Y');
    }
}
