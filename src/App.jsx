
import { useEffect, useState } from "react";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import { authApi, clearToken, getToken, setToken } from "./utils/api.js";
import { syncPreferencesFromServer } from "./utils/preferences.js";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Pulihkan sesi login dari token yang tersimpan di browser
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;

    authApi
      .me()
      .then((data) => {
        if (cancelled || !data?.user) return;
        const user = data.user;
        setUserRole(user.role === "admin" ? "admin" : "user");
        setUserProfile({ name: user.name, email: user.email, role: user.role });
        setCurrentPage(user.role === "admin" ? "admin" : "user");
        syncPreferencesFromServer();
      })
      .catch(() => {
        // Token kedaluwarsa / backend tidak aktif: tetap di halaman beranda
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Buka halaman login
  function handleOpenLogin() {
    setCurrentPage("login");
  }

  // Kembali ke halaman utama
  function handleGoHome() {
    setCurrentPage("home");
  }

  // Dipanggil ketika login / registrasi berhasil (data berasal dari backend)
  function handleLogin(session) {
    const role = session?.role;
    if (role !== "user" && role !== "admin") {
      return;
    }

    if (session.token) {
      setToken(session.token);
    }

    setUserRole(role);
    setUserProfile({
      name: session.name || (role === "admin" ? "Administrator" : "Pelajar"),
      email: session.email || "",
      role,
    });

    // Tarik preferensi dari MySQL
    syncPreferencesFromServer();

    setCurrentPage(role === "admin" ? "admin" : "user");
  }

  // Keluar dari dashboard
  function handleLogout() {
    authApi.logout().catch(() => {});
    clearToken();
    setUserRole(null);
    setUserProfile(null);
    setCurrentPage("home");
  }

  // Menampilkan halaman sesuai navigasi
  function renderPage() {
    switch (currentPage) {
      case "home":
        return (
          <Home
            onLogin={handleOpenLogin}
          />
        );

      case "login":
        return (
          <Login
            onLogin={handleLogin}
            onBackHome={handleGoHome}
          />
        );

      case "user":
        if (userRole !== "user") {
          return (
            <Home onLogin={handleOpenLogin} />
          );
        }

        return (
          <UserDashboard
            user={userProfile}
            onLogout={handleLogout}
          />
        );

      case "admin":
        if (userRole !== "admin") {
          return (
            <Home onLogin={handleOpenLogin} />
          );
        }

        return (
          <AdminDashboard
            user={userProfile}
            onLogout={handleLogout}
          />
        );

      default:
        return (
          <Home onLogin={handleOpenLogin} />
        );
    }
  }

  return (
    <div className="app-root">
      {renderPage()}
    </div>
  );
}
