import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  GraduationCap,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { studentsApi } from "../utils/api";

// Filter level belajar siswa
const LEVEL_OPTIONS = [
  { id: "all", label: "Semua Level" },
  { id: "beginner", label: "Beginner" },
  { id: "pre_intermediate", label: "Pre-Intermediate" },
  { id: "intermediate", label: "Intermediate" },
];

// Interval penyegaran otomatis (real-time) dalam milidetik.
const AUTO_REFRESH_MS = 20000;

function scoreTone(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

function formatClock(date) {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Pemantauan progres belajar siswa untuk administrator / instruktur.
 * Seluruh angka berasal dari database melalui endpoint /api/students.
 */
export default function StudentProgress({ onToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadStudents(options = {}) {
    const { silent = false } = options;
    if (!silent) setLoading(true);

    try {
      const data = await studentsApi.list();
      setStudents(Array.isArray(data?.students) ? data.students : []);
      setLastUpdated(new Date());
    } catch (error) {
      // Penyegaran otomatis yang gagal tidak mengganggu tampilan data terakhir.
      if (!silent) onToast?.("error", "Gagal Memuat Data Siswa", error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Muat pertama kali, lalu segarkan otomatis agar progres selalu terbaru.
  useEffect(() => {
    loadStudents();

    const timer = setInterval(() => {
      loadStudents({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchLevel = levelFilter === "all" || student.level === levelFilter;
      const matchKeyword =
        !keyword ||
        student.name.toLowerCase().includes(keyword) ||
        student.email.toLowerCase().includes(keyword);

      return matchLevel && matchKeyword;
    });
  }, [students, search, levelFilter]);

  const summary = useMemo(() => {
    const scored = students.filter((student) => Number(student.overallScore) > 0);
    const averageScore = scored.length
      ? Math.round(scored.reduce((sum, s) => sum + Number(s.overallScore), 0) / scored.length)
      : 0;

    return {
      total: students.length,
      averageScore,
      sessions: students.reduce((sum, s) => sum + Number(s.practiceSessions || 0), 0),
      active: students.filter((student) => Number(student.practiceSessions) > 0).length,
    };
  }, [students]);

  async function openDetail(student) {
    setDetail({ user: student, progress: null });
    setLoadingDetail(true);
    try {
      const data = await studentsApi.detail(student.id);
      setDetail(data);
    } catch (error) {
      setDetail(null);
      onToast?.("error", "Gagal Memuat Rincian", error.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="admin-page-content">
      {/* RINGKASAN ANGKA */}
      <div className="admin-stat-grid">
        <article className="admin-stat-card">
          <div className="stat-card-header">
            <span className="admin-stat-icon stat-blue"><Users size={20} /></span>
            <span className="trend-badge">Terdaftar</span>
          </div>
          <p>Total Siswa Dipantau</p>
          <strong>{summary.total} <span>siswa</span></strong>
          <small>{summary.active} siswa sudah pernah berlatih</small>
        </article>

        <article className="admin-stat-card">
          <div className="stat-card-header">
            <span className="admin-stat-icon stat-purple"><TrendingUp size={20} /></span>
            <span className="trend-badge">Rata-rata</span>
          </div>
          <p>Skor Keseluruhan Kelas</p>
          <strong>{summary.averageScore} <span>/ 100</span></strong>
          <small>Dihitung dari Speaking, Grammar, dan Pronunciation</small>
        </article>

        <article className="admin-stat-card">
          <div className="stat-card-header">
            <span className="admin-stat-icon stat-cyan"><Activity size={20} /></span>
            <span className="trend-badge">Akumulatif</span>
          </div>
          <p>Total Sesi Latihan</p>
          <strong>{summary.sessions} <span>sesi</span></strong>
          <small>Seluruh aktivitas latihan mandiri siswa</small>
        </article>

        <article className="admin-stat-card">
          <div className="stat-card-header">
            <span className="admin-stat-icon stat-orange"><Target size={20} /></span>
            <span className="trend-badge">Skor ≥ 75</span>
          </div>
          <p>Siswa Siap Ujian</p>
          <strong>
            {students.filter((student) => Number(student.overallScore) >= 75).length}
            <span> siswa</span>
          </strong>
          <small>Peserta dengan performa di atas ambang baik</small>
        </article>
      </div>

      {/* TOOLBAR */}
      <div className="panel-toolbar">
        <div className="search-and-filters">
          <div className="admin-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari nama atau email siswa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
          >
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-actions">
          <span className="live-refresh-note">
            <i />
            {lastUpdated
              ? `Diperbarui ${formatClock(lastUpdated)} · otomatis tiap 20 dtk`
              : "Menunggu data terbaru..."}
          </span>
          <button
            type="button"
            className="add-btn"
            onClick={() => loadStudents()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            <span>{loading ? "Memuat..." : "Muat Ulang"}</span>
          </button>
        </div>
      </div>

      {/* TABEL PROGRES */}
      <div className="admin-table-wrap">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Level Aktif</th>
              <th>Skor</th>
              <th>Sesi</th>
              <th>Menit Belajar</th>
              <th>Soal Dijawab</th>
              <th>Rekaman Dinilai</th>
              <th>Latihan Terakhir</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td>
                  <div className="table-user-cell">
                    <span className="user-circle">{student.name.charAt(0)}</span>
                    <div>
                      <strong>{student.name}</strong>
                      <small>{student.email}</small>
                    </div>
                  </div>
                </td>
                <td><span className="role-tag">{student.levelLabel}</span></td>
                <td>
                  <span className={`score-pill score-${scoreTone(Number(student.overallScore))}`}>
                    {student.overallScore}
                  </span>
                </td>
                <td><strong>{student.practiceSessions}</strong></td>
                <td>{student.studyMinutes} menit</td>
                <td>{student.questionsAnswered}</td>
                <td>{student.recordingsScored}</td>
                <td>{student.lastPractice}</td>
                <td>
                  <button
                    type="button"
                    className="status-toggle-btn"
                    onClick={() => openDetail(student)}
                  >
                    Lihat Detail
                  </button>
                </td>
              </tr>
            ))}

            {!loading && filteredStudents.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <p className="admin-empty-note">
                    Belum ada siswa yang cocok dengan filter ini.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* RINCIAN PROGRES SISWA */}
      {detail && (
        <div className="admin-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="admin-modal-card student-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{detail.user?.name}</h3>
                <p className="student-modal-sub">{detail.user?.email}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Tutup rincian">
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <p className="admin-empty-note">Memuat rincian progres siswa...</p>
            ) : detail.progress ? (
              <div className="student-detail">
                <div className="student-detail-stats">
                  <div>
                    <small>Level Belajar</small>
                    <strong><GraduationCap size={14} /> {detail.progress.levelLabel}</strong>
                  </div>
                  <div>
                    <small>Skor Keseluruhan</small>
                    <strong>{detail.progress.totals.overallScore} / 100</strong>
                  </div>
                  <div>
                    <small>Total Sesi</small>
                    <strong>{detail.progress.totals.practiceSessions} sesi</strong>
                  </div>
                  <div>
                    <small>Rentetan Belajar</small>
                    <strong>{detail.progress.totals.learningStreak} hari</strong>
                  </div>
                </div>

                <h4 className="student-detail-title">Kemampuan per Area</h4>
                <div className="skill-benchmark-bars">
                  {detail.progress.skills.map((skill) => (
                    <div className="benchmark-row" key={skill.id}>
                      <div className="benchmark-label">
                        <strong>{skill.label}</strong>
                        <span>
                          skor {skill.averageScore} · {skill.sessions} latihan
                        </span>
                      </div>
                      <div className="benchmark-track">
                        <div className="benchmark-fill" style={{ width: `${skill.averageScore}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {detail.progress.focusAreas.length > 0 && (
                  <>
                    <h4 className="student-detail-title">Area yang Perlu Diperkuat</h4>
                    <div className="student-focus-list">
                      {detail.progress.focusAreas.map((area) => (
                        <span key={area.focus} className="student-focus-tag">
                          {area.focus} · {area.accuracy}%
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <h4 className="student-detail-title">Riwayat Latihan Terakhir</h4>
                <div className="student-history-list">
                  {detail.progress.recentHistory.slice(0, 8).map((item) => (
                    <div className="student-history-item" key={item.id}>
                      <div>
                        <strong>{item.type}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <div className="student-history-score">
                        <span>{item.score}</span>
                        <small>{item.date}</small>
                      </div>
                    </div>
                  ))}

                  {detail.progress.recentHistory.length === 0 && (
                    <p className="admin-empty-note">Siswa ini belum memiliki riwayat latihan.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
