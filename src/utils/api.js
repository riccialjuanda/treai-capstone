// Klien API terpusat untuk backend Laravel + MySQL (php artisan serve).
// Semua permintaan melewati apiRequest() agar header token & penanganan
// galat konsisten di seluruh aplikasi.

const DEFAULT_BASE = "http://127.0.0.1:8000/api";

export const API_BASE = (
  import.meta.env.VITE_API_BASE || DEFAULT_BASE
).replace(/\/+$/, "");

const TOKEN_KEY = "toefl_auth_token";

export class ApiError extends Error {
  constructor(message, status = 0, code = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Abaikan bila localStorage tidak tersedia
  }
}

export function clearToken() {
  setToken("");
}

/**
 * Mengirim permintaan ke backend.
 * @returns {Promise<any>} isi dari field "data" pada respons JSON
 */
export async function apiRequest(route, options = {}) {
  const { method = "GET", body, auth = true, query, signal } = options;

  const path = String(route || "").replace(/^\/+/, "").replace(/\/+$/, "");
  const url = new URL(`${API_BASE}/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server. Pastikan `php artisan serve` dan MySQL XAMPP aktif.",
      0,
      "NETWORK_ERROR"
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(
        "Respons server tidak valid. Periksa konfigurasi backend Laravel.",
        response.status,
        "BAD_RESPONSE"
      );
    }
  }

  if (!response.ok || (payload && payload.success === false)) {
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiError(
      payload?.error || `Permintaan gagal (${response.status}).`,
      response.status,
      payload?.code || ""
    );
  }

  return payload?.data ?? null;
}

/**
 * Mengirim berkas (multipart/form-data) ke backend, dipakai untuk
 * mengunggah rekaman suara ke Pronunciation Lab. Tidak menetapkan
 * Content-Type agar browser menulis boundary-nya sendiri.
 *
 * @returns {Promise<any>} isi dari field "data" pada respons JSON
 */
export async function apiUpload(route, formData, options = {}) {
  const { method = "POST" } = options;

  const path = String(route || "").replace(/^\/+/, "").replace(/\/+$/, "");
  const headers = { Accept: "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/${path}`, {
      method,
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server. Pastikan `php artisan serve` dan MySQL XAMPP aktif.",
      0,
      "NETWORK_ERROR"
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(
        "Respons server tidak valid. Periksa konfigurasi backend Laravel.",
        response.status,
        "BAD_RESPONSE"
      );
    }
  }

  if (!response.ok || (payload && payload.success === false)) {
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiError(
      payload?.error || `Permintaan gagal (${response.status}).`,
      response.status,
      payload?.code || ""
    );
  }

  return payload?.data ?? null;
}

/* ------------------------- Endpoint per domain ------------------------- */

export const authApi = {
  register: (payload) => apiRequest("auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => apiRequest("auth/login", { method: "POST", body: payload, auth: false }),
  me: () => apiRequest("auth/me"),
  logout: () => apiRequest("auth/logout", { method: "POST" }),
  // Lupa kata sandi: minta kode verifikasi lalu simpan kata sandi baru.
  forgotPassword: (payload) => apiRequest("auth/forgot-password", { method: "POST", body: payload, auth: false }),
  resetPassword: (payload) => apiRequest("auth/reset-password", { method: "POST", body: payload, auth: false }),
  // Profil pengguna yang sedang login.
  updateProfile: (payload) => apiRequest("auth/profile", { method: "PUT", body: payload }),
  updatePassword: (payload) => apiRequest("auth/password", { method: "PUT", body: payload }),
};

export const studentsApi = {
  list: (query) => apiRequest("students", { query }),
  detail: (id) => apiRequest(`students/${id}`),
};

export const usersApi = {
  list: () => apiRequest("users"),
  create: (payload) => apiRequest("users", { method: "POST", body: payload }),
  updateStatus: (id, status) => apiRequest("users", { method: "PUT", body: { id, status } }),
  remove: (id) => apiRequest("users", { method: "DELETE", query: { id } }),
};

export const contentApi = {
  list: () => apiRequest("content"),
  create: (payload) => apiRequest("content", { method: "POST", body: payload }),
  remove: (id) => apiRequest("content", { method: "DELETE", query: { id } }),
};

// Pengumuman instruktur: dibaca siswa, ditulis admin.
export const announcementsApi = {
  list: () => apiRequest("announcements"),
  create: (payload) => apiRequest("announcements", { method: "POST", body: payload }),
  remove: (id) => apiRequest("announcements", { method: "DELETE", query: { id } }),
};

export const statsApi = {
  get: () => apiRequest("stats"),
  update: (payload) => apiRequest("stats", { method: "PUT", body: payload }),
  reset: () => apiRequest("stats/reset", { method: "POST" }),
};

export const sessionsApi = {
  list: () => apiRequest("sessions"),
  create: (payload) => apiRequest("sessions", { method: "POST", body: payload }),
};

export const preferencesApi = {
  get: () => apiRequest("preferences"),
  save: (payload) => apiRequest("preferences", { method: "PUT", body: payload }),
};

export const aiApi = {
  status: () => apiRequest("ai/status", { auth: false }),
  chat: (payload) => apiRequest("ai/chat", { method: "POST", body: payload }),
};

export const grammarApi = {
  items: (query) => apiRequest("grammar/items", { query }),
  submit: (payload) => apiRequest("grammar/submit", { method: "POST", body: payload }),
  summary: () => apiRequest("grammar/summary"),
};

export const pronunciationApi = {
  targets: (query) => apiRequest("pronunciation/targets", { query }),
  history: () => apiRequest("pronunciation/history"),
  // Penilaian memakai multipart karena mengirim berkas rekaman suara.
  evaluate: (formData) => apiUpload("pronunciation/evaluate", formData),
};

export const progressApi = {
  get: () => apiRequest("progress"),
  levels: () => apiRequest("levels"),
  setLevel: (level) => apiRequest("level", { method: "PUT", body: { level } }),
};

/** Cek cepat apakah backend dapat dijangkau. */
export async function pingBackend() {
  try {
    await apiRequest("", { auth: false });
    return true;
  } catch {
    return false;
  }
}
