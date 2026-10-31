import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Bot,
  BookOpen,
  Mic,
  TrendingUp,
  GraduationCap,
  FileText,
  UserRound
} from "lucide-react";

import { INITIAL_USER_STATS } from "../data/toeflData";
import { announcementsApi, sessionsApi, statsApi, progressApi } from "../utils/api";
import SpeakingPartner from "../components/SpeakingPartner";
import GrammarPractice from "./GrammarPractice";
import PronunciationLab from "./PronunciationLab";
import LearningProgress from "./LearningProgress";
import Materials from "./Materials";
import Profile from "./Profile";
import ToastNotification from "../components/ToastNotification";

import "./UserDashboard.css";

const LEVEL_LABELS = {
  beginner: "Beginner",
  pre_intermediate: "Pre-Intermediate",
  intermediate: "Intermediate"
};

const navigationItems = [
  { id: "dashboard", label: "Dashboard", english: "Overview", icon: LayoutDashboard },
  { id: "speaking", label: "AI Speaking Partner", english: "Practice Speaking", icon: MessageCircle, featured: true },
  { id: "grammar", label: "Grammar Practice", english: "Pilihan Ganda & Susun Kalimat", icon: BookOpen },
  { id: "pronunciation", label: "Pronunciation Lab", english: "Evaluasi Pelafalan AI", icon: Mic },
  { id: "materials", label: "Materi Instruktur", english: "Materi dari Admin", icon: FileText },
  { id: "progress", label: "Progres & Riwayat", english: "Learning History", icon: TrendingUp },
  { id: "profile", label: "Profil Saya", english: "Akun & Suara AI", icon: UserRound },
];

export default function UserDashboard({ onLogout, user }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState(null);

  // Status koneksi ke backend PHP + MySQL
  const [backendOnline, setBackendOnline] = useState(false);
  const [loadingBackend, setLoadingBackend] = useState(true);

  // Level belajar aktif (Beginner / Pre-Intermediate / Intermediate)
  const [level, setLevel] = useState("beginner");

  // Load stats from localStorage or initial
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem("toefl_user_stats");
      return saved ? JSON.parse(saved) : INITIAL_USER_STATS;
    } catch {
      return INITIAL_USER_STATS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => ({
    name: user?.name || "Pelajar",
    email: user?.email || "student@speaktoefl.ai",
    role: "user"
  }));

  // Notifikasi diturunkan dari data nyata (progres belajar & pengumuman admin)
  const [readNotifIds, setReadNotifIds] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Materi instruktur yang sedang dilatih di AI Speaking Partner
  const [practiceTopic, setPracticeTopic] = useState(null);

  // Persist stats
  useEffect(() => {
    try {
      localStorage.setItem("toefl_user_stats", JSON.stringify(stats));
    } catch {
      // Ignore
    }
  }, [stats]);

  // Tarik statistik belajar langsung dari MySQL
  useEffect(() => {
    let cancelled = false;

    statsApi
      .get()
      .then((data) => {
        if (cancelled) return;
        setBackendOnline(true);
        setLoadingBackend(false);
        if (!data?.stats) return;
        setStats((prev) => ({
          ...prev,
          ...data.stats,
          recentHistory: data.recentHistory?.length ? data.recentHistory : prev.recentHistory,
        }));
        if (data.stats.level) {
          setLevel(data.stats.level);
        }
      })
      .catch(() => {
        // Backend tidak aktif: tetap gunakan data lokal
        if (cancelled) return;
        setBackendOnline(false);
        setLoadingBackend(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Tarik pengumuman dari instruktur/admin agar muncul di lonceng notifikasi
  useEffect(() => {
    let cancelled = false;

    announcementsApi
      .list()
      .then((data) => {
        if (cancelled) return;
        setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : []);
      })
      .catch(() => {
        // Pengumuman tidak tersedia: notifikasi tetap memakai data progres sendiri
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function triggerToast(type, title, message) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000);
  }

  // Buka AI Speaking Partner dengan materi yang dibagikan instruktur
  function handlePracticeTopic(material) {
    setPracticeTopic(material);
    setActivePage("speaking");
    setMobileMenuOpen(false);
    triggerToast(
      "info",
      "Materi Instruktur Dimuat",
      `TOEFLy siap melatih topik "${material.title}".`
    );
  }

  // Sinkronkan identitas di sidebar/topbar setelah profil diperbarui
  function handleUserUpdate(partial) {
    setCurrentUser((prev) => ({ ...prev, ...partial }));
  }

  // Ganti level belajar: dipakai oleh pemilih level di topbar maupun halaman Progres.
  // Opsi `silent` dipakai ketika halaman Progres sudah mengirim permintaan PUT sendiri.
  async function handleLevelChange(nextLevel, nextLabel, options = {}) {
    if (!nextLevel || nextLevel === level) return;

    if (options.silent) {
      setLevel(nextLevel);
      setStats((prev) => ({ ...prev, level: nextLevel }));
      triggerToast(
        "success",
        "Level Belajar Diperbarui",
        `Sekarang berlatih di level ${nextLabel || LEVEL_LABELS[nextLevel]}.`
      );
      return;
    }

    try {
      const data = await progressApi.setLevel(nextLevel);
      const resolved = data?.level || nextLevel;
      setLevel(resolved);
      setStats((prev) => ({ ...prev, level: resolved }));
      triggerToast(
        "success",
        "Level Belajar Diperbarui",
        `Sekarang berlatih di level ${data?.levelLabel || LEVEL_LABELS[resolved]}.`
      );
    } catch (error) {
      triggerToast("error", "Gagal Mengubah Level", error.message);
    }
  }

  async function handleAddSession(newSession) {
    const optimistic = {
      id: "h_" + Date.now(),
      date: "Baru saja",
      type: newSession.type,
      detail: newSession.detail,
      score: newSession.score
    };

    setStats((prev) => ({
      ...prev,
      recentHistory: [optimistic, ...prev.recentHistory.slice(0, 9)]
    }));

    try {
      const result = await sessionsApi.create({
        type: newSession.type,
        detail: newSession.detail,
        score: newSession.score,
        durationSeconds: 300
      });

      setStats((prev) => ({
        ...prev,
        ...result?.stats,
        recentHistory: result?.session
          ? [result.session, ...prev.recentHistory.filter((h) => h.id !== optimistic.id)].slice(0, 10)
          : prev.recentHistory
      }));

      triggerToast("success", "Sesi Disimpan!", `${newSession.type} tersimpan ke database.`);
    } catch (error) {
      triggerToast("error", "Gagal Menyimpan Sesi", error.message);
    }
  }

  const activeNavItem = navigationItems.find((n) => n.id === activePage) || navigationItems[0];

  // Notifikasi nyata: diturunkan dari progres belajar pengguna
  const weeklyGoalTarget = Math.max(1, Number(stats.weeklyGoal) || 1);
  const weeklyDone = Math.max(0, Number(stats.weeklyCompleted) || 0);
  const weeklyRemaining = Math.max(0, weeklyGoalTarget - weeklyDone);

  const notifications = [
    // Pengumuman dari instruktur/admin tampil paling atas.
    ...announcements.map((item) => ({
      id: `announcement-${item.id}`,
      title: item.title,
      message: item.message,
      time: `Instruktur · ${item.created}`,
    })),
    {
      id: "weekly-goal",
      title: "Target Mingguan",
      message: weeklyDone >= weeklyGoalTarget
        ? `Selamat! Target ${weeklyGoalTarget} sesi minggu ini sudah tercapai.`
        : `Selesaikan ${weeklyRemaining} sesi lagi untuk memenuhi target mingguan Anda.`,
      time: "Minggu ini",
    },
    {
      id: "streak",
      title: "Ringkasan Latihan",
      message: `Anda telah menyelesaikan ${stats.practiceSessions} sesi latihan. Pertahankan momentum belajar!`,
      time: "Ringkasan",
    },
  ].map((item) => ({ ...item, read: readNotifIds.includes(item.id) }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="user-dashboard">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="user-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`user-sidebar ${mobileMenuOpen ? "user-sidebar-open" : ""}`}>
        {/* SATU KOTAK SIDEBAR — heading tetap, area navigasi bisa di-scroll sendiri */}
        <div className="user-sidebar-card">
          {/* HEADING: brand + tombol aksi (keluar & tutup) */}
          <div className="user-sidebar-head">
            <div className="user-sidebar-brand">
              <div className="user-sidebar-logo">
                <Bot size={24} />
              </div>
              <div>
                <strong>SpeakTOEFL <span>AI</span></strong>
                <small>Practice. Speak. Achieve.</small>
              </div>
            </div>

            <div className="user-sidebar-head-actions">
              <button
                type="button"
                className="user-head-action"
                onClick={onLogout}
                title="Keluar dari akun"
                aria-label="Keluar dari akun"
              >
                <LogOut size={18} />
              </button>
              <button
                type="button"
                className="user-mobile-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup navigasi"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* AREA NAVIGASI — hanya bagian ini yang di-scroll bila menu bertambah */}
          <div className="user-sidebar-scroll">
            <p className="user-sidebar-caption">NAVIGASI UTAMA / MAIN MENU</p>
            <nav className="user-navigation">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`user-nav-item ${isActive ? "user-nav-active" : ""} ${item.featured ? "user-nav-featured" : ""}`}
                    onClick={() => {
                      setActivePage(item.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon size={19} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.english}</small>
                    </span>
                    {item.featured && <span className="user-nav-ai-badge">AI LIVE</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="user-main-area">
        {/* TOPBAR */}
        <header className="user-topbar">
          <div className="user-topbar-left">
            <button
              type="button"
              className="user-mobile-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
            >
              <Menu size={22} />
            </button>
            <div className="user-breadcrumb">
              <span>SpeakTOEFL AI</span>
              <ChevronRight size={14} />
              <strong>{activeNavItem.label}</strong>
              <small className="breadcrumb-sub">({activeNavItem.english})</small>
            </div>
          </div>

          <div className="user-topbar-right">
            {/* PEMILIH LEVEL BELAJAR */}
            <label className="user-level-select" title="Pilih level belajar">
              <GraduationCap size={16} />
              <select
                value={level}
                onChange={(event) => handleLevelChange(event.target.value)}
                aria-label="Pilih level belajar"
              >
                {Object.entries(LEVEL_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {/* STATUS KONEKSI BACKEND */}
            <span className={`user-live-status ${backendOnline ? "" : "is-offline"}`}>
              <i />
              {loadingBackend
                ? "Menghubungkan ke MySQL..."
                : backendOnline
                ? "MySQL Terhubung"
                : "Mode Lokal (Backend Offline)"}
            </span>

            {/* NOTIFICATIONS DROPDOWN */}
            <div className="notif-wrapper">
              <button
                type="button"
                className="user-notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Pemberitahuan"
              >
                <Bell size={19} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <strong>Notifikasi ({unreadCount} baru)</strong>
                    <button
                      type="button"
                      className="mark-read-btn"
                      onClick={() => setReadNotifIds(notifications.map((n) => n.id))}
                      disabled={unreadCount === 0}
                    >
                      Tandai dibaca
                    </button>
                  </div>
                  <div className="notif-list">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.read ? "is-unread" : ""}`}
                      >
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <small>{n.time}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* IDENTITAS AKUN — nama + email disatukan di kanan atas */}
            <button
              type="button"
              className={`user-account-chip ${activePage === "profile" ? "is-active" : ""}`}
              onClick={() => {
                setActivePage("profile");
                setMobileMenuOpen(false);
              }}
              title="Buka Profil Saya"
            >
              <span className="user-account-avatar">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
              <span className="user-account-copy">
                <strong>{currentUser.name}</strong>
                <small>{currentUser.email}</small>
              </span>
              <ChevronRight size={15} className="user-account-chevron" />
            </button>
          </div>
        </header>

        {/* SUBPAGE CONTENT ROUTER */}
        <main className="user-page-container">
          {activePage === "dashboard" && (
            <div className="overview-page">
              {/* HERO WELCOME */}
              <section className="user-welcome-section">
                <div className="user-welcome-copy">
                  <span className="user-eyebrow">
                    HARI BARU, TARGET BARU / WELCOME BACK
                  </span>
                  <h1>Halo, {currentUser.name}!</h1>
                  <p>
                    Siap meningkatkan kemampuan speaking bahasa Inggris hari ini?
                    <br />
                    Mulai percakapan dengan <strong>TOEFLy</strong> dan pantau progres belajarmu di dashboard.
                  </p>
                  <div className="welcome-cta-row">
                    <button
                      type="button"
                      className="welcome-primary-btn"
                      onClick={() => setActivePage("speaking")}
                    >
                      <MessageCircle size={18} />
                      <span>Mulai Bicara dengan TOEFLy AI</span>
                    </button>
                  </div>
                </div>

                <div className="user-welcome-decoration">
                  <div className="welcome-mascot-card">
                    <div className="mascot-avatar-large">
                      <div className="mascot-robot-body">
                        <div className="robot-antenna"><span /></div>
                        <div className="robot-head">
                          <div className="robot-face">
                            <span className="robot-eye eye-left" />
                            <span className="robot-eye eye-right" />
                            <span className="robot-mouth" />
                          </div>
                        </div>
                        <div className="robot-chest"><span>T</span></div>
                      </div>
                    </div>
                    <strong>TOEFLy AI Partner</strong>
                    <span className="mascot-status-pill">
                      <i /> Online 24/7
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activePage === "speaking" && (
            <SpeakingPartner
              user={currentUser}
              topic={practiceTopic}
              onAddSession={handleAddSession}
            />
          )}

          {activePage === "grammar" && (
            <GrammarPractice
              level={level}
              levelLabel={LEVEL_LABELS[level] || "Beginner"}
              onAddSession={handleAddSession}
            />
          )}

          {activePage === "pronunciation" && (
            <PronunciationLab
              level={level}
              levelLabel={LEVEL_LABELS[level] || "Beginner"}
              onAddSession={handleAddSession}
            />
          )}

          {activePage === "materials" && (
            <Materials onPracticeTopic={handlePracticeTopic} onToast={triggerToast} />
          )}

          {activePage === "progress" && (
            <LearningProgress level={level} onLevelChange={handleLevelChange} />
          )}

          {activePage === "profile" && (
            <Profile
              user={currentUser}
              onUserUpdate={handleUserUpdate}
              onToast={triggerToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}
