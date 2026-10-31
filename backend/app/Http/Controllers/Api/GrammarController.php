<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrammarAttempt;
use App\Models\GrammarItem;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Grammar Practice: bank soal, koreksi otomatis, dan rekap hasil.
 */
class GrammarController extends Controller
{
    use ApiResponse;

    private const TYPES = ['multiple_choice', 'true_false', 'sentence_arrange'];

    /**
     * Mengambil satu set soal sesuai level & tipe yang dipilih siswa.
     */
    public function index(Request $request): JsonResponse
    {
        $level = UserData::normalizeLevel($request->query('level', ''));
        $type = (string) $request->query('type', '');
        $limit = max(1, min(20, (int) $request->query('limit', 10)));

        $query = GrammarItem::where('level', $level);
        if (in_array($type, self::TYPES, true)) {
            $query->where('type', $type);
        }

        $items = $query->inRandomOrder()
            ->limit($limit)
            ->get()
            ->map(fn (GrammarItem $item): array => $this->present($item))
            ->all();

        return $this->ok([
            'level' => $level,
            'levelLabel' => UserData::levelLabel($level),
            'type' => in_array($type, self::TYPES, true) ? $type : 'mixed',
            'bankSize' => GrammarItem::where('level', $level)->count(),
            'items' => $items,
        ]);
    }

    /**
     * Memeriksa satu jawaban, menyimpan hasilnya, dan mengembalikan pembahasan.
     */
    public function submit(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $itemId = (int) $request->input('itemId', 0);
        $answer = trim((string) $request->input('answer', ''));

        if ($itemId <= 0) {
            return $this->fail('Soal tidak dikenali.', 422);
        }
        if ($answer === '') {
            return $this->fail('Jawaban belum diisi.', 422);
        }

        $item = GrammarItem::find($itemId);
        if (! $item) {
            return $this->fail('Soal tidak ditemukan.', 404);
        }

        $expected = (string) $item->answer;
        $isCorrect = $this->normalize($answer) === $this->normalize($expected);

        GrammarAttempt::create([
            'user_id' => $userId,
            'item_id' => (int) $item->id,
            'level' => (string) $item->level,
            'type' => (string) $item->type,
            'user_answer' => mb_substr($answer, 0, 255),
            'is_correct' => $isCorrect,
        ]);

        $total = GrammarAttempt::where('user_id', $userId)->count();
        $correct = GrammarAttempt::where('user_id', $userId)->where('is_correct', true)->count();

        return $this->ok([
            'correct' => $isCorrect,
            'correctAnswer' => $expected,
            'explanation' => (string) ($item->explanation ?? ''),
            'focus' => (string) $item->focus,
            'summary' => [
                'answered' => $total,
                'correct' => $correct,
                'accuracy' => $total > 0 ? (int) round($correct / $total * 100) : 0,
            ],
        ]);
    }

    /**
     * Rekap hasil latihan grammar siswa (untuk Learning History).
     */
    public function summary(Request $request): JsonResponse
    {
        $rows = GrammarAttempt::where('user_id', (int) $request->user()->id)
            ->get(['level', 'type', 'is_correct']);

        $total = $rows->count();
        $correct = $rows->where('is_correct', true)->count();

        $byLevel = [];
        foreach (UserData::levelList() as $level) {
            $owned = $rows->where('level', $level['id']);
            $levelTotal = $owned->count();
            $levelCorrect = $owned->where('is_correct', true)->count();

            $byLevel[] = [
                'id' => $level['id'],
                'label' => $level['label'],
                'attempts' => $levelTotal,
                'correct' => $levelCorrect,
                'accuracy' => $levelTotal > 0 ? (int) round($levelCorrect / $levelTotal * 100) : 0,
            ];
        }

        $byType = [];
        foreach (self::TYPES as $type) {
            $owned = $rows->where('type', $type);
            $typeTotal = $owned->count();
            $typeCorrect = $owned->where('is_correct', true)->count();

            $byType[] = [
                'id' => $type,
                'attempts' => $typeTotal,
                'correct' => $typeCorrect,
                'accuracy' => $typeTotal > 0 ? (int) round($typeCorrect / $typeTotal * 100) : 0,
            ];
        }

        return $this->ok([
            'totals' => [
                'attempts' => $total,
                'correct' => $correct,
                'accuracy' => $total > 0 ? (int) round($correct / $total * 100) : 0,
            ],
            'byLevel' => $byLevel,
            'byType' => $byType,
        ]);
    }

    /**
     * Bentuk soal yang dikirim ke frontend — tanpa kunci jawaban.
     *
     * @return array<string, mixed>
     */
    private function present(GrammarItem $item): array
    {
        $payload = [
            'id' => (int) $item->id,
            'level' => (string) $item->level,
            'type' => (string) $item->type,
            'focus' => (string) $item->focus,
            'prompt' => (string) $item->prompt,
            'options' => [],
            'tokens' => [],
        ];

        if ($item->type === 'multiple_choice') {
            $payload['options'] = array_values((array) $item->options);
        } elseif ($item->type === 'true_false') {
            $payload['options'] = ['Benar', 'Salah'];
        } else {
            $payload['tokens'] = $this->shuffleTokens((string) $item->sentence);
        }

        return $payload;
    }

    /**
     * Memecah kalimat target menjadi kata acak untuk soal susun kalimat.
     *
     * @return array<int, string>
     */
    private function shuffleTokens(string $sentence): array
    {
        $words = preg_split('/\s+/', trim($sentence)) ?: [];
        $tokens = array_values(array_filter(array_map(
            static fn (string $word): string => trim(preg_replace('/[.,!?;:]+$/', '', $word) ?? $word),
            $words
        ), static fn (string $word): bool => $word !== ''));

        if (count($tokens) < 2) {
            return $tokens;
        }

        $shuffled = $tokens;
        for ($attempt = 0; $attempt < 5; $attempt++) {
            shuffle($shuffled);
            if ($shuffled !== $tokens) {
                break;
            }
        }

        return $shuffled;
    }

    /**
     * Menyamakan bentuk jawaban sebelum dibandingkan
     * (abaikan huruf besar/kecil, tanda baca, dan spasi berlebih).
     */
    private function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }
}
