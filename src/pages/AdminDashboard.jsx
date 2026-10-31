import { useState, useEffect } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BarChart3,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  UserPlus,
  Plus,
  Trash2,
  Download,
  X
} from "lucide-react";

import ToastNotification from "../components/ToastNotification";
import StudentProgress from "./StudentProgress";
import AdminAnnouncements from "./AdminAnnouncements";
import { aiApi, contentApi, usersApi } from "../utils/api";
import "./AdminDashboard.css";

const adminNavigation = [
  { id: "overview", title: "Ringkasan", english: "Overview", icon: LayoutDashboard },
  { id: "users", title: "Pengguna", english: "User Management", icon: Users },
  { id: "students", title: "Progres Siswa", english: "Student Progress", icon: TrendingUp },
  { id: "content", title: "Materi TOEFL", english: "TOEFL Content Bank", icon: BookOpen },
  { id: "announcements", title: "Pengumuman", english: "Announcements", icon: Megaphone },
  { id: "reports", title: "Laporan & Analitik", english: "Analytics & Reports", icon: BarChart3 },
];

export default function AdminDashboard({ onLogout, user }) {
  const [activePage, setActivePage] = useState("overview");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminName = user?.name || "Administrator";
  const adminEmail = user?.email || "admin@speaktoefl.ai";
  const current = adminNavigation.find((item) => item.id === activePage) || adminNavigation[0];

  // Daftar pengguna & materi — sepenuhnya berasal dari database (tanpa data contoh)
  const [usersList, setUsersList] = useState([]);
  const [contentList, setContentList] = useState([]);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Pelajar / Student", status: "Aktif" });

  const [contentSectionFilter, setContentSectionFilter] = useState("all");
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [newContent, setNewContent] = useState({ title: "", section: "Speaking", category: "Task 1", difficulty: "Intermediate", prompt: "" });

  // Status koneksi ke backend PHP + MySQL
  const [backendOnline, setBackendOnline] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  // Status engine AI (Gemini) — diambil langsung dari endpoint ai/status
  const [aiStatus, setAiStatus] = useState({ configured: false, model: "" });

  // Muat pengguna, materi, dan status AI langsung dari backend saat halaman dibuka
  useEffect(() => {
    let cancelled = false;

    async function loadFromBackend() {
      try {
        const [remoteUsers, remoteContent] = await Promise.all([
          usersApi.list(),
          contentApi.list(),
        ]);
        if (cancelled) return;

        if (Array.isArray(remoteUsers)) setUsersList(remoteUsers);
        if (Array.isArray(remoteContent)) setContentList(remoteContent);
        setBackendOnline(true);
      } catch {
        if (!cancelled) setBackendOnline(false);
      } finally {
        if (!cancelled) setLoadingData(false);
      }

      try {
        const status = await aiApi.status();
        if (!cancelled && status) setAiStatus(status);
      } catch {
        // Status AI tidak tersedia: biarkan nilai default
      }
    }

    loadFromBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- Statistik nyata dihitung dari data backend ---------------- */
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter((u) => u.status === "Aktif").length;
  const totalSessions = usersList.reduce((sum, u) => sum + (Number(u.practiceCount) || 0), 0);
  const avgSessionsPerUser = totalUsers ? Math.round((totalSessions / totalUsers) * 10) / 10 : 0;
  const totalContent = contentList.length;
  const topUser = usersList.reduce(
    (best, u) => ((Number(u.practiceCount) || 0) > (Number(best?.practiceCount) || 0) ? u : best),
    null
  );

  // Distribusi pengguna berdasarkan jumlah sesi latihan
  const sessionBuckets = [
    { label: "Belum pernah latihan", test: (n) => n === 0 },
    { label: "1 - 9 sesi", test: (n) => n >= 1 && n <= 9 },
    { label: "10 - 29 sesi", test: (n) => n >= 10 && n <= 29 },
    { label: "30+ sesi", test: (n) => n >= 30 },
  ].map((bucket) => ({
    label: bucket.label,
    count: usersList.filter((u) => bucket.test(Number(u.practiceCount) || 0)).length,
  }));
  const maxBucketCount = Math.max(1, ...sessionBuckets.map((b) => b.count));

  // Sebaran bank materi per bagian TOEFL
  const contentBySection = ["Speaking", "Reading", "Listening", "Writing"].map((section) => ({
    section,
    count: contentList.filter((c) => c.section === section).length,
  }));

  // Log aktivitas nyata: pendaftaran pengguna terbaru + materi terbaru
  const activityLog = [
    ...[...usersList]
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 2)
      .map((u) => ({
        id: `user-${u.id}`,
        tone: "dot-blue",
        title: `Pengguna baru terdaftar: ${u.name}`,
        detail: `${u.roleLabel || u.role} · ${u.status} · ${u.practiceCount || 0} sesi latihan`,
        time: u.joined,
      })),
    ...contentList.slice(0, 2).map((c) => ({
      id: `content-${c.id}`,
      tone: "dot-green",
      title: `Materi ditambahkan: ${c.title}`,
      detail: `${c.section} · ${c.category} · ${c.difficulty}`,
      time: c.updated,
    })),
  ];

  function triggerToast(type, title, message) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3500);
  }

  // Unduh laporan analitik (data nyata dari database) sebagai berkas CSV
  function handleExportReport() {
    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ["Metrik", "Nilai"],
      ["Total Pengguna", totalUsers],
      ["Pengguna Aktif", activeUsers],
      ["Total Sesi Latihan", totalSessions],
      ["Rata-rata Sesi / Pengguna", avgSessionsPerUser],
      ["Total Bank Materi", totalContent],
      [],
      ["Pengguna Paling Aktif", topUser ? topUser.name : "-"],
      ["Sesi Pengguna Paling Aktif", topUser ? topUser.practiceCount : 0],
      [],
      ["Distribusi Sesi Latihan", "Jumlah Pengguna"],
      ...sessionBuckets.map((b) => [b.label, b.count]),
      [],
      ["Bank Materi per Bagian", "Jumlah"],
      ...contentBySection.map((c) => [c.section, c.count]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "laporan-analitik-speaktoefl.csv";
    link.click();
    URL.revokeObjectURL(url);
    triggerToast("success", "Laporan Diunduh", "File CSV rangkuman analitik dari database berhasil disimpan.");
  }

  // User Actions — semua perubahan langsung ditulis ke MySQL
  async function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;

    const draft = {
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role,
      status: newUser.status,
    };

    try {
      const created = await usersApi.create(draft);
      setUsersList((prev) => [...prev, created]);
      triggerToast("success", "Pengguna Ditambahkan", `${created.name} berhasil didaftarkan ke database.`);
    } catch (error) {
      triggerToast("error", "Gagal Menambahkan", error.message);
      return;
    }

    setShowAddUserModal(false);
    setNewUser({ name: "", email: "", role: "Pelajar / Student", status: "Aktif" });
  }

  async function toggleUserStatus(userId) {
    const target = usersList.find((u) => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === "Aktif" ? "Ditangguhkan" : "Aktif";

    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );

    try {
      await usersApi.updateStatus(userId, nextStatus);
      triggerToast("info", "Status Diubah", `Status akun ${target.name} kini ${nextStatus}.`);
    } catch (error) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: target.status } : u))
      );
      triggerToast("error", "Gagal Mengubah Status", error.message);
    }
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Hapus pengguna "${userName}" secara permanen?`)) return;

    try {
      await usersApi.remove(userId);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      triggerToast("info", "Pengguna Dihapus", `Akun ${userName} berhasil dihapus dari database.`);
    } catch (error) {
      triggerToast("error", "Gagal Menghapus", error.message);
    }
  }

  // Content Actions — langsung tersimpan ke MySQL
  async function handleAddContent(e) {
    e.preventDefault();
    if (!newContent.title.trim()) return;

    try {
      const created = await contentApi.create({
        title: newContent.title.trim(),
        section: newContent.section,
        category: newContent.category,
        difficulty: newContent.difficulty,
        prompt: newContent.prompt.trim(),
      });
      setContentList((prev) => [created, ...prev]);
      triggerToast("success", "Materi Ditambahkan", `Materi "${created.title}" tersimpan di bank soal.`);
    } catch (error) {
      triggerToast("error", "Gagal Menyimpan Materi", error.message);
      return;
    }

    setShowAddContentModal(false);
    setNewContent({ title: "", section: "Speaking", category: "Task 1", difficulty: "Intermediate", prompt: "" });
  }

  async function handleDeleteContent(cId, cTitle) {
    if (!window.confirm(`Hapus materi "${cTitle}"?`)) return;

    try {
      await contentApi.remove(cId);
      setContentList((prev) => prev.filter((c) => c.id !== cId));
      triggerToast("info", "Materi Dihapus", `Materi ${cTitle} berhasil dihapus.`);
    } catch (error) {
      triggerToast("error", "Gagal Menghapus", error.message);
    }
  }

  // Filtered Users
  const filteredUsers = usersList.filter((item) => {
    const matchSearch = `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || (item.roleLabel || item.role || "").includes(roleFilter);
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  // Filtered Content
  const filteredContent = contentList.filter((item) => {
    return contentSectionFilter === "all" || item.section === contentSectionFilter;
  });

  return (
    <main className="admin-dashboard">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? "admin-sidebar-open" : ""}`}>
        {/* SATU KOTAK SIDEBAR — heading tetap, area navigasi bisa di-scroll sendiri */}
        <div className="admin-sidebar-card">
          {/* HEADING: brand + tombol aksi (keluar & tutup) */}
          <div className="admin-sidebar-head">
            <div className="admin-brand">
              <span className="admin-brand-icon"><ShieldCheck size={24} /></span>
              <div>
                <strong>SpeakTOEFL <em>AI</em></strong>
                <small>ADMIN CONTROL PANEL</small>
              </div>
            </div>

            <div className="admin-sidebar-head-actions">
              <button
                type="button"
                className="admin-head-action"
                onClick={onLogout}
                title="Keluar dari Panel Admin"
                aria-label="Keluar dari Panel Admin"
              >
                <LogOut size={18} />
              </button>
              <button
                type="button"
                className="admin-mobile-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup navigasi"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* AREA NAVIGASI — hanya bagian ini yang di-scroll bila menu bertambah */}
          <div className="admin-sidebar-scroll">
            <p className="admin-nav-label">NAVIGASI ADMIN / MANAGEMENT</p>
            <nav className="admin-nav">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`admin-nav-item ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      setActivePage(item.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon size={18} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.english}</small>
                    </span>
                    {isActive && <ChevronRight size={15} className="nav-arrow" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* FOOTER: informasi akun pengguna */}
          <div className="admin-profile">
            <span className="admin-avatar">{adminName.charAt(0).toUpperCase()}</span>
            <div className="admin-profile-copy">
              <strong>{adminName}</strong>
              <small>{adminEmail}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN ADMIN AREA */}
      <section className="admin-main">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
            >
              <Menu size={22} />
            </button>
            <div className="admin-breadcrumb">
              <span>Admin Panel</span>
              <ChevronRight size={14} />
              <strong>{current.title}</strong>
              <small className="breadcrumb-sub">({current.english})</small>
            </div>
          </div>

          <div className="admin-topbar-right">
            <span className={`admin-live-status ${backendOnline ? "" : "is-offline"}`}>
              <i /> {loadingData ? "Menghubungkan ke MySQL..." : backendOnline ? "MySQL Terhubung" : "Backend Offline"}
            </span>
            <div className="admin-topbar-avatar" title={adminName}>
              {adminName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* PAGE 1: OVERVIEW */}
        {activePage === "overview" && (
          <div className="admin-page-content">
            {/* WELCOME HERO */}
            <div className="admin-welcome">
              <div>
                <span className="admin-eyebrow">DASHBOARD EKSEKUTIF</span>
                <h2>Selamat datang kembali, {adminName}!</h2>
                <p>Pantau statistik harian, interaksi AI Speaking Partner, dan bank materi TOEFL dari satu pusat kendali.</p>
              </div>
              <div className="admin-welcome-graphic">
                <ShieldCheck size={54} />
                <span>VERIFIED</span>
              </div>
            </div>

            {/* 4 STAT CARDS — angka diambil langsung dari database */}
            <div className="admin-stat-grid">
              <article className="admin-stat-card">
                <div className="stat-card-header">
                  <span className="admin-stat-icon stat-blue"><Users size={20} /></span>
                  <span className="trend-badge">{activeUsers} aktif</span>
                </div>
                <p>Total Pengguna Terdaftar</p>
                <strong>{totalUsers} <span>user</span></strong>
                <small>{activeUsers} akun berstatus aktif</small>
              </article>

              <article className="admin-stat-card">
                <div className="stat-card-header">
                  <span className="admin-stat-icon stat-purple"><Activity size={20} /></span>
                  <span className="trend-badge">Realtime</span>
                </div>
                <p>Total Sesi Latihan AI</p>
                <strong>{totalSessions} <span>sesi</span></strong>
                <small>Rata-rata {avgSessionsPerUser} sesi/pengguna</small>
              </article>

              <article className="admin-stat-card">
                <div className="stat-card-header">
                  <span className="admin-stat-icon stat-cyan"><BookOpen size={20} /></span>
                  <span className="trend-badge">{totalContent} item</span>
                </div>
                <p>Bank Soal & Materi TOEFL</p>
                <strong>{totalContent} <span>modul</span></strong>
                <small>Tersebar di 4 bagian iBT</small>
              </article>

              <article className="admin-stat-card">
                <div className="stat-card-header">
                  <span className="admin-stat-icon stat-orange"><Clock3 size={20} /></span>
                  <span className="trend-badge">{aiStatus.configured ? "Aktif" : "Belum disetel"}</span>
                </div>
                <p>AI Engine (Gemini)</p>
                <strong className={aiStatus.configured ? "" : "stat-offline-text"}>
                  {aiStatus.configured ? "Online" : "Offline"}
                </strong>
                <small>
                  {aiStatus.configured
                    ? `Model: ${aiStatus.model}`
                    : "Isi GEMINI_API_KEY di api/.env"}
                </small>
              </article>
            </div>

            {/* TWO COLUMN PANELS */}
            <div className="admin-content-grid">
              {/* RECENT ACTIVITY LOG */}
              <article className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3>Log Aktivitas Terkini Platform</h3>
                    <p>Interaksi langsung pengguna pada materi dan AI Speaking</p>
                  </div>
                  <Activity size={18} />
                </div>

                <div className="admin-activity-list">
                  {activityLog.map((item) => (
                    <div className="activity-item" key={item.id}>
                      <span className={`activity-dot ${item.tone}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <small>{item.time}</small>
                    </div>
                  ))}

                  {activityLog.length === 0 && (
                    <p className="admin-empty-note">
                      Belum ada aktivitas. Tambahkan pengguna atau materi untuk melihat log di sini.
                    </p>
                  )}
                </div>
              </article>

              {/* QUICK ACTIONS PANEL */}
              <article className="admin-panel admin-quick-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3>Akses Cepat Pengelolaan</h3>
                    <p>Pintasan untuk tindakan rutin admin</p>
                  </div>
                  <ArrowUpRight size={18} />
                </div>

                <div className="quick-buttons-column">
                  <button type="button" onClick={() => { setActivePage("users"); setShowAddUserModal(true); }}>
                    <UserPlus size={18} />
                    <div>
                      <strong>Tambah Pengguna Baru</strong>
                      <small>Daftarkan akun pelajar atau instruktur</small>
                    </div>
                    <ChevronRight size={16} />
                  </button>

                  <button type="button" onClick={() => { setActivePage("content"); setShowAddContentModal(true); }}>
                    <BookOpen size={18} />
                    <div>
                      <strong>Tambah Soal TOEFL Baru</strong>
                      <small>Masukkan prompt speaking atau teks reading</small>
                    </div>
                    <ChevronRight size={16} />
                  </button>

                  <button type="button" onClick={() => setActivePage("reports")}>
                    <BarChart3 size={18} />
                    <div>
                      <strong>Lihat Laporan Lengkap</strong>
                      <small>Analisis performa nilai & distribusi skor</small>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* PAGE 2: USER MANAGEMENT */}
        {activePage === "users" && (
          <div className="admin-page-content">
            <div className="panel-toolbar">
              <div className="search-and-filters">
                <div className="admin-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Cari nama atau email pengguna..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  className="filter-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">Semua Peran (Role)</option>
                  <option value="Pelajar">Pelajar / Student</option>
                  <option value="Instruktur">Instruktur / Teacher</option>
                </select>

                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Ditangguhkan">Ditangguhkan</option>
                </select>
              </div>

              <div className="toolbar-actions">
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => setShowAddUserModal(true)}
                >
                  <Plus size={16} />
                  <span>Tambah Pengguna</span>
                </button>
              </div>
            </div>

            {/* USERS TABLE */}
            <div className="admin-table-wrap">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Nama Pengguna</th>
                    <th>Email</th>
                    <th>Peran (Role)</th>
                    <th>Status</th>
                    <th>Sesi Selesai</th>
                    <th>Tanggal Gabung</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="table-user-cell">
                          <span className="user-circle">{u.name.charAt(0)}</span>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td><span className="role-tag">{u.roleLabel || u.role}</span></td>
                      <td>
                        <span className={`status-pill pill-${u.status.toLowerCase()}`}>
                          {u.status}
                        </span>
                      </td>
                      <td><strong>{u.practiceCount}</strong> sesi</td>
                      <td>{u.joined}</td>
                      <td>
                        <div className="action-buttons-cell">
                          <button
                            type="button"
                            className="status-toggle-btn"
                            onClick={() => toggleUserStatus(u.id)}
                            title={u.status === "Aktif" ? "Tangguhkan Akun" : "Aktifkan Akun"}
                          >
                            {u.status === "Aktif" ? "Tangguhkan" : "Aktifkan"}
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Hapus Pengguna"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="7" className="table-empty">
                        Tidak ada pengguna yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ADD USER MODAL */}
            {showAddUserModal && (
              <div className="admin-modal-backdrop">
                <div className="admin-modal-card">
                  <div className="modal-header">
                    <h3>Tambah Pengguna Baru</h3>
                    <button type="button" onClick={() => setShowAddUserModal(false)}><X size={18} /></button>
                  </div>
                  <form onSubmit={handleAddUser}>
                    <div className="modal-form-group">
                      <label>Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="Contoh: Muhammad Farhan"
                      />
                    </div>
                    <div className="modal-form-group">
                      <label>Alamat Email</label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="farhan@example.com"
                      />
                    </div>
                    <div className="modal-form-group">
                      <label>Peran (Role)</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="Pelajar / Student">Pelajar / Student</option>
                        <option value="Instruktur / Teacher">Instruktur / Teacher</option>
                      </select>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn-cancel" onClick={() => setShowAddUserModal(false)}>Batal</button>
                      <button type="submit" className="btn-submit">Daftarkan Pengguna</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 3: STUDENT PROGRESS MONITORING */}
        {activePage === "students" && <StudentProgress onToast={triggerToast} />}

        {/* PAGE 4: CONTENT MANAGEMENT */}
        {activePage === "content" && (
          <div className="admin-page-content">
            <div className="panel-toolbar">
              <div className="search-and-filters">
                <button
                  type="button"
                  className={`section-filter-btn ${contentSectionFilter === "all" ? "active" : ""}`}
                  onClick={() => setContentSectionFilter("all")}
                >
                  Semua ({contentList.length})
                </button>
                <button
                  type="button"
                  className={`section-filter-btn ${contentSectionFilter === "Speaking" ? "active" : ""}`}
                  onClick={() => setContentSectionFilter("Speaking")}
                >
                  Speaking
                </button>
                <button
                  type="button"
                  className={`section-filter-btn ${contentSectionFilter === "Reading" ? "active" : ""}`}
                  onClick={() => setContentSectionFilter("Reading")}
                >
                  Reading
                </button>
                <button
                  type="button"
                  className={`section-filter-btn ${contentSectionFilter === "Listening" ? "active" : ""}`}
                  onClick={() => setContentSectionFilter("Listening")}
                >
                  Listening
                </button>
                <button
                  type="button"
                  className={`section-filter-btn ${contentSectionFilter === "Writing" ? "active" : ""}`}
                  onClick={() => setContentSectionFilter("Writing")}
                >
                  Writing
                </button>
              </div>

              <button
                type="button"
                className="add-btn"
                onClick={() => setShowAddContentModal(true)}
              >
                <Plus size={16} />
                <span>Tambah Soal Baru</span>
              </button>
            </div>

            <div className="content-cards-grid">
              {filteredContent.map((item) => (
                <div key={item.id} className="content-admin-card">
                  <div className="card-top-row">
                    <span className={`content-section-tag section-${item.section.toLowerCase()}`}>
                      {item.section}
                    </span>
                    <span className="diff-badge">{item.difficulty}</span>
                  </div>
                  <h4>{item.title}</h4>
                  <p className="content-category-sub">{item.category}</p>
                  {item.prompt ? (
                    <p className="content-prompt-preview">{item.prompt}</p>
                  ) : (
                    <p className="content-prompt-preview is-empty">
                      Belum ada isi materi — siswa hanya melihat judul ini.
                    </p>
                  )}
                  <div className="card-footer-row">
                    <small>Diperbarui: {item.updated}</small>
                    <button
                      type="button"
                      className="delete-content-btn"
                      onClick={() => handleDeleteContent(item.id, item.title)}
                      title="Hapus Materi"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredContent.length === 0 && (
                <p className="admin-empty-note">
                  {contentList.length === 0
                    ? "Bank soal masih kosong. Gunakan tombol \"Tambah Soal Baru\" untuk menambahkan materi."
                    : "Tidak ada materi pada bagian ini."}
                </p>
              )}
            </div>

            {/* ADD CONTENT MODAL */}
            {showAddContentModal && (
              <div className="admin-modal-backdrop">
                <div className="admin-modal-card">
                  <div className="modal-header">
                    <h3>Tambah Materi / Bank Soal TOEFL</h3>
                    <button type="button" onClick={() => setShowAddContentModal(false)}><X size={18} /></button>
                  </div>
                  <form onSubmit={handleAddContent}>
                    <div className="modal-form-group">
                      <label>Judul Soal / Topik</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Online Degree vs Traditional Campus"
                        value={newContent.title}
                        onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                      />
                    </div>
                    <div className="modal-form-group">
                      <label>Bagian TOEFL (Section)</label>
                      <select
                        value={newContent.section}
                        onChange={(e) => setNewContent({ ...newContent, section: e.target.value })}
                      >
                        <option value="Speaking">Speaking</option>
                        <option value="Reading">Reading</option>
                        <option value="Listening">Listening</option>
                        <option value="Writing">Writing</option>
                      </select>
                    </div>
                    <div className="modal-form-group">
                      <label>Kategori / Tipe Soal</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Academic Discussion / Task 1"
                        value={newContent.category}
                        onChange={(e) => setNewContent({ ...newContent, category: e.target.value })}
                      />
                    </div>
                    <div className="modal-form-group">
                      <label>Tingkat Kesulitan</label>
                      <select
                        value={newContent.difficulty}
                        onChange={(e) => setNewContent({ ...newContent, difficulty: e.target.value })}
                      >
                        <option value="Beginner">Beginner (Dasar)</option>
                        <option value="Intermediate">Intermediate (Menengah)</option>
                        <option value="Advanced">Advanced (Lanjutan)</option>
                      </select>
                    </div>
                    <div className="modal-form-group">
                      <label>Isi Materi / Prompt Soal</label>
                      <textarea
                        rows={5}
                        maxLength={4000}
                        placeholder="Tuliskan pertanyaan, kalimat latihan, atau teks bacaan. Materi Speaking akan dipakai TOEFLy sebagai topik latihan."
                        value={newContent.prompt}
                        onChange={(e) => setNewContent({ ...newContent, prompt: e.target.value })}
                      />
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn-cancel" onClick={() => setShowAddContentModal(false)}>Batal</button>
                      <button type="submit" className="btn-submit">Simpan ke Bank Soal</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 5: ANNOUNCEMENTS */}
        {activePage === "announcements" && <AdminAnnouncements onToast={triggerToast} />}

        {/* PAGE 6: REPORTS & ANALYTICS */}
        {activePage === "reports" && (
          <div className="admin-page-content">
            <div className="reports-hero-grid">
              <div className="report-stat-box">
                <span className="report-stat-label">Total Sesi Latihan Tercatat</span>
                <h3>{totalSessions} <span>sesi</span></h3>
                <div className="sub-skill-averages">
                  <span>{totalUsers} pengguna</span> · <span>rata-rata {avgSessionsPerUser} sesi/user</span>
                </div>
              </div>

              <div className="report-stat-box">
                <span className="report-stat-label">Pengguna Aktif</span>
                <h3>{activeUsers} <span>/ {totalUsers}</span></h3>
                <small className="trend-good">
                  {totalUsers ? `${Math.round((activeUsers / totalUsers) * 100)}% akun berstatus aktif` : "Belum ada pengguna"}
                </small>
              </div>

              <div className="report-stat-box">
                <span className="report-stat-label">Pelajar Paling Aktif</span>
                <h3>{topUser ? topUser.name : "-"}</h3>
                <small>
                  {topUser
                    ? `${topUser.practiceCount || 0} sesi latihan tersimpan`
                    : "Belum ada data latihan"}
                </small>
              </div>
            </div>

            <div className="reports-detail-panel">
              <div className="panel-header-with-action">
                <div>
                  <h3>Distribusi Pengguna berdasarkan Jumlah Sesi Latihan</h3>
                  <p>Dihitung langsung dari data pada database ({totalUsers} pengguna terdaftar)</p>
                </div>
                <button
                  type="button"
                  className="export-report-btn"
                  onClick={handleExportReport}
                >
                  <Download size={15} />
                  <span>Unduh Rangkuman CSV</span>
                </button>
              </div>

              <div className="skill-benchmark-bars">
                {sessionBuckets.map((bucket) => (
                  <div className="benchmark-row" key={bucket.label}>
                    <div className="benchmark-label">
                      <strong>{bucket.label}</strong>
                      <span>{bucket.count} pengguna</span>
                    </div>
                    <div className="benchmark-track">
                      <div
                        className="benchmark-fill"
                        style={{ width: `${Math.round((bucket.count / maxBucketCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reports-detail-panel">
              <div className="panel-header-with-action">
                <div>
                  <h3>Sebaran Bank Materi per Bagian TOEFL</h3>
                  <p>Jumlah materi/soal yang tersedia pada bank soal ({totalContent} item)</p>
                </div>
              </div>

              <div className="skill-benchmark-bars">
                {contentBySection.map((item) => (
                  <div className="benchmark-row" key={item.section}>
                    <div className="benchmark-label">
                      <strong>{item.section}</strong>
                      <span>{item.count} materi</span>
                    </div>
                    <div className="benchmark-track">
                      <div
                        className="benchmark-fill fill-purple"
                        style={{ width: `${Math.round((item.count / Math.max(1, totalContent)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
