<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Manajemen pengguna (khusus administrator).
 */
class UserController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $users = User::orderBy('id')->get()
            ->map(static fn (User $user): array => UserData::publicUser($user))
            ->all();

        return $this->ok($users);
    }

    public function store(Request $request): JsonResponse
    {
        $name = trim((string) $request->input('name', ''));
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', 'password123');
        $roleInput = (string) $request->input('role', 'user');
        $roleMap = [
            'Pelajar / Student' => 'user',
            'Instruktur / Teacher' => 'teacher',
            'Administrator' => 'admin',
        ];
        $role = $roleMap[$roleInput] ?? (in_array($roleInput, ['user', 'admin', 'teacher'], true) ? $roleInput : 'user');
        $status = (string) $request->input('status', 'Aktif');

        if ($name === '' || $email === '') {
            return $this->fail('Nama dan email wajib diisi.', 422);
        }
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->fail('Format email tidak valid.', 422);
        }
        if (strlen($password) < 6) {
            return $this->fail('Kata sandi minimal 6 karakter.', 422);
        }
        if (User::where('email', $email)->exists()) {
            return $this->fail('Email sudah terdaftar.', 409);
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password_hash' => Hash::make($password),
            'role' => $role,
            'status' => $status,
        ]);

        UserData::ensureRows((int) $user->id);

        return $this->ok(UserData::publicUser($user->fresh()), [], 201);
    }

    public function update(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        $status = (string) $request->input('status', '');
        $allowed = ['Aktif', 'Menunggu', 'Ditangguhkan'];

        if ($id <= 0) {
            return $this->fail('ID pengguna tidak valid.', 422);
        }
        if (! in_array($status, $allowed, true)) {
            return $this->fail('Status tidak valid. Gunakan: Aktif, Menunggu, atau Ditangguhkan.', 422);
        }

        $user = User::find($id);
        if (! $user) {
            return $this->fail('Pengguna tidak ditemukan.', 404);
        }

        $user->status = $status;
        $user->save();

        return $this->ok(UserData::publicUser($user));
    }

    public function destroy(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            return $this->fail('ID pengguna tidak valid.', 422);
        }
        if ($id === (int) $request->user()?->id) {
            return $this->fail('Anda tidak dapat menghapus akun yang sedang digunakan.', 400);
        }

        $user = User::find($id);
        if (! $user) {
            return $this->fail('Pengguna tidak ditemukan.', 404);
        }

        $user->delete();

        return $this->ok(['id' => $id, 'deleted' => true]);
    }
}
