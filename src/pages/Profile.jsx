import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, UserRound } from "lucide-react";

import { authApi } from "../utils/api";

export default function Profile({ user, onUserUpdate, onToast }) {
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Ikuti perubahan nama/email dari induk (mis. setelah login ulang)
  useEffect(() => {
    setProfileForm({ name: user?.name || "", email: user?.email || "" });
  }, [user?.name, user?.email]);

  async function handleSaveProfile(event) {
    event.preventDefault();

    const name = profileForm.name.trim();
    const email = profileForm.email.trim().toLowerCase();

    if (!name) {
      onToast?.("error", "Nama Wajib Diisi", "Isi nama lengkap Anda terlebih dahulu.");
      return;
    }

    setSavingProfile(true);
    try {
      const data = await authApi.updateProfile({ name, email });
      onUserUpdate?.({ name: data.user.name, email: data.user.email });
      onToast?.("success", "Profil Diperbarui", "Nama dan email akun Anda sudah disimpan.");
    } catch (error) {
      onToast?.("error", "Gagal Menyimpan Profil", error.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword(event) {
    event.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword) {
      onToast?.("error", "Data Belum Lengkap", "Isi kata sandi lama dan kata sandi baru.");
      return;
    }
    if (newPassword.length < 6) {
      onToast?.("error", "Kata Sandi Terlalu Pendek", "Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast?.("error", "Konfirmasi Tidak Cocok", "Ulangi kata sandi baru dengan tepat.");
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.updatePassword({ currentPassword, newPassword });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onToast?.("success", "Kata Sandi Diperbarui", "Gunakan kata sandi baru saat masuk berikutnya.");
    } catch (error) {
      onToast?.("error", "Gagal Mengubah Kata Sandi", error.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="profile-page">
      {/* IDENTITAS AKUN */}
      <section className="profile-identity-card">
        <div className="profile-avatar-large">
          {(profileForm.name || "P").charAt(0).toUpperCase()}
        </div>
        <div className="profile-identity-copy">
          <h2>{profileForm.name || "Pelajar"}</h2>
          <p>{profileForm.email || "-"}</p>
          <span className="profile-role-pill">Pelajar / Student</span>
        </div>
      </section>

      <div className="profile-grid">
        {/* DATA DIRI */}
        <section className="profile-card">
          <header className="profile-card-head">
            <span className="profile-card-icon">
              <UserRound size={18} />
            </span>
            <div>
              <h3>Data Diri</h3>
              <p>Perbarui nama dan email yang dipakai untuk masuk.</p>
            </div>
          </header>

          <form className="profile-form" onSubmit={handleSaveProfile}>
            <label className="profile-field">
              <span>Nama Lengkap</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Nama lengkap Anda"
              />
            </label>

            <label className="profile-field">
              <span>Alamat Email</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="nama@email.com"
              />
            </label>

            <button type="submit" className="profile-submit" disabled={savingProfile}>
              {savingProfile ? <Loader2 size={16} className="profile-spinner" /> : <CheckCircle2 size={16} />}
              <span>{savingProfile ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </form>
        </section>

        {/* KATA SANDI */}
        <section className="profile-card">
          <header className="profile-card-head">
            <span className="profile-card-icon is-amber">
              <LockKeyhole size={18} />
            </span>
            <div>
              <h3>Keamanan Akun</h3>
              <p>Ganti kata sandi secara berkala demi keamanan akun.</p>
            </div>
          </header>

          <form className="profile-form" onSubmit={handleSavePassword}>
            <label className="profile-field">
              <span>Kata Sandi Saat Ini</span>
              <input
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                placeholder="Kata sandi lama"
              />
            </label>

            <label className="profile-field">
              <span>Kata Sandi Baru</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                placeholder="Minimal 6 karakter"
              />
            </label>

            <label className="profile-field">
              <span>Ulangi Kata Sandi Baru</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                placeholder="Ketik ulang kata sandi baru"
              />
            </label>

            <button type="submit" className="profile-submit" disabled={savingPassword}>
              {savingPassword ? <Loader2 size={16} className="profile-spinner" /> : <LockKeyhole size={16} />}
              <span>{savingPassword ? "Menyimpan..." : "Ubah Kata Sandi"}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
