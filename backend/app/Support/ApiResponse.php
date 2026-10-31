<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Membantu menjaga bentuk respons legacy agar frontend React tidak perlu
 * berubah banyak: sukses -> {success:true, data:...}, gagal -> {success:false, error:...}.
 */
trait ApiResponse
{
    protected function ok(mixed $data = null, array $extra = [], int $status = 200): JsonResponse
    {
        return response()->json(
            array_merge(['success' => true, 'data' => $data], $extra),
            $status,
            [],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
    }

    protected function fail(string $message, int $status = 400, array $extra = []): JsonResponse
    {
        return response()->json(
            array_merge(['success' => false, 'error' => $message], $extra),
            $status,
            [],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
    }
}
