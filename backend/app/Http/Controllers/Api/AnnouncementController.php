<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pengumuman instruktur: ditulis admin, dibaca siswa di dashboard.
 */
class AnnouncementController extends Controller
{
    use ApiResponse;

    private const AUDIENCES = ['all', 'user', 'teacher'];

    /**
     * Daftar pengumuman. Siswa hanya melihat pengumuman untuk perannya.
     */
    public function index(Request $request): JsonResponse
    {
        $role = (string) ($request->user()->role ?? 'user');

        $query = Announcement::with('creator:id,name')->orderByDesc('id');

        if ($role !== 'admin') {
            $query->whereIn('audience', ['all', $role === 'teacher' ? 'teacher' : 'user']);
        }

        $items = $query->limit(30)->get()
            ->map(fn (Announcement $row): array => $this->mapAnnouncement($row))
            ->all();

        return $this->ok(['announcements' => $items]);
    }

    /**
     * Membuat pengumuman baru (khusus admin).
     */
    public function store(Request $request): JsonResponse
    {
        $title = trim((string) $request->input('title', ''));
        $message = trim((string) $request->input('message', ''));
        $audience = (string) $request->input('audience', 'all');

        if ($title === '') {
            return $this->fail('Judul pengumuman wajib diisi.', 422);
        }
        if ($message === '') {
            return $this->fail('Isi pengumuman wajib diisi.', 422);
        }
        if (! in_array($audience, self::AUDIENCES, true)) {
            return $this->fail('Sasaran pengumuman tidak valid.', 422);
        }

        $announcement = Announcement::create([
            'created_by' => (int) $request->user()->id,
            'title' => mb_substr($title, 0, 200),
            'message' => mb_substr($message, 0, 2000),
            'audience' => $audience,
        ]);

        return $this->ok(
            $this->mapAnnouncement($announcement->load('creator:id,name')),
            [],
            201
        );
    }

    /**
     * Menghapus pengumuman (khusus admin).
     */
    public function destroy(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            return $this->fail('ID pengumuman tidak valid.', 422);
        }

        $announcement = Announcement::find($id);
        if (! $announcement) {
            return $this->fail('Pengumuman tidak ditemukan.', 404);
        }

        $announcement->delete();

        return $this->ok(['id' => $id, 'deleted' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAnnouncement(Announcement $row): array
    {
        $created = $row->created_at ? $row->created_at->getTimestamp() : time();

        return [
            'id' => (int) $row->id,
            'title' => (string) $row->title,
            'message' => (string) $row->message,
            'audience' => (string) $row->audience,
            'author' => $row->creator?->name ?? 'Instruktur',
            'created' => date('d M Y H:i', $created),
            'createdAt' => date('c', $created),
        ];
    }
}
