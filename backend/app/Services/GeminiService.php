<?php

namespace App\Services;

use App\Exceptions\GeminiException;
use App\Support\UserData;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Klien Google Gemini Generative Language API.
 *
 * Fitur ketahanan (sama dengan backend lama):
 * - Rotasi beberapa API key (GEMINI_API_KEYS) agar kuota free tier berganda.
 * - Percobaan ulang dengan backoff untuk galat sementara.
 * - Klasifikasi galat (kuota habis, timeout, key tidak valid, model hilang).
 */
class GeminiService
{
    /** @var array<string, mixed> */
    private array $config;

    public function __construct()
    {
        $this->config = (array) config('services.gemini', []);
    }

    /**
     * Daftar API key (GEMINI_API_KEYS dipisah koma/baris, lalu GEMINI_API_KEY).
     *
     * @return array<int, string>
     */
    public function apiKeys(): array
    {
        $keys = [];

        foreach ([(string) ($this->config['keys'] ?? ''), (string) ($this->config['key'] ?? '')] as $blob) {
            foreach (preg_split('/[\s,;]+/', $blob) ?: [] as $candidate) {
                $candidate = trim($candidate);
                if ($candidate !== '' && ! in_array($candidate, $keys, true)) {
                    $keys[] = $candidate;
                }
            }
        }

        return $keys;
    }

    public function isConfigured(): bool
    {
        return $this->apiKeys() !== [];
    }

    public function model(): string
    {
        return (string) ($this->config['model'] ?? 'gemini-3.5-flash');
    }

    /**
     * Mengirim permintaan generateContent ke Gemini, dengan rotasi key & retry.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws GeminiException
     */
    public function request(array $payload): array
    {
        $keys = $this->apiKeys();
        if ($keys === []) {
            throw new GeminiException(
                'GEMINI_API_KEY belum diisi pada file backend/.env',
                'AI_NOT_CONFIGURED',
                503
            );
        }

        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            rawurlencode($this->model())
        );

        $attempts = (int) ($this->config['max_retries'] ?? 1) + 1;
        $lastError = null;

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            foreach ($keys as $index => $key) {
                try {
                    return $this->singleRequest($url, $key, $payload);
                } catch (GeminiException $e) {
                    $lastError = $e;
                    $this->log(sprintf(
                        'key#%d percobaan %d/%d gagal (%s): %s',
                        $index + 1,
                        $attempt,
                        $attempts,
                        $e->reason,
                        $e->getMessage()
                    ));

                    // Model tidak dikenal: tidak ada gunanya mencoba key lain.
                    if ($e->reason === 'AI_MODEL_NOT_FOUND') {
                        throw $e;
                    }
                }
            }

            if ($attempt < $attempts && $this->isRetryable($lastError)) {
                sleep($this->backoff($lastError, $attempt));
                continue;
            }

            break;
        }

        throw $lastError ?? new GeminiException('Gagal menghubungi layanan AI.', 'AI_ERROR');
    }

    /**
     * Satu percobaan HTTP ke Gemini memakai satu API key.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws GeminiException
     */
    private function singleRequest(string $url, string $key, array $payload): array
    {
        try {
            $response = Http::withHeaders([
                'x-goog-api-key' => $key,
            ])
                ->timeout((int) ($this->config['request_timeout'] ?? 40))
                ->connectTimeout((int) ($this->config['connect_timeout'] ?? 10))
                ->post($url, $payload);
        } catch (ConnectionException $e) {
            throw new GeminiException('Koneksi ke Gemini gagal: ' . $e->getMessage(), 'AI_TIMEOUT');
        }

        $decoded = $response->json();
        $decoded = is_array($decoded) ? $decoded : [];

        if ($response->status() >= 400) {
            throw $this->errorFromResponse($response->status(), $decoded);
        }

        return $decoded;
    }

    /**
     * Menerjemahkan respons galat Gemini menjadi GeminiException terklasifikasi.
     *
     * @param  array<string, mixed>  $decoded
     */
    private function errorFromResponse(int $httpCode, array $decoded): GeminiException
    {
        $message = (string) ($decoded['error']['message'] ?? 'Kesalahan tidak diketahui dari Gemini.');

        if ($httpCode === 429) {
            return new GeminiException($message, 'AI_RATE_LIMIT', 429, $this->parseRetryAfter($decoded));
        }
        if (in_array($httpCode, [401, 403], true) || $this->isApiKeyError($decoded)) {
            return new GeminiException($message, 'AI_AUTH', 502);
        }
        if ($httpCode === 404) {
            return new GeminiException($message, 'AI_MODEL_NOT_FOUND', 502);
        }
        if ($httpCode >= 500) {
            return new GeminiException($message, 'AI_UNAVAILABLE', 502);
        }

        return new GeminiException($message, 'AI_REQUEST_REJECTED', 502);
    }

    /**
     * Mendeteksi galat API key tidak valid (Gemini memakai HTTP 400).
     *
     * @param  array<string, mixed>  $decoded
     */
    private function isApiKeyError(array $decoded): bool
    {
        foreach ($decoded['error']['details'] ?? [] as $detail) {
            if (($detail['reason'] ?? '') === 'API_KEY_INVALID') {
                return true;
            }
        }

        $status = (string) ($decoded['error']['status'] ?? '');
        $message = strtolower((string) ($decoded['error']['message'] ?? ''));

        return $status === 'UNAUTHENTICATED' || str_contains($message, 'api key not valid');
    }

    /**
     * Mengambil saran jeda (detik) dari respons 429 Gemini.
     *
     * @param  array<string, mixed>  $decoded
     */
    private function parseRetryAfter(array $decoded): int
    {
        foreach ($decoded['error']['details'] ?? [] as $detail) {
            if (isset($detail['retryDelay']) && preg_match('/^(\d+(?:\.\d+)?)s$/', (string) $detail['retryDelay'], $m)) {
                return (int) ceil((float) $m[1]);
            }
        }

        $message = (string) ($decoded['error']['message'] ?? '');
        if (preg_match('/retry in (?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/i', $message, $m)) {
            return ((int) ($m[1] ?? 0)) * 3600
                + ((int) ($m[2] ?? 0)) * 60
                + (int) ceil((float) ($m[3] ?? 0));
        }

        return 0;
    }

    /**
     * Menentukan apakah galat layak dicoba ulang.
     */
    private function isRetryable(?GeminiException $error): bool
    {
        if ($error === null) {
            return false;
        }
        if (in_array($error->reason, ['AI_UNAVAILABLE', 'AI_TIMEOUT'], true)) {
            return true;
        }

        return $error->reason === 'AI_RATE_LIMIT'
            && $error->retryAfter > 0
            && $error->retryAfter <= 60;
    }

    /**
     * Jeda sebelum percobaan ulang, dibatasi agar tidak menggantung lama.
     */
    private function backoff(?GeminiException $error, int $attempt): int
    {
        $delay = ($error !== null && $error->retryAfter > 0)
            ? $error->retryAfter
            : 2 ** $attempt;

        return (int) max(1, min($delay, 8));
    }

    /**
     * Pesan ramah berbahasa Indonesia untuk ditampilkan ke pengguna.
     */
    public function userMessage(GeminiException $error): string
    {
        return match ($error->reason) {
            'AI_NOT_CONFIGURED' => 'Gemini API belum dikonfigurasi. Isi GEMINI_API_KEY pada file backend/.env untuk mengaktifkan AI sungguhan.',
            'AI_RATE_LIMIT' => 'Kuota harian Gemini (free tier) sudah habis.'
                . ($error->retryAfter > 0 ? ' Kuota diperkirakan pulih dalam ' . $this->humanDelay($error->retryAfter) . '.' : '')
                . ' Tambahkan API key lain pada GEMINI_API_KEYS atau aktifkan billing di Google Cloud.',
            'AI_TIMEOUT' => 'Layanan AI tidak merespons tepat waktu. Silakan coba lagi.',
            'AI_AUTH' => 'API key Gemini tidak valid atau tidak memiliki akses ke model ini.',
            'AI_MODEL_NOT_FOUND' => 'Model Gemini "' . $this->model() . '" tidak tersedia. Perbarui GEMINI_MODEL pada backend/.env.',
            'AI_REQUEST_REJECTED' => 'Permintaan ke Gemini ditolak. Periksa kembali format permintaan.',
            default => 'Layanan AI sedang tidak dapat dihubungi. Coba lagi sebentar lagi.',
        };
    }

    private function humanDelay(int $seconds): string
    {
        if ($seconds >= 3600) {
            return (int) floor($seconds / 3600) . ' jam ' . (int) floor(($seconds % 3600) / 60) . ' menit';
        }
        if ($seconds >= 60) {
            return (int) floor($seconds / 60) . ' menit ' . ($seconds % 60) . ' detik';
        }

        return max(1, $seconds) . ' detik';
    }

    /**
     * Mengambil teks hasil generasi pertama dari respons Gemini.
     *
     * @param  array<string, mixed>  $response
     */
    public function extractText(array $response): string
    {
        foreach ($response['candidates'] ?? [] as $candidate) {
            foreach ($candidate['content']['parts'] ?? [] as $part) {
                if (isset($part['text']) && is_string($part['text'])) {
                    return $part['text'];
                }
            }
        }

        return '';
    }

    /**
     * Alasan kegagalan respons bila tidak ada teks (mis. diblokir filter keamanan).
     *
     * @param  array<string, mixed>  $response
     */
    public function failureHint(array $response): string
    {
        $blockReason = $response['promptFeedback']['blockReason'] ?? null;
        if (is_string($blockReason) && $blockReason !== '') {
            return ' (diblokir: ' . $blockReason . ')';
        }

        foreach ($response['candidates'] ?? [] as $candidate) {
            $finish = $candidate['finishReason'] ?? null;
            if (is_string($finish) && $finish !== '' && $finish !== 'STOP') {
                return ' (finishReason: ' . $finish . ')';
            }
        }

        return '';
    }

    /**
     * Susunan instruksi sistem untuk persona TOEFLy.
     *
     * @param  array<string, mixed>  $topic
     */
    public function buildToeflySystemPrompt(array $topic): string
    {
        $title = (string) ($topic['title'] ?? 'TOEFL Speaking Practice');
        $prompt = (string) ($topic['prompt'] ?? '');
        $sample = (string) ($topic['sampleResponse'] ?? '');
        $tips = (string) ($topic['speakingTips'] ?? '');
        $prepTime = (int) ($topic['prepTime'] ?? 15);
        $vocabulary = is_array($topic['keyVocabulary'] ?? null) ? implode(', ', $topic['keyVocabulary']) : '';

        return <<<PROMPT
You are "TOEFLy", a warm, patient and encouraging AI speaking coach inside the SpeakTOEFL AI learning app.
You help Indonesian students practise English conversation and TOEFL iBT Speaking.

CURRENT PRACTICE TOPIC
- Title: {$title}
- Prompt: {$prompt}
- Preparation time: {$prepTime} seconds
- Key vocabulary: {$vocabulary}
- Coaching tips: {$tips}
- Model answer reference: {$sample}

YOUR BEHAVIOUR
- Reply in natural, friendly English. Keep the main reply between 2 and 4 sentences (about 40-90 words).
- Always respond to what the student actually said. Never repeat filler.
- If the student made a grammar or word-choice mistake, correct it kindly in the "feedback" field.
- If the student asks for a sample answer, a tip, or help, provide it.
- Stay in character as TOEFLy at all times.

LANGUAGE FIELDS
- "reply": your English response (may include \n\n between paragraphs).
- "translation": an accurate, natural Indonesian translation of "reply".
- "feedback": one short coaching sentence in Indonesian (grammar note, tip, or encouragement).
- "mood": choose exactly one of: "happy", "encouraging", "idle", "speaking".
  Use "happy" when the student performs well, "encouraging" when they need support, "idle" for neutral chat.

Respond ONLY with the JSON object. No markdown, no code fences.
PROMPT;
    }

    /**
     * Instruksi sistem untuk penilaian pelafalan (Pronunciation Lab).
     */
    public function buildPronunciationSystemPrompt(string $level = 'beginner'): string
    {
        $levelLabel = UserData::levelLabel($level);

        return <<<PROMPT
You are "TOEFLy", an English pronunciation coach inside the SpeakTOEFL AI learning app.
Your students are Indonesian learners at level {$levelLabel} (CEFR-aligned).

TASK
You receive (1) a target sentence from a graded speaking drill and (2) a short audio recording of a student reading it aloud.
Evaluate the recording honestly but encouragingly.

SCORING RUBRIC (integers 0-100)
- "score": overall pronunciation quality.
- "clarity": how easy the speech is to understand (articulation, pace, volume).
- "accuracy": how faithfully the student reproduced the target words, including word endings.
Be realistic: a fluent but slightly accented reading should land around 70-85, not 100.

FIELDS
- "transcript": what you actually heard, written in plain English.
- "words": one entry per word of the TARGET sentence, in order. "status" must be "good", "warning", or "poor".
  "hint" is a short Indonesian tip for that word (mispronounced sound, missing ending, wrong stress); use "" when the word was correct.
- "feedback": 2-3 sentences in Indonesian summarising the performance and naming the main issue.
- "suggestions": 2-3 concrete practice tips in Indonesian.

Keep the tone warm and motivating, never harsh. Respond ONLY with the JSON object.
PROMPT;
    }

    /**
     * Menilai pelafalan dari berkas audio siswa memakai Gemini multimodal.
     *
     * @return array<string, mixed>
     *
     * @throws GeminiException
     */
    public function evaluatePronunciation(string $audioBase64, string $mimeType, string $targetText, string $level = 'beginner'): array
    {
        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $this->buildPronunciationSystemPrompt($level)]],
            ],
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => "Target sentence the student must read aloud:\n\"{$targetText}\"\n\nListen to the attached recording and evaluate it."],
                        ['inline_data' => ['mime_type' => $mimeType, 'data' => $audioBase64]],
                    ],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 2048,
                'responseMimeType' => 'application/json',
                'responseSchema' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'score' => ['type' => 'INTEGER'],
                        'clarity' => ['type' => 'INTEGER'],
                        'accuracy' => ['type' => 'INTEGER'],
                        'transcript' => ['type' => 'STRING'],
                        'words' => [
                            'type' => 'ARRAY',
                            'items' => [
                                'type' => 'OBJECT',
                                'properties' => [
                                    'word' => ['type' => 'STRING'],
                                    'status' => ['type' => 'STRING', 'enum' => ['good', 'warning', 'poor']],
                                    'hint' => ['type' => 'STRING'],
                                ],
                                'required' => ['word', 'status', 'hint'],
                            ],
                        ],
                        'feedback' => ['type' => 'STRING'],
                        'suggestions' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                    ],
                    'required' => ['score', 'clarity', 'accuracy', 'transcript', 'words', 'feedback', 'suggestions'],
                ],
            ],
        ];

        $response = $this->request($payload);
        $text = $this->extractText($response);
        $parsed = json_decode($text, true);

        if (! is_array($parsed)) {
            throw new GeminiException(
                'Respons penilaian AI tidak dapat dibaca.' . $this->failureHint($response),
                'AI_BAD_RESPONSE',
                502
            );
        }

        return $parsed;
    }

    private function log(string $message): void
    {
        Log::warning('[TOEFLy AI] ' . $message);
    }
}
