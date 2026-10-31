import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Volume2,
  RotateCcw,
  Loader2,
  Sparkles,
  Award,
  TrendingUp,
  HelpCircle,
  Clock
} from "lucide-react";

import { pronunciationApi } from "../utils/api";
import { speakWithPreferences } from "../utils/preferences";

import "./PracticeRoom.css";

const MAX_RECORD_SECONDS = 15;

// Pilih format rekaman yang didukung browser (Chrome/Edge -> webm/opus).
function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4"
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
}

const STATUS_LABEL = { good: "Tepat", warning: "Perlu diperbaiki", poor: "Sulit dipahami" };

function scoreTone(value) {
  if (value >= 80) return "good";
  if (value >= 60) return "warning";
  return "poor";
}

export default function PronunciationLab({
  level = "beginner",
  levelLabel = "Beginner",
  onAddSession
}) {
  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [target, setTarget] = useState(null);
  const [error, setError] = useState("");

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [aiNote, setAiNote] = useState("");
  const [history, setHistory] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const blobRef = useRef(null);
  const audioUrlRef = useRef("");
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const loadHistory = useCallback(() => {
    pronunciationApi
      .history()
      .then((data) => setHistory(data))
      .catch(() => setHistory(null));
  }, []);

  // Muat daftar kalimat latihan setiap kali level berubah.
  useEffect(() => {
    let cancelled = false;
    setLoadingTargets(true);
    setError("");
    setAssessment(null);
    setAiNote("");
    resetRecording();

    pronunciationApi
      .targets({ level })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.targets) ? data.targets : [];
        setTargets(list);
        setTarget(list[0] || null);
        setLoadingTargets(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setTargets([]);
        setTarget(null);
        setLoadingTargets(false);
        setError(err.message || "Gagal memuat kalimat latihan.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Bersihkan mikrofon & timer saat berpindah halaman.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Perekam mungkin sudah berhenti.
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function resetRecording() {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setAudioUrl("");
    setElapsed(0);
    setRecording(false);
    blobRef.current = null;
    chunksRef.current = [];
  }

  // Memutar contoh pelafalan memakai AI Voice Assistant (text-to-speech).
  function playSample() {
    if (!target) return;
    speakWithPreferences(target.text);
  }

  function stopRecorder() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function startRecording() {
    setError("");
    setAssessment(null);
    setAiNote("");
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    setAudioUrl("");
    blobRef.current = null;
    chunksRef.current = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Browser Anda belum mendukung perekaman audio. Gunakan Chrome atau Edge terbaru.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Perekam audio tidak tersedia di browser ini.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);

        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        blobRef.current = blob;
        if (mountedRef.current && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          setAudioUrl(url);
        } else if (mountedRef.current) {
          setError("Rekaman kosong. Coba rekam ulang lebih lama.");
        }
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORD_SECONDS) stopRecorder();
          return next;
        });
      }, 1000);
    } catch {
      setError("Tidak dapat mengakses mikrofon. Periksa izin mikrofon pada browser.");
      setRecording(false);
    }
  }

  async function evaluate() {
    if (!blobRef.current || !target) {
      setError("Rekam suara Anda terlebih dahulu sebelum dinilai.");
      return;
    }

    setEvaluating(true);
    setError("");
    setAiNote("Mengirim rekaman ke Gemini untuk dinilai...");
    try {
      const extension = blobRef.current.type.includes("ogg")
        ? "ogg"
        : blobRef.current.type.includes("mp4")
        ? "m4a"
        : "webm";
      const formData = new FormData();
      formData.append("audio", blobRef.current, `recording.${extension}`);
      formData.append("targetText", target.text);
      formData.append("level", level);

      const data = await pronunciationApi.evaluate(formData);
      if (!mountedRef.current) return;

      setAssessment(data?.assessment || null);
      setAiNote(`Dinilai oleh AI (${data?.model || "Gemini"}).`);
      loadHistory();

      if (typeof onAddSession === "function" && data?.assessment) {
        try {
          Promise.resolve(
            onAddSession({
              type: "Pronunciation Lab",
              detail: target.text.slice(0, 60),
              score: `${data.assessment.score}/100`
            })
          ).catch(() => {});
        } catch {
          // Gagal menyimpan riwayat tidak menghentikan latihan.
        }
      }
    } catch (err) {
      const noticeByCode = {
        AI_NOT_CONFIGURED:
          "Penilaian AI belum aktif. Isi GEMINI_API_KEY pada backend/.env.",
        AI_RATE_LIMIT: "Kuota harian Gemini habis. Coba lagi nanti.",
        AI_TIMEOUT: "AI tidak merespons tepat waktu. Coba lagi."
      };
      setAiNote("");
      setError(noticeByCode[err?.code] || err.message || "Gagal menilai pelafalan.");
    } finally {
      if (mountedRef.current) setEvaluating(false);
    }
  }

  const hasRecording = Boolean(audioUrl);

  return (
    <div className="pr-page">
      <header className="pr-page-head">
        <div>
          <span className="pr-eyebrow">
            PRONUNCIATION LAB / EVALUASI PELAFALAN AI
          </span>
          <h1>Pronunciation Lab</h1>
          <p>
            Dengarkan contoh dari AI, tirukan kalimatnya, lalu rekam suaramu untuk
            mendapat penilaian pelafalan, kejelasan, dan ketepatan kata.
          </p>
        </div>
        <span className="pr-level-badge">{levelLabel}</span>
      </header>

      <div className="pr-two-col">
        {/* KOLOM KIRI — PILIH KALIMAT */}
        <section className="pr-card">
          <h3 className="pr-card-title">Pilih Kalimat Latihan</h3>
          {loadingTargets ? (
            <p className="pr-muted">
              <Loader2 size={15} className="pr-spin" /> Memuat kalimat...
            </p>
          ) : (
            <ul className="pr-target-list">
              {targets.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`pr-target-item ${target?.id === item.id ? "is-active" : ""}`}
                    onClick={() => {
                      setTarget(item);
                      setAssessment(null);
                      setAiNote("");
                    }}
                  >
                    <span className="pr-target-focus">{item.focus}</span>
                    <span className="pr-target-text">{item.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* KOLOM KANAN — REKAM & HASIL */}
        <section className="pr-card pr-record-card">
          {target ? (
            <>
              <div className="pr-target-display">
                <span className="pr-target-focus">{target.focus}</span>
                <p className="pr-target-sentence">{target.text}</p>
                <p className="pr-tip">
                  <Sparkles size={14} /> {target.tip}
                </p>
              </div>

              <div className="pr-record-controls">
                <button
                  type="button"
                  className="pr-secondary-btn"
                  onClick={playSample}
                  disabled={recording}
                >
                  <Volume2 size={17} /> Dengarkan Contoh
                </button>

                <button
                  type="button"
                  className={`pr-mic-btn ${recording ? "is-recording" : ""}`}
                  onClick={recording ? stopRecorder : startRecording}
                  disabled={evaluating}
                >
                  {recording ? <Square size={22} /> : <Mic size={22} />}
                  <span>
                    {recording
                      ? `Berhenti (${elapsed}s / ${MAX_RECORD_SECONDS}s)`
                      : "Mulai Rekam"}
                  </span>
                  {recording && <span className="pr-mic-pulse" />}
                </button>
              </div>

              {hasRecording && (
                <div className="pr-playback">
                  <audio src={audioUrl} controls />
                  <div className="pr-playback-actions">
                    <button
                      type="button"
                      className="pr-text-btn"
                      onClick={startRecording}
                      disabled={evaluating}
                    >
                      <RotateCcw size={14} /> Rekam ulang
                    </button>
                    <button
                      type="button"
                      className="pr-primary-btn pr-compact"
                      onClick={evaluate}
                      disabled={evaluating}
                    >
                      {evaluating ? (
                        <>
                          <Loader2 size={16} className="pr-spin" /> Menilai...
                        </>
                      ) : (
                        <>
                          <Award size={16} /> Nilai Pelafalan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {aiNote && <p className="pr-ai-note">{aiNote}</p>}
              {error && <p className="pr-error">{error}</p>}

              {assessment && (
                <div className="pr-assessment">
                  <div className="pr-assessment-score">
                    <div className="pr-score-ring pr-score-ring-sm" style={{ "--pr-pct": `${assessment.score}%` }}>
                      <div className="pr-score-ring-inner">
                        <strong>{assessment.score}</strong>
                        <span>Skor</span>
                      </div>
                    </div>
                    <div className="pr-score-bars">
                      <div className="pr-bar-row">
                        <span>Kejelasan (Clarity)</span>
                        <div className="pr-bar-track">
                          <i
                            className={`tone-${scoreTone(assessment.clarity)}`}
                            style={{ width: `${assessment.clarity}%` }}
                          />
                        </div>
                        <strong>{assessment.clarity}</strong>
                      </div>
                      <div className="pr-bar-row">
                        <span>Ketepatan Kata (Accuracy)</span>
                        <div className="pr-bar-track">
                          <i
                            className={`tone-${scoreTone(assessment.accuracy)}`}
                            style={{ width: `${assessment.accuracy}%` }}
                          />
                        </div>
                        <strong>{assessment.accuracy}</strong>
                      </div>
                    </div>
                  </div>

                  {assessment.transcript && (
                    <p className="pr-transcript">
                      <strong>Yang terdengar AI:</strong> “{assessment.transcript}”
                    </p>
                  )}

                  {assessment.words?.length > 0 && (
                    <div className="pr-word-chips">
                      {assessment.words.map((word, i) => (
                        <span
                          key={`${word.word}-${i}`}
                          className={`pr-word-chip is-${word.status}`}
                          title={word.hint || STATUS_LABEL[word.status]}
                        >
                          {word.word}
                        </span>
                      ))}
                    </div>
                  )}

                  {assessment.feedback && (
                    <p className="pr-feedback-text pr-plain">
                      <Sparkles size={15} /> {assessment.feedback}
                    </p>
                  )}

                  {assessment.suggestions?.length > 0 && (
                    <ul className="pr-suggestions">
                      {assessment.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="pr-muted">Belum ada kalimat latihan untuk level ini.</p>
          )}
        </section>
      </div>

      {/* RIWAYAT PELAFALAN */}
      {history && (
        <section className="pr-card">
          <h3 className="pr-card-title">Riwayat Pelafalan</h3>
          {history.total === 0 ? (
            <p className="pr-muted">
              <HelpCircle size={15} /> Belum ada rekaman yang dinilai. Mulai rekam di atas.
            </p>
          ) : (
            <>
              <div className="pr-mini-stats">
                <div>
                  <strong>{history.total}</strong>
                  <span>Rekaman dinilai</span>
                </div>
                <div>
                  <strong>{history.averageScore}</strong>
                  <span>Skor rata-rata</span>
                </div>
                <div>
                  <strong>{history.bestScore}</strong>
                  <span>Skor terbaik</span>
                </div>
              </div>
              <ul className="pr-history-list">
                {history.history.map((row) => (
                  <li key={row.id} className="pr-history-row">
                    <div className="pr-history-main">
                      <strong>{row.targetText}</strong>
                      <small>
                        <Clock size={12} /> {row.date}
                      </small>
                    </div>
                    <span className={`pr-history-score tone-${scoreTone(row.score)}`}>
                      <TrendingUp size={13} /> {row.score}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
