<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContentItem;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bank materi / soal TOEFL.
 * Daftar dapat diakses semua pengguna yang login; tambah & hapus khusus admin.
 */
class ContentController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $items = ContentItem::orderByDesc('id')->get()
            ->map(fn (ContentItem $item): array => $this->mapContent($item))
            ->all();

        return $this->ok($items);
    }

    public function store(Request $request): JsonResponse
    {
        $title = trim((string) $request->input('title', ''));
        $section = (string) $request->input('section', 'Speaking');
        $category = trim((string) $request->input('category', 'Task 1'));
        $difficulty = (string) $request->input('difficulty', 'Intermediate');
        $prompt = trim((string) $request->input('prompt', ''));

        $sections = ['Speaking', 'Reading', 'Listening', 'Writing'];
        $difficulties = ['Beginner', 'Intermediate', 'Advanced'];

        if ($title === '') {
            return $this->fail('Judul materi wajib diisi.', 422);
        }
        if (! in_array($section, $sections, true)) {
            return $this->fail('Bagian TOEFL tidak valid.', 422);
        }
        if (! in_array($difficulty, $difficulties, true)) {
            return $this->fail('Tingkat kesulitan tidak valid.', 422);
        }
        if ($category === '') {
            $category = 'Umum';
        }

        $item = ContentItem::create([
            'title' => $title,
            'section' => $section,
            'category' => $category,
            'difficulty' => $difficulty,
            'prompt' => $prompt !== '' ? mb_substr($prompt, 0, 4000) : null,
        ]);

        return $this->ok($this->mapContent($item->fresh()), [], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            return $this->fail('ID materi tidak valid.', 422);
        }

        $item = ContentItem::find($id);
        if (! $item) {
            return $this->fail('Materi tidak ditemukan.', 404);
        }

        $item->delete();

        return $this->ok(['id' => $id, 'deleted' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapContent(ContentItem $row): array
    {
        $updated = $row->updated_at ? strtotime((string) $row->updated_at) : false;

        return [
            'id' => (int) $row->id,
            'title' => $row->title,
            'section' => $row->section,
            'category' => $row->category,
            'difficulty' => $row->difficulty,
            'prompt' => (string) ($row->prompt ?? ''),
            'updated' => $updated ? date('d M Y', $updated) : date('d M Y'),
            'updatedAt' => $updated ? date('c', $updated) : null,
        ];
    }
}
