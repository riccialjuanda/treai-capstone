import { useEffect, useState } from "react";
import { Megaphone, Send, Trash2 } from "lucide-react";

import { announcementsApi } from "../utils/api";

const AUDIENCE_LABELS = {
  all: "Semua Pengguna",
  user: "Pelajar",
  teacher: "Instruktur",
};

const EMPTY_FORM = { title: "", message: "", audience: "all" };

/**
 * Halaman admin: menulis pengumuman yang langsung muncul
 * di notifikasi dashboard siswa.
 */
export default function AdminAnnouncements({ onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const data = await announcementsApi.list();
      setItems(Array.isArray(data?.announcements) ? data.announcements : []);
    } catch (error) {
      onToast?.("error", "Gagal Memuat Pengumuman", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;

    setSaving(true);
    try {
      const created = await announcementsApi.create({
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
      });
      setItems((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      onToast?.(
        "success",
        "Pengumuman Terkirim",
        `"${created.title}" kini tampil di dashboard ${AUDIENCE_LABELS[created.audience] || "siswa"}.`
      );
    } catch (error) {
      onToast?.("error", "Gagal Mengirim Pengumuman", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Hapus pengumuman "${title}"?`)) return;

    try {
      await announcementsApi.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      onToast?.("info", "Pengumuman Dihapus", `"${title}" sudah tidak tampil di dashboard siswa.`);
    } catch (error) {
      onToast?.("error", "Gagal Menghapus", error.message);
    }
  }

  return (
    <div className="admin-page-content">
      <div className="announcements-layout">
        {/* FORM PENGUMUMAN BARU */}
        <form className="admin-panel announcement-form" onSubmit={handleCreate}>
          <div className="admin-panel-heading">
            <h3>Buat Pengumuman</h3>
            <p>Pengumuman langsung muncul di lonceng notifikasi dashboard siswa.</p>
          </div>

          <label className="announcement-field">
            <span>Judul Pengumuman</span>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="Contoh: Jadwal Simulasi TOEFL iBT Pekan Ini"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>

          <label className="announcement-field">
            <span>Sasaran</span>
            <select
              value={form.audience}
              onChange={(event) => setForm({ ...form, audience: event.target.value })}
            >
              <option value="all">Semua Pengguna</option>
              <option value="user">Pelajar</option>
              <option value="teacher">Instruktur</option>
            </select>
          </label>

          <label className="announcement-field">
            <span>Isi Pengumuman</span>
            <textarea
              required
              rows={6}
              maxLength={2000}
              placeholder="Tuliskan informasi, target latihan, atau pengingat untuk siswa..."
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
            />
          </label>

          <button type="submit" className="announcement-submit" disabled={saving}>
            <Send size={16} />
            <span>{saving ? "Mengirim..." : "Kirim ke Dashboard Siswa"}</span>
          </button>
        </form>

        {/* DAFTAR PENGUMUMAN TERKIRIM */}
        <section className="admin-panel announcement-list">
          <div className="admin-panel-heading">
            <h3>Pengumuman Terkirim</h3>
            <p>
              {loading
                ? "Memuat pengumuman..."
                : `${items.length} pengumuman aktif di dashboard siswa`}
            </p>
          </div>

          <div className="announcement-feed">
            {items.map((item) => (
              <article className="announcement-item" key={item.id}>
                <div className="announcement-item-head">
                  <span className="announcement-icon">
                    <Megaphone size={15} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.author} · {item.created} · {AUDIENCE_LABELS[item.audience] || item.audience}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="delete-content-btn"
                    onClick={() => handleDelete(item.id, item.title)}
                    title="Hapus Pengumuman"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p>{item.message}</p>
              </article>
            ))}

            {!loading && items.length === 0 && (
              <p className="admin-empty-note">
                Belum ada pengumuman. Gunakan formulir di samping untuk mengirim yang pertama.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
