// Penyimpanan preferensi global (localStorage + event) agar pengaturan
// benar-benar aktif di seluruh fitur: AI Partner, TOEFL Practice, Pronunciation, Home.
// Bila pengguna sudah login, perubahan juga disinkronkan ke backend MySQL.

import { preferencesApi, getToken } from "./api";

const PREFS_KEY = "toefl_user_preferences";
const PREFS_EVENT = "toefl:preferences-changed";

export const DEFAULT_PREFERENCES = {
  voiceName: "",
  speechRate: 0.95,
  autoVoiceReply: true,
  bilingualMode: true,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return { ...fallback };
  }
}

function write(key, eventName, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Abaikan bila localStorage tidak tersedia
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
  }
}

/* ---------------- Preferensi belajar pengguna ---------------- */

export function loadPreferences() {
  return read(PREFS_KEY, DEFAULT_PREFERENCES);
}

export function savePreferences(partial) {
  const next = { ...loadPreferences(), ...partial };
  write(PREFS_KEY, PREFS_EVENT, next);

  // Sinkronkan ke MySQL bila pengguna sudah login (tanpa memblokir UI)
  if (getToken()) {
    preferencesApi.save(next).catch(() => {});
  }

  return next;
}

/**
 * Menarik preferensi dari backend dan menggabungkannya ke penyimpanan lokal.
 * Dipanggil setelah login berhasil.
 */
export async function syncPreferencesFromServer() {
  if (!getToken()) return loadPreferences();
  try {
    const remote = await preferencesApi.get();
    if (!remote) return loadPreferences();
    const merged = { ...loadPreferences(), ...remote };
    write(PREFS_KEY, PREFS_EVENT, merged);
    return merged;
  } catch {
    return loadPreferences();
  }
}

export function subscribePreferences(callback) {
  function onChange(event) {
    callback(event.detail || loadPreferences());
  }
  window.addEventListener(PREFS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PREFS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/* ---------------- Util suara ---------------- */

// Bobot kealamian suara. Suara modern (Natural/Neural/Google) jauh lebih mirip
// manusia dibanding suara "Desktop" bawaan sistem yang terdengar robot.
const VOICE_HINTS = [
  { pattern: /natural/i, score: 60 },
  { pattern: /neural/i, score: 55 },
  { pattern: /google/i, score: 45 },
  { pattern: /\bonline\b/i, score: 25 },
  { pattern: /enhanced|premium|plus/i, score: 20 },
  {
    pattern:
      /aria|jenny|guy|libby|michelle|ana|christopher|eric|roger|steffan|samantha|allison|ava|susan|zoe|serena|daniel|karen|moira|tessa|fiona|nicky|alex|joanna|matthew|salli|kimberly|ivy|justin|kendra|ruth|amy|emma|olivia|brian|arthur|clara|liam|neerja|prabhat/i,
    score: 30,
  },
];

// Suara bawaan lama dan suara "novelty" sistem yang jelas tidak cocok untuk
// latihan bahasa (mis. efek suara lucu pada macOS) diberi penalti besar.
const UNSUITABLE_VOICE =
  /desktop|compact|espeak|robot|novelty|bad news|good news|albert|zarvox|trinoids|bubbles|cellos|jester|organ|superstar|boing|babel|bahh|fred|ralph|kathy|princess|deranged|hysterical|bruce|junior|agnes|grandma|grandpa|rocko|shelley|sandy|flo|eddy|reed|wobble|singsong/i;

function scoreVoice(voice) {
  const name = voice.name || "";
  const lang = voice.lang || "";
  let score = 0;

  if (!/^en/i.test(lang)) return -500;

  VOICE_HINTS.forEach((hint) => {
    if (hint.pattern.test(name)) score += hint.score;
  });

  if (UNSUITABLE_VOICE.test(name)) score -= 120;
  if (/en-US/i.test(lang)) score += 6;
  // Suara berbasis layanan daring biasanya lebih halus daripada suara lokal lama.
  if (voice.localService === false) score += 8;

  return score;
}

export function voiceQualityLabel(score) {
  if (score >= 70) return "Sangat natural";
  if (score >= 40) return "Natural";
  if (score >= 15) return "Cukup natural";
  return "Standar";
}

/**
 * Daftar suara bahasa Inggris di perangkat, diurutkan dari yang paling natural.
 *
 * @returns {Array<{name: string, lang: string, score: number, quality: string}>}
 */
export function listNaturalVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  return window.speechSynthesis
    .getVoices()
    .filter((voice) => /^en/i.test(voice.lang || ""))
    .map((voice) => {
      const score = scoreVoice(voice);
      return {
        name: voice.name,
        lang: voice.lang,
        score,
        quality: voiceQualityLabel(score),
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/**
 * Suara terbaik: pakai pilihan pengguna bila masih tersedia di perangkat,
 * jika tidak ambil suara paling natural yang terdeteksi.
 */
export function pickNaturalVoice(prefs = loadPreferences()) {
  const voices = listNaturalVoices();
  if (voices.length === 0) return null;

  if (prefs.voiceName) {
    const chosen = voices.find((voice) => voice.name === prefs.voiceName);
    if (chosen) return chosen;
  }

  return voices[0];
}

/**
 * Beberapa browser baru mengisi daftar suara setelah event "voiceschanged".
 * Pembungkus ini memastikan daftar suara benar-benar siap sebelum dipakai UI.
 */
export function whenVoicesReady(callback) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    callback([]);
    return () => {};
  }

  const synth = window.speechSynthesis;

  if (synth.getVoices().length > 0) {
    callback(listNaturalVoices());
    return () => {};
  }

  const handler = () => callback(listNaturalVoices());
  synth.addEventListener("voiceschanged", handler);
  const timeout = window.setTimeout(handler, 1200);

  return () => {
    synth.removeEventListener("voiceschanged", handler);
    window.clearTimeout(timeout);
  };
}

// Terapkan pilihan suara & kecepatan dari preferensi ke utterance.
export function applySpeechPreferences(utterance, prefs = loadPreferences()) {
  if (!utterance) return utterance;
  utterance.rate = Number(prefs.speechRate) || 0.95;
  utterance.pitch = 1;

  if (typeof window === "undefined" || !("speechSynthesis" in window)) return utterance;

  const best = pickNaturalVoice(prefs);
  const voice = best
    ? window.speechSynthesis.getVoices().find((v) => v.name === best.name)
    : null;

  if (voice) {
    utterance.voice = voice;
    // Ikuti bahasa suara terpilih agar intonasinya tidak dipaksakan.
    utterance.lang = voice.lang || "en-US";
  }

  return utterance;
}

// Bicara dengan preferensi pengguna yang sudah diterapkan.
export function speakWithPreferences(text, handlers = {}) {
  if (!("speechSynthesis" in window)) return null;

  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  applySpeechPreferences(utterance);

  if (handlers.onStart) utterance.onstart = handlers.onStart;
  if (handlers.onEnd) utterance.onend = handlers.onEnd;
  utterance.onerror = () => handlers.onEnd && handlers.onEnd();

  window.speechSynthesis.speak(utterance);
  return utterance;
}
