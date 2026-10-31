import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MapPin,
  Menu,
  MessageCircle,
  Sparkles,
  Target,
  Users,
  X,
  Star
} from "lucide-react";

import "./Home.css";

const features = [
  {
    icon: MessageCircle,
    title: "AI Speaking Partner",
    english: "Percakapan dua arah dengan mikrofon",
    description: "Berlatih bicara bahasa Inggris bersama TOEFLy dengan input suara dan balasan bersuara alami.",
    color: "cyan",
  },
  {
    icon: Sparkles,
    title: "Umpan Balik & Terjemahan Instan",
    english: "Evaluasi otomatis setiap jawaban",
    description: "AI menilai kelancaran, mengoreksi tata bahasa, dan memberi terjemahan dwibahasa.",
    color: "blue",
  },
  {
    icon: Target,
    title: "Latihan Berbasis Topik TOEFL",
    english: "Topik Independent Speaking",
    description: "Pilih topik, berlatih dengan timer sesi, dan riwayat latihan tersimpan otomatis.",
    color: "purple",
  },
  {
    icon: BarChart3,
    title: "Dashboard Progres Belajar",
    english: "Pantau perkembanganmu",
    description: "Lihat waktu belajar, jumlah sesi, streak harian, dan capaian target mingguan.",
    color: "green",
  },
];

const testimonials = [
  {
    name: "Nabila Putri, S.T.",
    achievement: "Skor TOEFL iBT 108 · Awardee LPDP 2026",
    quote: "Latihan speaking dengan TOEFLy setiap malam membantu saya mengatasi rasa gugup dan 'blank' saat menjawab soal Independent Speaking.",
    avatar: "NP",
    rating: 5
  },
  {
    name: "Dimas Anggara",
    achievement: "Skor TOEFL iBT 102 · Mahasiswa ITB",
    quote: "Umpan balik tata bahasa dan terjemahan otomatisnya sangat membantu saya memperbaiki struktur kalimat saat berbicara.",
    avatar: "DA",
    rating: 5
  },
  {
    name: "Clara Salsabila",
    achievement: "Skor TOEFL iBT 111 · Exchange Program USA",
    quote: "Timer sesi latihan dan riwayat progres di dashboard membuat saya bisa berlatih berbicara secara konsisten setiap hari.",
    avatar: "CS",
    rating: 5
  }
];

export default function Home({ onLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleStart() {
    setMenuOpen(false);
    onLogin();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="home-page">
      {/* NAVBAR */}
      <header className="home-navbar">
        <a
          className="home-brand"
          href="#home"
          onClick={closeMenu}
          aria-label="SpeakTOEFL AI Beranda"
        >
          <span className="home-brand-icon">
            <span className="brand-robot-face">
              <i />
              <i />
            </span>
          </span>

          <span className="home-brand-text">
            <strong>
              SpeakTOEFL <em>AI</em>
            </strong>
            <small>Practice. Speak. Achieve.</small>
          </span>
        </a>

        <button
          className="home-mobile-toggle"
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={`home-nav-links ${menuOpen ? "home-nav-open" : ""}`}>
          <a href="#home" onClick={closeMenu}>Beranda / Home</a>
          <a href="#tentang" onClick={closeMenu}>Tentang Kami</a>
          <a href="#fitur" onClick={closeMenu}>Fitur Utama</a>
          <a href="#testimoni" onClick={closeMenu}>Testimoni</a>

          <button
            className="home-login-button"
            type="button"
            onClick={handleStart}
          >
            <span>Masuk / Sign In</span>
            <ArrowRight size={15} />
          </button>
        </nav>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="home-hero" id="home">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <div className="home-eyebrow">
                <span>
                  PLATFORM LATIHAN SPEAKING TOEFL BERBASIS AI
                </span>
              </div>

              <h1>
                Bahasa Inggris Lebih Lancar,
                <span className="home-gradient-text">
                  {" "}Raih Skor TOEFL Impian.
                </span>
              </h1>

              <p className="home-hero-description">
                Latih kemampuan Speaking TOEFL iBT bersama TOEFLy — partner AI yang responsif, sabar, dan siap mengevaluasi performamu secara instan, lengkap dengan dashboard progres belajar.
              </p>

              <div className="home-hero-assurances">
                <span>
                  <CheckCircle2 size={16} />
                  Latihan Speaking berbasis Mikrofon
                </span>
                <span>
                  <CheckCircle2 size={16} />
                  Evaluasi & Terjemahan Otomatis
                </span>
                <span>
                  <CheckCircle2 size={16} />
                  Bisa Dicoba Tanpa Instalasi
                </span>
              </div>
            </div>

            {/* MASKOT ROBOT VISUAL & BADGES */}
            <div className="home-hero-visual">
              <div className="home-visual-glow" />
              <div className="home-visual-ring home-ring-one" />
              <div className="home-visual-ring home-ring-two" />

              <div className="home-mascot-stage">
                <div className="home-mascot">
                  <span className="home-mascot-antenna"><i /></span>
                  <span className="home-mascot-ear home-mascot-ear-left"><i /></span>
                  <span className="home-mascot-ear home-mascot-ear-right"><i /></span>

                  <span className="home-mascot-head">
                    <span className="home-mascot-face">
                      <span className="home-mascot-eyes"><i /><i /></span>
                      <span className="home-mascot-mouth" />
                      <i className="home-mascot-cheek home-cheek-left" />
                      <i className="home-mascot-cheek home-cheek-right" />
                    </span>
                  </span>

                  <span className="home-mascot-neck" />
                  <span className="home-mascot-body">
                    <b>T</b>
                    <i />
                  </span>
                  <span className="home-mascot-arm home-arm-left" />
                  <span className="home-mascot-arm home-arm-right" />
                </div>

                <div className="home-mascot-name">
                  <span className="home-online-dot" />
                  <span>
                    <strong>TOEFLy</strong>
                    <small>AI Speaking Buddy</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TENTANG KAMI / ABOUT */}
        <section className="home-about section" id="tentang">
          <div className="container">
            <div className="home-about-card">
              <div className="home-about-copy">
                <span className="home-section-eyebrow">
                  TENTANG KAMI / ABOUT US
                </span>
                <h2>
                  Lembaga Kursus Bahasa Inggris
                  <span className="home-gradient-text"> di Lhokseumawe.</span>
                </h2>
                <p>
                  Kami adalah lembaga kursus bahasa Inggris yang berkedudukan di Lhokseumawe, Aceh.
                  Kegiatan belajar dilakukan secara tatap muka bersama pengajar, dengan fokus pada
                  kemampuan berbicara (speaking), percakapan sehari-hari, dan persiapan tes TOEFL iBT.
                </p>
                <p>
                  SpeakTOEFL AI merupakan platform latihan digital dari lembaga kami. Melalui platform
                  ini peserta dapat berlatih speaking bersama TOEFLy kapan saja serta memantau
                  perkembangan belajar masing-masing.
                </p>

                <div className="home-about-points">
                  <span>
                    <CheckCircle2 size={16} />
                    Bimbingan langsung oleh pengajar
                  </span>
                  <span>
                    <CheckCircle2 size={16} />
                    Latihan speaking dengan AI
                  </span>
                  <span>
                    <CheckCircle2 size={16} />
                    Progres belajar terukur
                  </span>
                </div>
              </div>

              <div className="home-about-facts">
                <div className="home-about-fact">
                  <span className="home-about-fact-icon fact-blue">
                    <MapPin size={19} />
                  </span>
                  <div>
                    <strong>Lhokseumawe, Aceh</strong>
                    <small>Lokasi lembaga kursus kami</small>
                  </div>
                </div>

                <div className="home-about-fact">
                  <span className="home-about-fact-icon fact-cyan">
                    <Users size={19} />
                  </span>
                  <div>
                    <strong>Pelajar & Profesional</strong>
                    <small>Kelas untuk berbagai kalangan</small>
                  </div>
                </div>

                <div className="home-about-fact">
                  <span className="home-about-fact-icon fact-purple">
                    <MessageCircle size={19} />
                  </span>
                  <div>
                    <strong>Fokus Speaking</strong>
                    <small>Percakapan & persiapan TOEFL iBT</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SECTION */}
        <section className="home-features section" id="fitur">
          <div className="container">
            <div className="home-section-heading">
              <span className="home-section-eyebrow">
                FITUR UTAMA / CORE FEATURES
              </span>
              <h2>
                Semua yang Kamu Butuhkan untuk
                <span className="home-gradient-text"> Lancar Berbicara & Siap TOEFL.</span>
              </h2>
              <p>
                Dirancang khusus bagi pelajar dan profesional yang mempersiapkan beasiswa LPDP, studi luar negeri, atau peningkatan karier.
              </p>
            </div>

            <div className="home-feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className="home-feature-card" key={feature.title}>
                    <div className={`home-feature-icon feature-${feature.color}`}>
                      <Icon size={24} />
                    </div>
                    <h3>{feature.title}</h3>
                    <span className="home-feature-english">{feature.english}</span>
                    <p>{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="home-testimonials section" id="testimoni">
          <div className="container">
            <div className="home-section-heading">
              <span className="home-section-eyebrow">KISAH SUKSES PELAJAR / STUDENT SUCCESS</span>
              <h2>Dipercaya oleh Calon Peraih Beasiswa & Mahasiswa</h2>
              <p>Pengalaman nyata pengguna yang telah membuktikan peningkatan skor TOEFL mereka.</p>
            </div>

            <div className="testimonials-grid">
              {testimonials.map((t, idx) => (
                <div key={idx} className="testimonial-card">
                  <div className="testimonial-stars">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <p className="testimonial-quote">"{t.quote}"</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">{t.avatar}</div>
                    <div>
                      <strong>{t.name}</strong>
                      <small>{t.achievement}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="container home-footer-inner">
          <a className="home-brand home-footer-brand" href="#home">
            <span className="home-brand-icon">
              <span className="brand-robot-face"><i /><i /></span>
            </span>
            <span className="home-brand-text">
              <strong>SpeakTOEFL <em>AI</em></strong>
              <small>Practice. Speak. Achieve.</small>
            </span>
          </a>

          <p>
            © {new Date().getFullYear()} SpeakTOEFL AI.
            <span> Lembaga Kursus Bahasa Inggris & Latihan TOEFL — Lhokseumawe, Aceh.</span>
          </p>

          <a className="home-footer-top" href="#home">
            Kembali ke atas
            <ArrowDown size={15} />
          </a>
        </div>
      </footer>
    </div>
  );
}
