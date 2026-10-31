import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  TrendingUp,
  Trophy,
  Target,
  GraduationCap,
  Clock,
  BarChart3,
  Check,
  Sparkles
} from "lucide-react";

import { grammarApi, progressApi } from "../utils/api";

import "./PracticeRoom.css";

const TYPE_LABELS = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar / Salah",
  sentence_arrange: "Susun Kalimat"
};

function scoreTone(value) {
  if (!value) return "muted";
  if (value >= 80) return "good";
  if (value >= 60) return "warning";
  return "poor";
}

export default function LearningProgress({ level, onLevelChange }) {
  const [progress, setProgress] = useState(null);
  const [grammarSummary, setGrammarSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.allSettled([progressApi.get(), grammarApi.summary()])
      .then(([progressRes, grammarRes]) => {
        if (progressRes.status === "fulfilled") {
          setProgress(progressRes.value);
        } else {
          setError(
            progressRes.reason?.message || "Gagal memuat data progres belajar."
          );
        }
        if (grammarRes.status === "fulfilled") {
          setGrammarSummary(grammarRes.value);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelectLevel(nextLevel) {
    const currentLevel = progress?.level || level;
    if (!nextLevel || switching || nextLevel === currentLevel) return;

    setSwitching(nextLevel);
    setError("");
    try {
      const data = await progressApi.setLevel(nextLevel);
      setProgress((prev) =>
        prev ? { ...prev, level: data.level, levelLabel: data.levelLabel } : prev
      );
      // Beri tahu dashboard agar level global ikut berubah tanpa permintaan PUT kedua.
      onLevelChange?.(data.level, data.levelLabel, { silent: true });
      load();
    } catch (err) {
      setError(err.message || "Gagal mengganti level belajar.");
    } finally {
      setSwitching("");
    }
  }

  if (loading && !progress) {
    return (
      <div className="pr-page">
        <div className="pr-card pr-center-card">
          <p className="pr-muted">
            <Loader2 size={16} className="pr-spin" /> Memuat progres belajar...
          </p>
        </div>
      </div>
    );
  }

  const totals = progress?.totals || {};
  const levels = Array.isArray(progress?.levels) ? progress.levels : [];
  const skills = Array.isArray(progress?.skills) ? progress.skills : [];
  const focusAreas = Array.isArray(progress?.focusAreas) ? progress.focusAreas : [];
  const trend = Array.isArray(progress?.trend) ? progress.trend : [];
  const history = Array.isArray(progress?.recentHistory) ? progress.recentHistory : [];
  const overall = totals.overallScore || 0;

  return (
    <div className="pr-page">
      <header className="pr-page-head">
        <div>
          <span className="pr-eyebrow">LEARNING HISTORY / PERKEMBANGAN BELAJAR</span>
          <h1>Progres &amp; Riwayat Belajar</h1>
          <p>
            Pantau perkembangan kemampuan speaking, grammar, dan pronunciation
            serta pilih level belajar yang paling sesuai untukmu.
          </p>
        </div>
        <span className="pr-level-badge">
          <GraduationCap size={14} /> {progress?.levelLabel || "Beginner"}
        </span>
      </header>

      {error && <p className="pr-error">{error}</p>}

      {/* RINGKASAN UTAMA */}
      <div className="pr-two-col">
        <section className="pr-card pr-center-card">
          <div className="pr-score-ring" style={{ "--pr-pct": `${overall}%` }}>
            <div className="pr-score-ring-inner">
              <strong>{overall}</strong>
              <span>Skor total</span>
            </div>
          </div>
          <h2>Performa Keseluruhan</h2>
          <p className="pr-muted">
            Rata-rata dari seluruh keterampilan yang sudah dinilai.
          </p>
        </section>

        <section className="pr-card">
          <h3 className="pr-card-title">Ringkasan Aktivitas</h3>
          <div className="pr-stat-grid">
            <div className="pr-stat-tile">
              <Trophy size={17} />
              <strong>{totals.practiceSessions ?? 0}</strong>
              <span>Sesi latihan</span>
            </div>
            <div className="pr-stat-tile">
              <Clock size={17} />
              <strong>{totals.studyMinutes ?? 0}</strong>
              <span>Menit belajar</span>
            </div>
            <div className="pr-stat-tile">
              <TrendingUp size={17} />
              <strong>{totals.learningStreak ?? 0}</strong>
              <span>Rentetan hari</span>
            </div>
            <div className="pr-stat-tile">
              <Check size={17} />
              <strong>{totals.questionsAnswered ?? 0}</strong>
              <span>Soal grammar</span>
            </div>
            <div className="pr-stat-tile">
              <Sparkles size={17} />
              <strong>{totals.recordingsScored ?? 0}</strong>
              <span>Rekaman dinilai</span>
            </div>
            <div className="pr-stat-tile">
              <Target size={17} />
              <strong>
                {totals.weeklyCompleted ?? 0}/{totals.weeklyGoal ?? 0}
              </strong>
              <span>Target mingguan</span>
            </div>
          </div>
        </section>
      </div>

      {/* KETERAMPILAN */}
      <section className="pr-card">
        <h3 className="pr-card-title">
          <BarChart3 size={16} /> Kemampuan per Keterampilan
        </h3>
        <div className="pr-skill-list">
          {skills.map((skill) => (
            <div className="pr-skill-row" key={skill.id}>
              <div className="pr-skill-label">
                <strong>{skill.label}</strong>
                <small>
                  {skill.english} • {skill.sessions} sesi
                </small>
              </div>
              <div className="pr-bar-track pr-bar-lg">
                <i
                  className={`tone-${scoreTone(skill.averageScore)}`}
                  style={{ width: `${skill.averageScore}%` }}
                />
              </div>
              <strong className="pr-skill-score">{skill.averageScore}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* TREN 14 HARI */}
      <section className="pr-card">
        <h3 className="pr-card-title">
          <TrendingUp size={16} /> Tren Nilai {trend.length} Hari Terakhir
        </h3>
        {trend.some((d) => d.sessions > 0) ? (
          <div className="pr-trend">
            {trend.map((day) => (
              <div className="pr-trend-col" key={day.date}>
                <div className="pr-trend-tooltip">
                  <strong>{day.score}</strong>
                  <span>{day.label}</span>
                  <small>{day.sessions} sesi</small>
                </div>
                <div className="pr-trend-track">
                  <span
                    className={day.sessions > 0 ? "" : "is-empty"}
                    style={{ height: `${day.sessions > 0 ? Math.max(day.score, 4) : 2}%` }}
                  />
                </div>
                <small className="pr-trend-label">{day.label}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="pr-muted">
            Belum ada aktivitas latihan dalam periode ini. Selesaikan sesi speaking,
            grammar, atau pronunciation untuk melihat tren nilaimu.
          </p>
        )}
      </section>

      {/* LEVEL BELAJAR */}
      <section className="pr-card">
        <h3 className="pr-card-title">
          <GraduationCap size={16} /> Level Belajar
        </h3>
        <p className="pr-muted pr-mb">
          Level aktif digunakan untuk bank soal grammar dan kalimat pronunciation.
        </p>
        <div className="pr-level-grid">
          {levels.map((item) => {
            const active = item.id === (progress?.level || level);
            return (
              <button
                key={item.id}
                type="button"
                className={`pr-level-card ${active ? "is-active" : ""}`}
                onClick={() => handleSelectLevel(item.id)}
                disabled={Boolean(switching)}
              >
                <div className="pr-level-card-head">
                  <strong>{item.label}</strong>
                  <span className="pr-cefr">{item.cefr}</span>
                  {active && (
                    <span className="pr-level-active-tag">
                      {switching === item.id ? (
                        <Loader2 size={12} className="pr-spin" />
                      ) : (
                        <Check size={12} />
                      )}{" "}
                      Aktif
                    </span>
                  )}
                </div>
                <p>{item.description}</p>
                <div className="pr-level-meta">
                  <span>{item.bankSize} soal tersedia</span>
                  <span>
                    {item.attempts} dijawab
                    {item.attempts > 0 ? ` • ${item.accuracy}% benar` : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AREA FOKUS + GRAMMAR PER TIPE */}
      <div className="pr-two-col">
        <section className="pr-card">
          <h3 className="pr-card-title">
            <Target size={16} /> Area yang Perlu Diperkuat
          </h3>
          {focusAreas.length === 0 ? (
            <p className="pr-muted">
              Belum ada data. Kerjakan latihan grammar untuk melihat analisis area
              yang perlu ditingkatkan.
            </p>
          ) : (
            <ul className="pr-focus-list">
              {focusAreas.map((area) => (
                <li key={area.focus}>
                  <div className="pr-focus-head">
                    <strong>{area.focus}</strong>
                    <span className={`tone-text-${scoreTone(area.accuracy)}`}>
                      {area.accuracy}%
                    </span>
                  </div>
                  <div className="pr-bar-track">
                    <i
                      className={`tone-${scoreTone(area.accuracy)}`}
                      style={{ width: `${area.accuracy}%` }}
                    />
                  </div>
                  <small>
                    {area.correct}/{area.total} jawaban benar
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pr-card">
          <h3 className="pr-card-title">
            <BarChart3 size={16} /> Akurasi Grammar per Jenis Soal
          </h3>
          {!grammarSummary || grammarSummary.totals.attempts === 0 ? (
            <p className="pr-muted">Belum ada jawaban grammar yang tercatat.</p>
          ) : (
            <div className="pr-skill-list">
              {grammarSummary.byType.map((row) => (
                <div className="pr-skill-row" key={row.id}>
                  <div className="pr-skill-label">
                    <strong>{TYPE_LABELS[row.id] || row.id}</strong>
                    <small>{row.attempts} soal</small>
                  </div>
                  <div className="pr-bar-track">
                    <i
                      className={`tone-${scoreTone(row.accuracy)}`}
                      style={{ width: `${row.accuracy}%` }}
                    />
                  </div>
                  <strong className="pr-skill-score">{row.accuracy}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* RIWAYAT LATIHAN */}
      <section className="pr-card">
        <h3 className="pr-card-title">
          <Clock size={16} /> Riwayat Latihan Terbaru
        </h3>
        {history.length === 0 ? (
          <p className="pr-muted">
            Belum ada riwayat latihan. Mulai dari AI Speaking Partner, Grammar
            Practice, atau Pronunciation Lab.
          </p>
        ) : (
          <ul className="pr-history-list">
            {history.map((row) => (
              <li key={row.id} className="pr-history-row">
                <div className="pr-history-main">
                  <strong>{row.type}</strong>
                  <small>{row.detail}</small>
                </div>
                <span className="pr-history-date">
                  <Clock size={12} /> {row.date}
                </span>
                <span className="pr-history-score">{row.score || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
