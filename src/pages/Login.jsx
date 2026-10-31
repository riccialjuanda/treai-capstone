import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck
} from "lucide-react";

import { authApi } from "../utils/api.js";
import "./Login.css";

export default function Login({ onLogin, onBackHome }) {
  // "login" | "register" | "forgot"
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Alur lupa kata sandi: minta kode lalu verifikasi kode + kata sandi baru.
  const [resetStep, setResetStep] = useState("request");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [demoCode, setDemoCode] = useState("");

  function resetMessages() {
    setError("");
    setInfo("");
  }

  function handleOpenForgot() {
    resetMessages();
    setResetStep("request");
    setDemoCode("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setMode("forgot");
  }

  /**
   * Mengirim permintaan kode reset, lalu (setelah kode diterima) menyimpan
   * kata sandi baru dan langsung membuka dashboard.
   */
  async function handleForgotSubmit(normalizedEmail) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (resetStep === "request") {
      if (!emailPattern.test(normalizedEmail)) {
        setError("Masukkan email akun yang valid / Please enter a valid email address.");
        return;
      }

      setSubmitting(true);
      try {
        const data = await authApi.forgotPassword({ email: normalizedEmail });
        setInfo(
          data?.message ||
            "Jika email tersebut terdaftar, kode reset sudah dikirim. Periksa kotak masuk Anda."
        );
        if (data?.debugCode) {
          setDemoCode(data.debugCode);
          setResetCode(data.debugCode);
        }
        setResetStep("verify");
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!resetCode.trim()) {
      setError("Masukkan kode verifikasi yang dikirim ke email Anda.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Kata sandi baru minimal 6 karakter / Password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok / Password confirmation does not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await authApi.resetPassword({
        email: normalizedEmail,
        code: resetCode.trim(),
        password: newPassword
      });

      onLogin({
        role: data.user.role === "admin" ? "admin" : "user",
        name: data.user.name,
        email: data.user.email,
        token: data.token,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    resetMessages();

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "forgot") {
      await handleForgotSubmit(normalizedEmail);
      return;
    }

    if (!normalizedEmail || !password) {
      setError("Email dan kata sandi wajib diisi / Email and password are required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setError("Format email tidak valid / Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter / Password must contain at least 6 characters.");
      return;
    }

    const resolvedName = name.trim() || normalizedEmail
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    setSubmitting(true);
    try {
      // Akun baru selalu terdaftar sebagai pelajar; peran admin hanya dibuat oleh admin.
      const payload = { name: resolvedName, email: normalizedEmail, password, role: "user" };
      const data = mode === "register"
        ? await authApi.register(payload)
        : await authApi.login(payload);

      onLogin({
        role: data.user.role === "admin" ? "admin" : "user",
        name: data.user.name,
        email: data.user.email,
        token: data.token,
      });
    } catch (err) {
      const hint = err.code === "NETWORK_ERROR"
        ? " Pastikan Apache & MySQL sudah dijalankan di XAMPP Control Panel."
        : "";
      setError(`${err.message}${hint}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        {/* FORM PANEL */}
        <section className="login-form-panel">
          <div className="login-form-container">
            <div className="login-mobile-brand">
              <span className="login-brand-icon">
                <span className="login-brand-robot"><i /><i /></span>
              </span>
              <span>
                <strong>SpeakTOEFL <em>AI</em></strong>
                <small>Practice. Speak. Achieve.</small>
              </span>
            </div>

            {/* LOGIN / REGISTER TAB SWITCH */}
            {mode === "forgot" ? (
              <div className="login-forgot-head">
                <span className="login-forgot-icon">
                  <KeyRound size={20} />
                </span>
                <div>
                  <strong>Lupa Kata Sandi</strong>
                  <small>
                    {resetStep === "request"
                      ? "Masukkan email akun untuk menerima kode verifikasi."
                      : "Masukkan kode verifikasi dan kata sandi baru Anda."}
                  </small>
                </div>
              </div>
            ) : (
              <div className="login-tabs-header">
                <button
                  type="button"
                  className={`login-tab-btn ${mode === "login" ? "is-active" : ""}`}
                  onClick={() => { setMode("login"); setError(""); }}
                >
                  Masuk / Sign In
                </button>
                <button
                  type="button"
                  className={`login-tab-btn ${mode === "register" ? "is-active" : ""}`}
                  onClick={() => { setMode("register"); setError(""); }}
                >
                  Daftar Akun Baru
                </button>
              </div>
            )}

            {/* FORM */}
            <form className="login-form" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="login-input-group">
                  <label className="login-field-label" htmlFor="reg-name">Nama Lengkap</label>
                  <div className="login-input-wrapper">
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Nama lengkap Anda"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="login-input-group">
                <label className="login-field-label" htmlFor="login-email">Alamat Email</label>
                <div className="login-input-wrapper">
                  <Mail size={18} />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={mode === "forgot" && resetStep === "verify"}
                    required
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="login-input-group">
                  <label className="login-field-label" htmlFor="login-password">Kata Sandi / Password</label>
                  <div className="login-input-wrapper">
                    <LockKeyhole size={18} />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="login-inline-action">
                  <button type="button" onClick={handleOpenForgot}>
                    Lupa kata sandi? / Forgot password?
                  </button>
                </div>
              )}

              {mode === "forgot" && resetStep === "verify" && (
                <>
                  {demoCode && (
                    <div className="login-demo-code" role="status">
                      <ShieldCheck size={16} />
                      <p>
                        Mode demo (APP_DEBUG aktif): kode Anda <strong>{demoCode}</strong> —
                        pada mode produksi kode ini dikirim ke email.
                      </p>
                    </div>
                  )}

                  <div className="login-input-group">
                    <label className="login-field-label" htmlFor="reset-code">Kode Verifikasi</label>
                    <div className="login-input-wrapper">
                      <KeyRound size={18} />
                      <input
                        id="reset-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6 digit kode dari email"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="login-input-group">
                    <label className="login-field-label" htmlFor="reset-password">Kata Sandi Baru</label>
                    <div className="login-input-wrapper">
                      <LockKeyhole size={18} />
                      <input
                        id="reset-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Minimal 6 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="login-input-group">
                    <label className="login-field-label" htmlFor="reset-confirm">Ulangi Kata Sandi Baru</label>
                    <div className="login-input-wrapper">
                      <LockKeyhole size={18} />
                      <input
                        id="reset-confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Ketik ulang kata sandi baru"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}

              {info && (
                <div className="login-info" role="status">
                  <ShieldCheck size={16} />
                  <p>{info}</p>
                </div>
              )}

              {error && (
                <div className="login-error" role="alert">
                  <span>!</span>
                  <p>{error}</p>
                </div>
              )}

              <button type="submit" className="login-submit-button" disabled={submitting}>
                <span>
                  <strong>
                    {submitting
                      ? "Memproses..."
                      : mode === "login"
                      ? "Masuk ke Dashboard"
                      : mode === "register"
                      ? "Buat Akun Sekarang"
                      : resetStep === "request"
                      ? "Kirim Kode Verifikasi"
                      : "Simpan & Masuk"}
                  </strong>
                </span>
                {submitting ? <Loader2 size={18} className="login-spinner" /> : <ArrowRight size={18} />}
              </button>
            </form>

            <div className="login-bottom-link">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode("login");
                    setResetStep("request");
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>Kembali ke Halaman Masuk</span>
                </button>
              ) : (
                <button type="button" onClick={onBackHome}>
                  <ArrowLeft size={15} />
                  <span>Kembali ke Beranda</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
