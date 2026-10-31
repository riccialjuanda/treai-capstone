<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetCode;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Endpoint autentikasi: register, login, me, logout, lupa kata sandi,
 * serta pembaruan profil dan kata sandi pengguna.
 */
class AuthController extends Controller
{
    use ApiResponse;

    /** Masa berlaku kode reset kata sandi (menit). */
    private const RESET_CODE_TTL_MINUTES = 30;

    /** Batas percobaan memasukkan kode reset sebelum harus meminta kode baru. */
    private const RESET_MAX_ATTEMPTS = 5;

    public function register(Request $request): JsonResponse
    {
        $name = trim((string) $request->input('name', ''));
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');
        $roleInput = (string) $request->input('role', 'user');
        $role = in_array($roleInput, ['user', 'admin', 'teacher'], true) ? $roleInput : 'user';

        if ($name === '' || $email === '' || $password === '') {
            return $this->fail('Nama, email, dan kata sandi wajib diisi.', 422);
        }
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->fail('Format email tidak valid.', 422);
        }
        if (strlen($password) < 6) {
            return $this->fail('Kata sandi minimal 6 karakter.', 422);
        }
        if (User::where('email', $email)->exists()) {
            return $this->fail('Email sudah terdaftar. Silakan masuk atau gunakan email lain.', 409);
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password_hash' => Hash::make($password),
            'role' => $role,
            'status' => 'Aktif',
        ]);

        UserData::ensureRows((int) $user->id);

        return $this->ok($this->sessionPayload($user->fresh()));
    }

    public function login(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            return $this->fail('Email dan kata sandi wajib diisi.', 422);
        }

        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, (string) $user->password_hash)) {
            return $this->fail('Email atau kata sandi salah.', 401);
        }
        if ($user->status === 'Ditangguhkan') {
            return $this->fail('Akun Anda sedang ditangguhkan. Hubungi administrator.', 403);
        }
        if ($user->status === 'Menunggu') {
            return $this->fail('Akun Anda masih menunggu verifikasi administrator.', 403);
        }

        UserData::ensureRows((int) $user->id);

        return $this->ok($this->sessionPayload($user));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->id;

        return $this->ok([
            'user' => UserData::publicUser($user),
            'stats' => UserData::fetchStats($userId),
            'preferences' => UserData::fetchPreferences($userId),
            'recentHistory' => UserData::fetchRecentHistory($userId),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return $this->ok(['message' => 'Berhasil keluar.']);
    }

    /**
     * Mengirim kode verifikasi untuk reset kata sandi.
     *
     * Balasan selalu sama baik email terdaftar maupun tidak, agar tidak
     * membocorkan daftar email yang ada di database.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email', '')));

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->fail('Format email tidak valid.', 422);
        }

        $genericMessage = 'Jika email tersebut terdaftar, kode reset sudah dikirim. Kode berlaku '
            .self::RESET_CODE_TTL_MINUTES.' menit.';
        $user = User::where('email', $email)->first();

        if (! $user) {
            return $this->ok(['message' => $genericMessage, 'sent' => true]);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        PasswordResetCode::updateOrCreate(
            ['email' => $email],
            [
                'code_hash' => Hash::make($code),
                'attempts' => 0,
                'expires_at' => now()->addMinutes(self::RESET_CODE_TTL_MINUTES),
                'created_at' => now(),
            ]
        );

        $this->sendResetCode($email, $code, (string) $user->name);

        $payload = [
            'message' => $genericMessage,
            'sent' => true,
            'expiresInMinutes' => self::RESET_CODE_TTL_MINUTES,
        ];

        // Mode pengembangan: kode ditampilkan di UI karena server email lokal
        // (mailpit/SMTP) belum tentu aktif saat demo.
        if (config('app.debug')) {
            $payload['debugCode'] = $code;
        }

        return $this->ok($payload);
    }

    /**
     * Menyimpan kata sandi baru setelah kode verifikasi terbukti benar.
     * Sesi lama diputus dan pengguna langsung mendapat token baru.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $code = trim((string) $request->input('code', ''));
        $password = (string) $request->input('password', '');

        if ($email === '' || $code === '' || $password === '') {
            return $this->fail('Email, kode verifikasi, dan kata sandi baru wajib diisi.', 422);
        }
        if (strlen($password) < 6) {
            return $this->fail('Kata sandi baru minimal 6 karakter.', 422);
        }

        $row = PasswordResetCode::where('email', $email)->first();

        if (! $row || $row->expires_at === null || $row->expires_at->isPast()) {
            return $this->fail('Kode reset sudah kedaluwarsa. Silakan minta kode baru.', 410);
        }
        if ($row->attempts >= self::RESET_MAX_ATTEMPTS) {
            return $this->fail('Terlalu banyak percobaan. Silakan minta kode baru.', 429);
        }
        if (! Hash::check($code, (string) $row->code_hash)) {
            $row->increment('attempts');

            return $this->fail('Kode verifikasi salah.', 422);
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            $row->delete();

            return $this->fail('Akun tidak ditemukan.', 404);
        }

        $user->password_hash = Hash::make($password);
        $user->save();

        // Putus semua sesi lama agar perangkat lain harus masuk ulang.
        $user->tokens()->delete();
        $row->delete();

        return $this->ok($this->sessionPayload($user->fresh()));
    }

    /**
     * Memperbarui nama dan email pengguna yang sedang login.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $name = trim((string) $request->input('name', ''));
        $email = strtolower(trim((string) $request->input('email', (string) $user->email)));

        if ($name === '') {
            return $this->fail('Nama lengkap wajib diisi.', 422);
        }
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->fail('Format email tidak valid.', 422);
        }
        if (User::where('email', $email)->where('id', '!=', $user->id)->exists()) {
            return $this->fail('Email sudah dipakai akun lain.', 409);
        }

        $user->name = $name;
        $user->email = $email;
        $user->save();

        return $this->ok(['user' => UserData::publicUser($user->fresh())]);
    }

    /**
     * Mengganti kata sandi pengguna yang sedang login.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $current = (string) $request->input('currentPassword', '');
        $next = (string) $request->input('newPassword', '');

        if ($current === '' || $next === '') {
            return $this->fail('Kata sandi lama dan kata sandi baru wajib diisi.', 422);
        }
        if (strlen($next) < 6) {
            return $this->fail('Kata sandi baru minimal 6 karakter.', 422);
        }
        if (! Hash::check($current, (string) $user->password_hash)) {
            return $this->fail('Kata sandi lama tidak sesuai.', 401);
        }
        if (Hash::check($next, (string) $user->password_hash)) {
            return $this->fail('Kata sandi baru tidak boleh sama dengan kata sandi lama.', 422);
        }

        $user->password_hash = Hash::make($next);
        $user->save();

        return $this->ok(['message' => 'Kata sandi berhasil diperbarui.']);
    }

    /**
     * Mengirim kode reset lewat email. Kegagalan pengiriman tidak menggagalkan
     * respons karena lingkungan lokal sering belum punya server SMTP aktif.
     */
    private function sendResetCode(string $email, string $code, string $name): void
    {
        try {
            $body = "Halo {$name},\n\n"
                ."Kode reset kata sandi SpeakTOEFL AI Anda: {$code}\n"
                .'Kode berlaku '.self::RESET_CODE_TTL_MINUTES." menit.\n\n"
                .'Jika Anda tidak meminta reset kata sandi, abaikan email ini.';

            Mail::raw($body, static function ($message) use ($email): void {
                $message->to($email)->subject('Kode Reset Kata Sandi - SpeakTOEFL AI');
            });
        } catch (Throwable $e) {
            Log::warning('Gagal mengirim kode reset kata sandi: '.$e->getMessage());
        }
    }

    /**
     * Ringkasan sesi setelah register/login: pengguna, token, statistik, preferensi.
     *
     * @return array<string, mixed>
     */
    private function sessionPayload(User $user): array
    {
        $expiresAt = now()->addDays(30);
        $token = $user->createToken('toefl', ['*'], $expiresAt);

        return [
            'user' => UserData::publicUser($user),
            'token' => $token->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'stats' => UserData::fetchStats((int) $user->id),
            'preferences' => UserData::fetchPreferences((int) $user->id),
        ];
    }
}
