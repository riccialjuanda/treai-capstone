<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use App\Support\UserData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Preferensi belajar pengguna (suara, kecepatan, terjemahan).
 */
class PreferenceController extends Controller
{
    use ApiResponse;

    public function show(Request $request): JsonResponse
    {
        return $this->ok(UserData::fetchPreferences((int) $request->user()->id));
    }

    public function update(Request $request): JsonResponse
    {
        return $this->ok(UserData::savePreferences((int) $request->user()->id, $request->all()));
    }
}
