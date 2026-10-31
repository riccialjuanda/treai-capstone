<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\GeminiException;
use App\Http\Controllers\Controller;
use App\Models\AiMessage;
use App\Services\GeminiService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Integrasi AI (Google Gemini) untuk TOEFLy.
 */
class AiController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly GeminiService $gemini)
    {
    }

    public function status(): JsonResponse
    {
        return $this->ok([
            'configured' => $this->gemini->isConfigured(),
            'model' => $this->gemini->model(),
        ]);
    }

    public function chat(Request $request): JsonResponse
    {
        if (! $this->gemini->isConfigured()) {
            return $this->fail(
                'Gemini API belum dikonfigurasi. Isi GEMINI_API_KEY pada file backend/.env untuk mengaktifkan AI sungguhan.',
                503,
                ['code' => 'AI_NOT_CONFIGURED']
            );
        }

        $message = trim((string) $request->input('message', ''));
        if ($message === '') {
            return $this->fail('Pesan tidak boleh kosong.', 422);
        }

        $topic = is_array($request->input('topic')) ? $request->input('topic') : [];
        $history = is_array($request->input('history')) ? $request->input('history') : [];

        $contents = [];
        foreach (array_slice($history, -8) as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $text = trim((string) ($entry['text'] ?? ''));
            $sender = ($entry['sender'] ?? 'user') === 'toefly' ? 'model' : 'user';
            if ($text !== '') {
                $contents[] = ['role' => $sender, 'parts' => [['text' => $text]]];
            }
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $this->gemini->buildToeflySystemPrompt($topic)]],
            ],
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.85,
                'maxOutputTokens' => 4096,
                'responseMimeType' => 'application/json',
                'responseSchema' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'reply' => ['type' => 'STRING'],
                        'translation' => ['type' => 'STRING'],
                        'feedback' => ['type' => 'STRING'],
                        'mood' => [
                            'type' => 'STRING',
                            'enum' => ['happy', 'encouraging', 'idle', 'speaking'],
                        ],
                    ],
                    'required' => ['reply', 'translation', 'feedback', 'mood'],
                ],
            ],
        ];

        try {
            $response = $this->gemini->request($payload);
        } catch (GeminiException $e) {
            return $this->fail($this->gemini->userMessage($e), $e->status, [
                'code' => $e->reason,
                'retryAfter' => $e->retryAfter,
            ]);
        } catch (Throwable $e) {
            Log::error('[TOEFLy AI] Galat tak terduga: ' . $e->getMessage());

            return $this->fail(
                config('app.debug') ? $e->getMessage() : 'Gagal menghubungi layanan AI. Coba lagi sebentar lagi.',
                502,
                ['code' => 'AI_ERROR']
            );
        }

        $text = $this->gemini->extractText($response);
        $parsed = json_decode($text, true);

        if (! is_array($parsed) || ! isset($parsed['reply'])) {
            $hint = $this->gemini->failureHint($response);
            Log::error('[TOEFLy AI] Respons tidak terbaca' . $hint . ' | mentah: ' . mb_substr($text, 0, 300));

            return $this->fail('Respons AI tidak dapat dibaca.' . $hint, 502, ['code' => 'AI_BAD_RESPONSE']);
        }

        $mood = (string) ($parsed['mood'] ?? 'idle');
        if (! in_array($mood, ['happy', 'encouraging', 'idle', 'speaking'], true)) {
            $mood = 'idle';
        }

        // Simpan percakapan ke database untuk riwayat belajar.
        $userId = (int) $request->user()->id;
        AiMessage::create([
            'user_id' => $userId,
            'sender' => 'user',
            'message_text' => $message,
        ]);
        AiMessage::create([
            'user_id' => $userId,
            'sender' => 'toefly',
            'message_text' => (string) $parsed['reply'],
            'translation' => (string) ($parsed['translation'] ?? ''),
            'feedback' => (string) ($parsed['feedback'] ?? ''),
        ]);

        return $this->ok([
            'reply' => (string) $parsed['reply'],
            'translation' => (string) ($parsed['translation'] ?? ''),
            'feedback' => (string) ($parsed['feedback'] ?? ''),
            'mood' => $mood,
            'model' => $this->gemini->model(),
        ]);
    }
}
