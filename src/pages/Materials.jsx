import { useEffect, useMemo, useState } from "react";
import { BookOpen, Mic, RefreshCw } from "lucide-react";

import { contentApi } from "../utils/api";

const SECTIONS = ["Semua", "Speaking", "Reading", "Listening", "Writing"];

// Materi dianggap baru bila diperbarui dalam 7 hari terakhir.
const NEW_WINDOW_DAYS = 7;

function isNewMaterial(item) {
  if (!item?.updatedAt) return false;
  const updated = new Date(item.updatedAt).getTime();
  if (!Number.isFinite(updated)) return false;

  return Date.now() - updated < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Halaman siswa: materi & soal yang dibagikan instruktur/admin.
 * Materi bagian Speaking bisa langsung dilatih bersama TOEFLy.
 */
export default function Materials({ onPracticeTopic, onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("Semua");
  const [expandedId, setExpandedId] = useState(null);

  async function loadMaterials() {
    setLoading(true);
    try {
      const data = await contentApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      onToast?.("error", "Gagal Memuat Materi", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const map = { Semua: items.length };
    SECTIONS.slice(1).forEach((section) => {
      map[section] = items.filter((item) => item.section === section).length;
    });
    return map;
  }, [items]);

  const visibleItems = useMemo(
    () => (activeSection === "Semua"
      ? items
      : items.filter((item) => item.section === activeSection)),
    [items, activeSection]
  );

  const newCount = items.filter(isNewMaterial).length;

  return (
    <div className="materials-page">
      <header className="materials-head">
        <div>
          <h2>Materi dari Instruktur</h2>
          <p>
            Materi dan soal yang dibagikan admin langsung tersedia di sini.
            Materi bagian Speaking bisa langsung dilatih bersama TOEFLy.
          </p>
        </div>

        <button
          type="button"
          className="materials-refresh-btn"
          onClick={loadMaterials}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "materials-spin" : ""} />
          <span>{loading ? "Memuat..." : "Muat Ulang"}</span>
        </button>
      </header>

      {newCount > 0 && (
        <div className="materials-banner">
          <BookOpen size={15} />
          <span>
            {newCount} materi baru dari instruktur minggu ini — silakan dicoba.
          </span>
        </div>
      )}

      <div className="materials-filters">
        {SECTIONS.map((section) => (
          <button
            key={section}
            type="button"
            className={`materials-filter-btn ${activeSection === section ? "is-active" : ""}`}
            onClick={() => setActiveSection(section)}
          >
            {section}
            <span>{counts[section] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && items.length === 0 && (
        <p className="materials-empty">Memuat materi dari server...</p>
      )}

      {!loading && visibleItems.length === 0 && (
        <p className="materials-empty">
          {items.length === 0
            ? "Instruktur belum membagikan materi. Silakan periksa kembali nanti."
            : "Tidak ada materi pada bagian ini."}
        </p>
      )}

      <div className="materials-grid">
        {visibleItems.map((item) => {
          const expanded = expandedId === item.id;
          const hasPrompt = Boolean(item.prompt);

          return (
            <article className="material-card" key={item.id}>
              <div className="material-card-top">
                <span className={`material-section-tag is-${item.section.toLowerCase()}`}>
                  {item.section}
                </span>
                <span className="material-diff-tag">{item.difficulty}</span>
                {isNewMaterial(item) && <span className="material-new-tag">Baru</span>}
              </div>

              <h3>{item.title}</h3>
              <p className="material-category">{item.category}</p>

              {hasPrompt && (
                <p className={`material-prompt ${expanded ? "" : "is-clamped"}`}>
                  {item.prompt}
                </p>
              )}

              {!hasPrompt && (
                <p className="material-prompt is-empty">
                  Instruktur belum menambahkan isi materi untuk item ini.
                </p>
              )}

              <div className="material-card-foot">
                <small>Diperbarui {item.updated}</small>

                {item.section === "Speaking" ? (
                  <button
                    type="button"
                    className="material-practice-btn"
                    onClick={() => onPracticeTopic?.(item)}
                  >
                    <Mic size={14} />
                    <span>Latih dengan TOEFLy</span>
                  </button>
                ) : hasPrompt ? (
                  <button
                    type="button"
                    className="material-secondary-btn"
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                  >
                    {expanded ? "Sembunyikan" : "Baca materi"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
