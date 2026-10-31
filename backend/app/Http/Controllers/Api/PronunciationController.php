<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\GeminiException;
use App\Http\Controllers\Controller;
use App\Models\PronunciationAttempt;
use App\Services\GeminiService;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pronunciation Lab: siswa membaca kalimat target, rekamannya dinilai AI
 * (skor keseluruhan, kejelasan, ketepatan kata, dan saran perbaikan).
 */
class PronunciationController extends Controller
{
    use ApiResponse;

    /** Format audio yang diterima dari perekam browser. */
    private const AUDIO_MIMES = [
        'audio/webm',
        'audio/ogg',
        'audio/wav',
        'audio/x-wav',
        'audio/wave',
        'audio/mpeg',
        'audio/mp3',
        'audio/mp4',
        'audio/m4a',
        'audio/x-m4a',
        'audio/aac',
        'audio/flac',
        'video/webm',
        'video/ogg',
    ];

    public function __construct(private readonly GeminiService $gemini)
    {
    }

    /**
     * Daftar kalimat latihan pelafalan sesuai level siswa.
     */
    public function targets(Request $request): JsonResponse
    {
        $level = UserData::normalizeLevel($request->query('level', ''));
        $all = $this->targetList();

        return $this->ok([
            'level' => $level,
            'levelLabel' => UserData::levelLabel($level),
            'targets' => array_values(array_filter(
                $all,
                static fn (array $item): bool => $item['level'] === $level
            )),
        ]);
    }

    /**
     * Menilai satu rekaman suara memakai Gemini.
     */
    public function evaluate(Request $request): JsonResponse
    {
        $file = $request->file('audio');
        $targetText = trim((string) $request->input('targetText', ''));
        $level = UserData::normalizeLevel($request->input('level', ''));

        if (! $file instanceof UploadedFile || ! $file->isValid()) {
            return $this->fail('Rekaman suara tidak terkirim. Silakan rekam ulang.', 422);
        }
        if ($targetText === '') {
            return $this->fail('Kalimat target belum dipilih.', 422);
        }
        if ($file->getSize() > 8 * 1024 * 1024) {
            return $this->fail('Ukuran rekaman melebihi 8 MB. Rekam kalimat dalam durasi lebih pendek.', 422);
        }

        $mimeType = $this->resolveMimeType($file);
        if ($mimeType === null) {
            return $this->fail('Format audio tidak didukung. Gunakan perekaman langsung dari browser.', 415);
        }

        if (! $this->gemini->isConfigured()) {
            return $this->fail(
                'Gemini API belum dikonfigurasi. Isi GEMINI_API_KEY pada file backend/.env untuk mengaktifkan penilaian AI.',
                503,
                ['code' => 'AI_NOT_CONFIGURED']
            );
        }

        $encoded = base64_encode((string) file_get_contents($file->getRealPath()));

        try {
            $result = $this->gemini->evaluatePronunciation($encoded, $mimeType, $targetText, $level);
        } catch (GeminiException $e) {
            return $this->fail($this->gemini->userMessage($e), $e->status, [
                'code' => $e->reason,
                'retryAfter' => $e->retryAfter,
            ]);
        } catch (Throwable $e) {
            Log::error('[TOEFLy AI] Penilaian pelafalan gagal: ' . $e->getMessage());

            return $this->fail(
                config('app.debug') ? $e->getMessage() : 'Gagal menghubungi layanan AI. Coba lagi sebentar lagi.',
                502,
                ['code' => 'AI_ERROR']
            );
        }

        $assessment = $this->normalizeAssessment($result);
        $userId = (int) $request->user()->id;

        $attempt = PronunciationAttempt::create([
            'user_id' => $userId,
            'level' => $level,
            'target_text' => mb_substr($targetText, 0, 255),
            'transcript' => $assessment['transcript'],
            'score' => $assessment['score'],
            'clarity' => $assessment['clarity'],
            'accuracy' => $assessment['accuracy'],
            'words' => $assessment['words'],
            'feedback' => $assessment['feedback'],
        ]);

        return $this->ok([
            'attemptId' => (int) $attempt->id,
            'level' => $level,
            'levelLabel' => UserData::levelLabel($level),
            'targetText' => $targetText,
            'model' => $this->gemini->model(),
            'assessment' => $assessment,
        ], [], 201);
    }

    /**
     * Riwayat penilaian pelafalan siswa.
     */
    public function history(Request $request): JsonResponse
    {
        $rows = PronunciationAttempt::where('user_id', (int) $request->user()->id)
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        $scores = $rows->pluck('score')->map(static fn ($value): int => (int) $value);

        return $this->ok([
            'total' => $rows->count(),
            'averageScore' => $scores->isNotEmpty() ? (int) round((float) $scores->avg()) : 0,
            'bestScore' => $scores->isNotEmpty() ? (int) $scores->max() : 0,
            'history' => $rows->map(static fn (PronunciationAttempt $row): array => [
                'id' => 'p_' . $row->id,
                'date' => date('d M Y', strtotime((string) $row->created_at) ?: time()),
                'level' => (string) $row->level,
                'targetText' => (string) $row->target_text,
                'transcript' => (string) ($row->transcript ?? ''),
                'score' => (int) $row->score,
                'clarity' => (int) $row->clarity,
                'accuracy' => (int) $row->accuracy,
                'feedback' => (string) ($row->feedback ?? ''),
            ])->all(),
        ]);
    }

    /**
     * Menyeragamkan hasil penilaian AI sebelum disimpan & dikirim ke frontend.
     *
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private function normalizeAssessment(array $result): array
    {
        $score = $this->clamp($result['score'] ?? 0);

        $words = [];
        foreach ((array) ($result['words'] ?? []) as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $word = trim((string) ($entry['word'] ?? ''));
            if ($word === '') {
                continue;
            }
            $status = (string) ($entry['status'] ?? 'warning');

            $words[] = [
                'word' => $word,
                'status' => in_array($status, ['good', 'warning', 'poor'], true) ? $status : 'warning',
                'hint' => trim((string) ($entry['hint'] ?? '')),
            ];
        }

        $suggestions = [];
        foreach ((array) ($result['suggestions'] ?? []) as $suggestion) {
            $text = trim((string) $suggestion);
            if ($text !== '') {
                $suggestions[] = $text;
            }
        }

        return [
            'score' => $score,
            'clarity' => $this->clamp($result['clarity'] ?? $score),
            'accuracy' => $this->clamp($result['accuracy'] ?? $score),
            'transcript' => mb_substr(trim((string) ($result['transcript'] ?? '')), 0, 1000),
            'words' => $words,
            'feedback' => mb_substr(trim((string) ($result['feedback'] ?? '')), 0, 1000),
            'suggestions' => array_slice($suggestions, 0, 4),
        ];
    }

    private function clamp(mixed $value): int
    {
        return max(0, min(100, (int) round((float) $value)));
    }

    private function resolveMimeType(UploadedFile $file): ?string
    {
        $mime = strtolower(trim((string) $file->getClientMimeType()));
        $mime = trim(explode(';', $mime)[0]);

        if (in_array($mime, self::AUDIO_MIMES, true)) {
            return $mime;
        }

        // Sebagian browser tidak mengirim tipe berkas untuk hasil rekaman MediaRecorder.
        if ($mime === '' || $mime === 'application/octet-stream') {
            return 'audio/webm';
        }

        return null;
    }

    /**
     * Kalimat latihan pelafalan per level beserta fokus bunyinya.
     *
     * @return array<int, array<string, string>>
     */
    private function targetList(): array
    {
        return [
            ['id' => 'b1', 'level' => 'beginner', 'focus' => 'Vokal pendek', 'text' => 'I have a big black bag.', 'tip' => 'Pastikan bunyi /æ/ pada "bag" pendek dan jelas.'],
            ['id' => 'b2', 'level' => 'beginner', 'focus' => 'Bunyi /θ/', 'text' => 'Thank you for the three books.', 'tip' => 'Sentuhkan ujung lidah ke gigi atas untuk bunyi /θ/.'],
            ['id' => 'b3', 'level' => 'beginner', 'focus' => 'Akhiran -s', 'text' => 'She likes apples and oranges.', 'tip' => 'Akhiran -s pada "likes" dibaca /s/, pada "oranges" dibaca /ɪz/.'],
            ['id' => 'b4', 'level' => 'beginner', 'focus' => 'Vokal panjang', 'text' => 'We need to leave the room soon.', 'tip' => 'Bedakan /iː/ panjang pada "need" dan /uː/ pada "room".'],
            ['id' => 'b5', 'level' => 'beginner', 'focus' => 'Intonasi tanya', 'text' => 'Are you coming with us today?', 'tip' => 'Nada naik di akhir kalimat tanya yes/no.'],
            ['id' => 'p1', 'level' => 'pre_intermediate', 'focus' => 'Konsonan akhir', 'text' => 'I walked to the park and watched the birds.', 'tip' => 'Jangan hilangkan bunyi /t/ dan /d/ di akhir kata.'],
            ['id' => 'p2', 'level' => 'pre_intermediate', 'focus' => 'Bunyi /r/ dan /l/', 'text' => 'The library is right across the river.', 'tip' => 'Bedakan /r/ pada "right" dan /l/ pada "library".'],
            ['id' => 'p3', 'level' => 'pre_intermediate', 'focus' => 'Penekanan kata', 'text' => 'I have already finished my assignment.', 'tip' => 'Tekankan suku kata kedua pada "already" dan "assignment".'],
            ['id' => 'p4', 'level' => 'pre_intermediate', 'focus' => 'Kata sambung', 'text' => 'We should consider the alternatives before deciding.', 'tip' => 'Ucapkan "should consider" tanpa jeda terpisah.'],
            ['id' => 'p5', 'level' => 'pre_intermediate', 'focus' => 'Bunyi /v/ dan /f/', 'text' => 'Have you ever visited a foreign village?', 'tip' => 'Gigi menyentuh bibir bawah untuk /v/ dan /f/, bukan /p/.'],
            ['id' => 'i1', 'level' => 'intermediate', 'focus' => 'Penekanan bersuku banyak', 'text' => 'The photographer developed a remarkable technique.', 'tip' => 'Tekankan "pho-TOG-ra-pher" dan "re-MARK-a-ble".'],
            ['id' => 'i2', 'level' => 'intermediate', 'focus' => 'Kluster konsonan', 'text' => 'The twelfth street crossing is extraordinarily crowded.', 'tip' => 'Latih kluster "twelfth str" perlahan sebelum mempercepat.'],
            ['id' => 'i3', 'level' => 'intermediate', 'focus' => 'Irama kalimat', 'text' => 'Had I known the consequences, I would have acted differently.', 'tip' => 'Beri jeda pendek setelah anak kalimat "Had I known the consequences".'],
            ['id' => 'i4', 'level' => 'intermediate', 'focus' => 'Vokal /ɜː/', 'text' => 'The research reveals a further concern.', 'tip' => 'Bunyi /ɜː/ pada "research" dan "further" netral dan panjang.'],
            ['id' => 'i5', 'level' => 'intermediate', 'focus' => 'Penekanan kontras', 'text' => 'It was not the cost but the quality that mattered.', 'tip' => 'Tinggikan nada pada "quality" untuk menunjukkan kontras.'],
        ];
    }
}
