import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  X,
  RotateCcw,
  Loader2,
  ArrowRight,
  Trophy,
  Lightbulb,
  Target
} from "lucide-react";

import { grammarApi } from "../utils/api";

import "./PracticeRoom.css";

const TYPE_FILTERS = [
  { id: "mixed", label: "Campuran" },
  { id: "multiple_choice", label: "Pilihan Ganda" },
  { id: "true_false", label: "Benar / Salah" },
  { id: "sentence_arrange", label: "Susun Kalimat" }
];

const TYPE_LABELS = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar / Salah",
  sentence_arrange: "Susun Kalimat"
};

const OPTION_KEYS = ["A", "B", "C", "D", "E"];
const ROUND_SIZE = 6;

export default function GrammarPractice({
  level = "beginner",
  levelLabel = "Beginner",
  onAddSession
}) {
  const [phase, setPhase] = useState("idle"); // idle | loading | playing | done
  const [typeFilter, setTypeFilter] = useState("mixed");
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [picked, setPicked] = useState([]); // indeks token untuk soal susun kalimat
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState([]); // { correct } tiap soal ronde ini
  const [summary, setSummary] = useState(null);

  const current = items[index] || null;

  const loadSummary = useCallback(() => {
    grammarApi
      .summary()
      .then((data) => setSummary(data?.totals || null))
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Ganti level: kembalikan tampilan ke layar awal agar bank soal disesuaikan.
  useEffect(() => {
    setPhase("idle");
    setItems([]);
    setIndex(0);
    setResult(null);
    setSelected("");
    setPicked([]);
    setError("");
    setAnswers([]);
  }, [level]);

  // Reset pilihan setiap kali soal berganti.
  useEffect(() => {
    setSelected("");
    setPicked([]);
    setResult(null);
  }, [current?.id]);

  async function startRound() {
    setPhase("loading");
    setError("");
    try {
      const data = await grammarApi.items({
        level,
        type: typeFilter === "mixed" ? undefined : typeFilter,
        limit: ROUND_SIZE
      });
      const list = Array.isArray(data?.items) ? data.items : [];
      if (!list.length) {
        setPhase("idle");
        setError("Bank soal untuk level ini masih kosong. Coba pilih level lain.");
        return;
      }
      setItems(list);
      setIndex(0);
      setAnswers([]);
      setPhase("playing");
    } catch (err) {
      setPhase("idle");
      setError(err.message || "Gagal memuat soal. Periksa koneksi ke backend.");
    }
  }

  async function submitAnswer() {
    if (!current || submitting || result) return;

    const answer =
      current.type === "sentence_arrange"
        ? picked.map((i) => current.tokens[i]).join(" ")
        : selected;

    if (!answer.trim()) {
      setError("Pilih jawaban terlebih dahulu sebelum mengirim.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const data = await grammarApi.submit({ itemId: current.id, answer });
      setResult(data);
      setAnswers((prev) => [...prev, { correct: Boolean(data?.correct) }]);
      if (data?.summary) setSummary(data.summary);
    } catch (err) {
      setError(err.message || "Gagal mengirim jawaban. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (index + 1 < items.length) {
      setIndex((prev) => prev + 1);
      return;
    }
    finishRound();
  }

  function finishRound() {
    const total = answers.length;
    const correct = answers.filter((a) => a.correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    setPhase("done");
    loadSummary();

    if (typeof onAddSession === "function") {
      try {
        Promise.resolve(
          onAddSession({
            type: "Grammar Practice",
            detail: `Level ${levelLabel} • ${total} soal`,
            score: `${accuracy}/100`
          })
        ).catch(() => {});
      } catch {
        // Gagal menyimpan riwayat tidak menghentikan latihan.
      }
    }
  }

  const answeredCount = answers.length;
  const progressPct = items.length ? Math.round((answeredCount / items.length) * 100) : 0;
  const correctSoFar = answers.filter((a) => a.correct).length;

  /* ----------------------------- RENDER ----------------------------- */

  if (phase === "idle" || phase === "loading") {
    return (
      <div className="pr-page">
        <header className="pr-page-head">
          <div>
            <span className="pr-eyebrow">GRAMMAR PRACTICE / LATIHAN TATA BAHASA</span>
            <h1>Grammar Practice</h1>
            <p>
              Latihan pilihan ganda, benar/salah, dan menyusun kalimat dengan koreksi
              otomatis serta pembahasan langsung dari AI.
            </p>
          </div>
          <span className="pr-level-badge">{levelLabel}</span>
        </header>

        <section className="pr-card pr-center-card">
          <div className="pr-hero-icon">
            <BookOpen size={26} />
          </div>
          <h2>Siap menguji tata bahasamu?</h2>
          <p className="pr-muted">
            Satu ronde berisi {ROUND_SIZE} soal acak dari bank soal level{" "}
            <strong>{levelLabel}</strong>.
          </p>

          <div className="pr-chip-row" role="group" aria-label="Jenis soal">
            {TYPE_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`pr-chip ${typeFilter === option.id ? "is-active" : ""}`}
                onClick={() => setTypeFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {summary && (
            <div className="pr-mini-stats">
              <div>
                <strong>{summary.answered}</strong>
                <span>Soal dijawab</span>
              </div>
              <div>
                <strong>{summary.correct}</strong>
                <span>Jawaban benar</span>
              </div>
              <div>
                <strong>{summary.accuracy}%</strong>
                <span>Akurasi total</span>
              </div>
            </div>
          )}

          {error && <p className="pr-error">{error}</p>}

          <button
            type="button"
            className="pr-primary-btn"
            onClick={startRound}
            disabled={phase === "loading"}
          >
            {phase === "loading" ? (
              <>
                <Loader2 size={18} className="pr-spin" /> Menyiapkan soal...
              </>
            ) : (
              <>
                Mulai Latihan <ArrowRight size={18} />
              </>
            )}
          </button>
        </section>
      </div>
    );
  }

  if (phase === "done") {
    const total = answers.length;
    const correct = answers.filter((a) => a.correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="pr-page">
        <header className="pr-page-head">
          <div>
            <span className="pr-eyebrow">GRAMMAR PRACTICE / HASIL</span>
            <h1>Ronde Selesai</h1>
          </div>
          <span className="pr-level-badge">{levelLabel}</span>
        </header>

        <section className="pr-card pr-center-card">
          <div className="pr-score-ring" style={{ "--pr-pct": `${accuracy}%` }}>
            <div className="pr-score-ring-inner">
              <strong>{accuracy}%</strong>
              <span>Akurasi</span>
            </div>
          </div>

          <h2>
            {accuracy >= 80
              ? "Kerja bagus!"
              : accuracy >= 50
              ? "Bagus, terus berlatih!"
              : "Jangan menyerah, coba lagi!"}
          </h2>
          <p className="pr-muted">
            Kamu menjawab <strong>{correct}</strong> benar dari <strong>{total}</strong> soal.
          </p>

          <div className="pr-mini-stats">
            <div>
              <strong>{correct}</strong>
              <span>Benar</span>
            </div>
            <div>
              <strong>{total - correct}</strong>
              <span>Salah</span>
            </div>
            <div>
              <strong>{summary?.accuracy ?? accuracy}%</strong>
              <span>Akurasi total</span>
            </div>
          </div>

          <div className="pr-done-actions">
            <button type="button" className="pr-primary-btn" onClick={startRound}>
              <RotateCcw size={18} /> Latihan Lagi
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* phase === "playing" */
  const isArranged = current.type === "sentence_arrange";
  const usedIndexes = new Set(picked);

  return (
    <div className="pr-page">
      <header className="pr-page-head">
        <div>
          <span className="pr-eyebrow">
            SOAL {index + 1} DARI {items.length} /{" "}
            {TYPE_LABELS[current.type] || "Latihan"}
          </span>
          <h1>{levelLabel} Grammar</h1>
        </div>
        <span className="pr-level-badge">
          <Target size={14} /> {correctSoFar} benar
        </span>
      </header>

      <div className="pr-progress-track" aria-hidden="true">
        <span style={{ width: `${progressPct}%` }} />
      </div>

      <section className="pr-card pr-question-card">
        <div className="pr-question-meta">
          <span className="pr-focus-tag">{current.focus}</span>
          <span className="pr-type-tag">{TYPE_LABELS[current.type] || current.type}</span>
        </div>

        <p className="pr-question-prompt">{current.prompt}</p>

        {current.type === "multiple_choice" && (
          <div className="pr-options">
            {current.options.map((option, i) => {
              const isPicked = selected === option;
              const isAnswer = result && option === result.correctAnswer;
              const isWrongPick = result && isPicked && !result.correct;
              return (
                <button
                  key={`${option}-${i}`}
                  type="button"
                  className={`pr-option ${isPicked ? "is-picked" : ""} ${
                    isAnswer ? "is-correct" : ""
                  } ${isWrongPick ? "is-wrong" : ""}`}
                  onClick={() => !result && setSelected(option)}
                  disabled={Boolean(result)}
                >
                  <span className="pr-option-key">{OPTION_KEYS[i] || i + 1}</span>
                  <span className="pr-option-text">{option}</span>
                  {isAnswer && <Check size={17} />}
                  {isWrongPick && <X size={17} />}
                </button>
              );
            })}
          </div>
        )}

        {current.type === "true_false" && (
          <div className="pr-truefalse">
            {["Benar", "Salah"].map((option) => {
              const isPicked = selected === option;
              const isAnswer = result && option === result.correctAnswer;
              const isWrongPick = result && isPicked && !result.correct;
              return (
                <button
                  key={option}
                  type="button"
                  className={`pr-tf-btn ${isPicked ? "is-picked" : ""} ${
                    isAnswer ? "is-correct" : ""
                  } ${isWrongPick ? "is-wrong" : ""}`}
                  onClick={() => !result && setSelected(option)}
                  disabled={Boolean(result)}
                >
                  {option === "Benar" ? <Check size={20} /> : <X size={20} />}
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {isArranged && (
          <div className="pr-arrange">
            <div className="pr-arrange-answer">
              {picked.length === 0 ? (
                <span className="pr-arrange-placeholder">
                  Ketuk kata di bawah untuk menyusun kalimat...
                </span>
              ) : (
                picked.map((tokenIndex) => (
                  <button
                    key={`picked-${tokenIndex}`}
                    type="button"
                    className="pr-token is-picked"
                    onClick={() =>
                      !result &&
                      setPicked((prev) => prev.filter((i) => i !== tokenIndex))
                    }
                    disabled={Boolean(result)}
                  >
                    {current.tokens[tokenIndex]}
                  </button>
                ))
              )}
            </div>

            <div className="pr-arrange-bank">
              {current.tokens.map((token, tokenIndex) => (
                <button
                  key={`token-${tokenIndex}`}
                  type="button"
                  className="pr-token"
                  onClick={() =>
                    !result && setPicked((prev) => [...prev, tokenIndex])
                  }
                  disabled={usedIndexes.has(tokenIndex) || Boolean(result)}
                >
                  {token}
                </button>
              ))}
            </div>

            {!result && picked.length > 0 && (
              <button
                type="button"
                className="pr-text-btn"
                onClick={() => setPicked([])}
              >
                <RotateCcw size={14} /> Susun ulang
              </button>
            )}
          </div>
        )}
      </section>

      {result && (
        <section className={`pr-feedback ${result.correct ? "is-good" : "is-bad"}`}>
          <div className="pr-feedback-head">
            {result.correct ? <Check size={18} /> : <X size={18} />}
            <strong>{result.correct ? "Jawaban Benar!" : "Belum Tepat"}</strong>
          </div>
          {!result.correct && (
            <p className="pr-feedback-answer">
              Jawaban benar: <strong>{result.correctAnswer}</strong>
            </p>
          )}
          {result.explanation && (
            <p className="pr-feedback-text">
              <Lightbulb size={15} /> {result.explanation}
            </p>
          )}
        </section>
      )}

      {error && <p className="pr-error">{error}</p>}

      <div className="pr-action-row">
        {!result ? (
          <button
            type="button"
            className="pr-primary-btn"
            onClick={submitAnswer}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="pr-spin" /> Memeriksa...
              </>
            ) : (
              <>
                Kirim Jawaban <Check size={18} />
              </>
            )}
          </button>
        ) : (
          <button type="button" className="pr-primary-btn" onClick={nextQuestion}>
            {index + 1 < items.length ? (
              <>
                Soal Berikutnya <ArrowRight size={18} />
              </>
            ) : (
              <>
                <Trophy size={18} /> Lihat Hasil
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
