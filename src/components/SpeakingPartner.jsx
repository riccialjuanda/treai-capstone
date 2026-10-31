import { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  Mic,
  MicOff,
  Sparkles,
  HelpCircle,
  Quote,
  Volume2,
  X
} from "lucide-react";
import { INITIAL_SPEAKING_TOPICS } from "../data/toeflData";
import {
  loadPreferences,
  savePreferences,
  subscribePreferences,
  speakWithPreferences,
  voiceQualityLabel,
  whenVoicesReady
} from "../utils/preferences";
import { aiApi } from "../utils/api";

/* ---------------------------------------------------------------
   KEPRIBADIAN TOEFLy
   TOEFLy bukan sekadar bot: ia punya sifat, suasana hati, dan gaya
   bicara sendiri supaya terasa seperti teman belajar sungguhan.
---------------------------------------------------------------- */
const TOEFLY_PROFILE = {
  name: "TOEFLy",
  role: "AI Speaking Coach",
  tagline: "Teman latihan bicaramu, 24/7",
  traits: ["Ramah", "Sabar", "Menyemangati", "Detail"]
};

// Kalimat contoh untuk mencoba karakter suara sebelum mulai berlatih.
const VOICE_SAMPLE =
  "Hello! I'm TOEFLy, your speaking partner. Let's practice English together.";

// Warna label kualitas suara (hijau = paling natural).
const QUALITY_TONES = {
  "Sangat natural": "high",
  Natural: "medium",
  "Cukup natural": "low",
  Standar: "low"
};

// Kalimat khas TOEFLy untuk setiap suasana hati.
// Setiap baris selalu berpasangan: "en" (kalimat Inggris) + "id" (terjemahan Indonesia).
const MOOD_SCRIPT = {
  idle: {
    label: "Siap menemanimu",
    en: "Hi! I'm TOEFLy. What would you like to talk about today? Let's warm up with a relaxed chat first.",
    id: "Hai! Aku TOEFLy. Mau cerita apa hari ini? Kita latihan santai dulu, ya.",
    face: "Senang melihatmu kembali!"
  },
  listening: {
    label: "Sedang mendengarkanmu",
    en: "I'm listening carefully... just speak naturally, don't be afraid of making mistakes.",
    id: "Aku dengarkan baik-baik... bicara santai saja, jangan takut salah.",
    face: "Telingaku terbuka lebar nih."
  },
  thinking: {
    label: "Sedang berpikir",
    en: "Hmm, one moment please... I'm putting together the best response for you.",
    id: "Hmm, sebentar ya... aku sedang menyusun respons terbaik untukmu.",
    face: "Aku pikirkan dulu, oke?"
  },
  speaking: {
    label: "Sedang bersuara",
    en: "Listen to my accent, then try to repeat it out loud!",
    id: "Dengarkan aksenku, lalu coba tirukan dengan lantang!",
    face: "Ayo tirukan gayaku."
  },
  happy: {
    label: "Bangga padamu",
    en: "That was a great answer! I really like how you developed it.",
    id: "Wah, jawabanmu bagus! Aku suka cara kamu mengembangkannya.",
    face: "Kamu keren!"
  },
  encouraging: {
    label: "Menyemangatimu",
    en: "It's okay to make mistakes. That is exactly how we grow!",
    id: "Tidak apa-apa salah. Justru dari kesalahan itu kita berkembang!",
    face: "Ayo lanjut, kamu bisa!"
  }
};


const DEFAULT_TOPIC = {
  id: "general-conversation",
  category: "General",
  title: "Everyday Conversation",
  prompt: "Describe a skill you would like to learn and explain why it matters to you.",
  prepTime: 15,
  responseTime: 45,
  keyVocabulary: ["skill", "practice", "goal", "improve"],
  sampleResponse:
    "I would like to learn public speaking because it would help me communicate my ideas clearly. I could practice by joining discussions and presenting in class. Over time, this skill would make me more confident.",
  speakingTips:
    "State your main idea, give two reasons, and support one reason with a specific example."
};

const SPEAKING_TOPICS =
  Array.isArray(INITIAL_SPEAKING_TOPICS) && INITIAL_SPEAKING_TOPICS.length
    ? INITIAL_SPEAKING_TOPICS
    : [DEFAULT_TOPIC];

function normalizeMood(value) {
  return Object.prototype.hasOwnProperty.call(MOOD_SCRIPT, value) ? value : "idle";
}

// Skor hanya ditampilkan bila API benar-benar mengirim evaluasi numerik yang valid.
// Komponen tidak membuat skor TOEFL palsu berdasarkan panjang teks.
function normalizeEvaluation(value) {
  if (!value || typeof value !== "object") return null;

  const rawScore = value.estimatedScore ?? value.toeflScore ?? value.score;
  if (rawScore === undefined || rawScore === null || rawScore === "") return null;

  const score = Number(rawScore);
  if (!Number.isFinite(score) || score < 0 || score > 30) return null;

  return { estimatedScore: Math.round(score * 10) / 10 };
}

export default function SpeakingPartner({ user, topic, onAddSession }) {
  // Topik latihan: memakai materi dari instruktur bila ada, jika tidak topik bawaan.
  const selectedTopic = useMemo(() => {
    const materialTitle = typeof topic?.title === "string" ? topic.title.trim() : "";
    if (!materialTitle) return SPEAKING_TOPICS[0];

    const materialPrompt = typeof topic?.prompt === "string" ? topic.prompt.trim() : "";

    return {
      id: `material-${topic.id}`,
      category: topic.category || "Materi Instruktur",
      title: materialTitle,
      prompt: materialPrompt || DEFAULT_TOPIC.prompt,
      prepTime: DEFAULT_TOPIC.prepTime,
      responseTime: DEFAULT_TOPIC.responseTime,
      keyVocabulary: DEFAULT_TOPIC.keyVocabulary,
      sampleResponse: materialPrompt || DEFAULT_TOPIC.sampleResponse,
      speakingTips: DEFAULT_TOPIC.speakingTips
    };
  }, [topic]);

  const isMaterialTopic = Boolean(topic?.title);

  const [messages, setMessages] = useState(() => {
    const name = user?.name || "there";

    return [
      {
        id: "m_welcome",
        sender: "toefly",
        text: `Hello ${name}! I'm TOEFLy, your personal AI speaking companion. Today we'll practice: "${selectedTopic.title}". Are you ready to begin?`,
        translation: `Halo ${user?.name || ""}! Aku TOEFLy, partner bicara AI pribadimu. Hari ini kita berlatih: "${selectedTopic.title}". Siap mulai?`,
        feedback: "Tip: Speak in complete sentences and don't worry about making mistakes!",
        time: "Just now"
      }
    ];
  });
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [restingMood, setRestingMood] = useState("idle");
  const [prefs, setPrefs] = useState(() => loadPreferences());

  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(
    () => Boolean(prefs?.autoVoiceReply)
  );

  // Pemilihan suara AI — tersedia langsung di panggung latihan bicara
  const [voices, setVoices] = useState([]);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const recognitionRef = useRef(null);
  const recognitionSessionRef = useRef(null);
  const sendLockRef = useRef(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Suasana hati aktif: gabungan status aktivitas + mood istirahat
  const toeflyMood = isListening
    ? "listening"
    : isThinking
    ? "thinking"
    : isSpeaking
    ? "speaking"
    : restingMood;
  const moodScript = MOOD_SCRIPT[toeflyMood] || MOOD_SCRIPT.idle;

  // Ikuti perubahan preferensi dari halaman Pengaturan secara realtime
  useEffect(() => {
    const unsubscribe = subscribePreferences((next) => {
      setPrefs(next);
      setVoiceReplyEnabled(next.autoVoiceReply);
    });
    return unsubscribe;
  }, []);

  // Daftar suara baru tersedia setelah event "voiceschanged" di beberapa browser
  useEffect(() => whenVoicesReady((list) => setVoices(list)), []);

  // Suara yang benar-benar dipakai: pilihan pengguna, atau suara paling natural.
  const activeVoiceName = prefs.voiceName || voices[0]?.name || "";
  const activeVoice = voices.find((voice) => voice.name === activeVoiceName) || null;

  // Clean up microphone, pending requests, and speech synthesis on unmount.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;

      const session = recognitionSessionRef.current;
      if (session) {
        session.cancelled = true;
        try {
          session.recognition.abort();
        } catch {
          // Browser may already have stopped recognition.
        }
      }

      recognitionSessionRef.current = null;
      recognitionRef.current = null;

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Bicara memakai preferensi suara pengguna (voice, kecepatan)
  function speakText(text) {
    if (!text || typeof text !== "string") return;

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechError("Browser Anda belum mendukung audio text-to-speech.");
      return;
    }

    setSpeechError("");
    speakWithPreferences(text, {
      onStart: () => {
        if (mountedRef.current) setIsSpeaking(true);
      },
      onEnd: () => {
        if (mountedRef.current) setIsSpeaking(false);
      }
    });
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  /* ---------------- Pemilihan suara AI ---------------- */

  function handleVoiceChange(name) {
    setPrefs(savePreferences({ voiceName: name }));
  }

  function handleRateChange(value) {
    setPrefs(savePreferences({ speechRate: Number(value) }));
  }

  function handleAutoReplyToggle() {
    setPrefs(savePreferences({ autoVoiceReply: !prefs.autoVoiceReply }));
  }

  // Dengarkan contoh suara: sekali tekan untuk memutar, tekan lagi untuk berhenti.
  function handlePreviewVoice() {
    if (previewing) {
      window.speechSynthesis?.cancel();
      setPreviewing(false);
      return;
    }

    setPreviewing(true);
    speakWithPreferences(VOICE_SAMPLE, {
      onEnd: () => setPreviewing(false)
    });
  }

  function generateAIResponse(userText) {
    const lower = userText.toLowerCase();
    let reply = "";
    let translation = "";
    let feedback = "";
    let mood = "idle";

    // Sapaan
    if (/\b(hello|hi|hey|halo)\b/.test(lower)) {
      reply = `Hello ${user?.name || "there"}! It's fantastic to have you here. Are you ready to dive into our TOEFL speaking prompt: "${selectedTopic.title}"?`;
      translation = `Halo ${user?.name || ""}! Sangat senang kamu ada di sini. Apakah kamu siap untuk mencoba latihan topik TOEFL: "${selectedTopic.title}"?`;
      feedback = "Good greeting! Try answering with a sentence like: 'Yes, I'm ready to begin!' to practice full declarative sentences.";
      mood = "happy";
    }
    // Pertanyaan tentang belajar/cara menjawab
    else if (/how (can|do) i|tips|advice|help|improve|improve my|caranya|bagaimana/.test(lower)) {
      reply = "Great question! To boost your speaking band, focus on three things: fluent delivery, clear organization, and precise vocabulary. Start with a direct opinion, support it with one personal example, then conclude in one sentence. Want me to model a Band 28 answer for you?";
      translation = "Pertanyaan bagus! Untuk menaikkan band speaking, fokus ke tiga hal: penyampaian yang lancar, organisasi yang jelas, dan kosakata yang tepat. Mulai dengan opini langsung, dukung dengan satu contoh pribadi, lalu tutup dengan satu kalimat. Mau aku contohkan jawaban Band 28?";
      feedback = "Coaching tip: Structure = Opinion → Two Reasons → Personal Example → Conclusion.";
      mood = "encouraging";
    }
    // Contoh jawaban
    else if (/sample|contoh|example answer|band 28|model answer/.test(lower)) {
      const sampleResponse = selectedTopic.sampleResponse || DEFAULT_TOPIC.sampleResponse;
      reply = `Here is a model response:\n\n"${sampleResponse}"\n\nNotice how I opened with a clear position, supported it with reasons, and finished with a concrete example. Try recording your own version now!`;
      translation = `Berikut contoh jawabannya:\n\n"${sampleResponse}"\n\nPerhatikan bagaimana aku membuka dengan posisi yang jelas, mendukungnya dengan alasan, dan menutup dengan contoh nyata. Sekarang coba rekam versimu sendiri!`;
      feedback = selectedTopic.speakingTips || DEFAULT_TOPIC.speakingTips;
      mood = "happy";
    }
    // Beasiswa / karier
    else if (lower.includes("lpdp") || lower.includes("scholarship") || lower.includes("career") || lower.includes("community")) {
      reply = "Aiming high with your academic ambitions is admirable! How do your long-term career aspirations directly align with national or community development?";
      translation = "Memiliki ambisi akademis yang tinggi sangat mengagumkan! Bagaimana aspirasi karier jangka panjangmu berkaitan langsung dengan kemajuan bangsa atau masyarakat?";
      feedback = "Scholarship tip: Structure your reply using the STAR method (Situation, Task, Action, Result) for maximum persuasiveness.";
      mood = "encouraging";
    }
    // Jawaban panjang
    else if (lower.length > 50) {
      reply = "Excellent elaboration! You explained your perspective with good detail. To push for an even higher band, try incorporating academic connectors like 'Consequently', 'On the contrary', or 'It is widely acknowledged that'. How would you summarize your main point in one final takeaway?";
      translation = "Penjelasan yang sangat bagus! Kamu menyampaikan sudut pandangmu dengan detail. Untuk meraih band yang lebih tinggi, coba sertakan kata penghubung akademis seperti 'Consequently', 'On the contrary', atau 'It is widely acknowledged that'. Bagaimana kamu menyimpulkan poin utamamu dalam satu kesimpulan akhir?";
      feedback = "Strong fluency demonstrated! Your response length showed good confidence and sustained flow.";
      mood = "happy";
    }
    // Jawaban pendek
    else {
      reply = "That's an interesting point! Could you elaborate further by giving two specific reasons why you think that way? Try to speak for another 30 seconds.";
      translation = "Itu poin yang menarik! Bisakah kamu menjelaskan lebih lanjut dengan memberikan dua alasan spesifik? Coba berbicara selama 30 detik lagi.";
      feedback = "Speaking Tip: In TOEFL Speaking, avoid one-sentence answers. Expand by asking yourself: 'Why is this true?' and 'What happened when I did this?'";
      mood = "encouraging";
    }

    // Catatan tata bahasa
    if (/\bi am agree\b/i.test(userText)) {
      feedback = "Grammar note: Say 'I agree', never 'I am agree' because 'agree' is already a verb.";
      mood = "encouraging";
    } else if (/\b(he|she) go\b/i.test(userText)) {
      feedback = "Grammar note: Remember subject-verb agreement: 'He goes' or 'She goes'.";
      mood = "encouraging";
    }

    return { reply, translation, feedback, mood: normalizeMood(mood), evaluation: null };
  }

  // Ambil balasan TOEFLy dari API; jika gagal, gunakan respons lokal.
  async function requestAIResponse(userText, requestId) {
    try {
      const data = await aiApi.chat({
        message: userText,
        topic: selectedTopic,
        history: messages.slice(-8).map((message) => ({
          sender: message.sender,
          text: message.text
        }))
      });

      if (typeof data?.reply === "string" && data.reply.trim()) {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setAiNotice(`Dijawab oleh Gemini (${data.model || "AI online"}).`);
        }

        return {
          reply: data.reply.trim(),
          translation: typeof data.translation === "string" ? data.translation : "",
          feedback: typeof data.feedback === "string" ? data.feedback : "",
          mood: normalizeMood(data.mood),
          evaluation: normalizeEvaluation(data.evaluation)
        };
      }

      if (mountedRef.current && requestId === requestIdRef.current) {
        setAiNotice("Mode lokal aktif: layanan AI online belum memberikan respons.");
      }
    } catch (error) {
      const noticeByCode = {
        AI_NOT_CONFIGURED: "Mode lokal: isi GEMINI_API_KEY pada api/.env agar TOEFLy ditenagai Gemini.",
        AI_RATE_LIMIT: "Kuota harian Gemini (free tier) habis — TOEFLy beralih ke mode lokal.",
        AI_TIMEOUT: "Gemini tidak merespons tepat waktu — TOEFLy beralih ke mode lokal.",
        AI_AUTH: "API key Gemini tidak valid — TOEFLy beralih ke mode lokal.",
        AI_MODEL_NOT_FOUND: "Model Gemini tidak tersedia — TOEFLy beralih ke mode lokal."
      };

      if (mountedRef.current && requestId === requestIdRef.current) {
        setAiNotice(
          noticeByCode[error?.code] ||
            "Layanan AI online tidak tersedia, beralih ke mode lokal."
        );
      }
    }

    return generateAIResponse(userText);
  }

  async function handleSendMessage(rawText) {
    const text = String(rawText ?? "").trim();
    if (!text || sendLockRef.current) return;

    sendLockRef.current = true;
    const requestId = ++requestIdRef.current;

    const userMessage = {
      id: `u_${Date.now()}`,
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    setMessages((previous) => [...previous, userMessage]);
    setIsThinking(true);
    setSpeechError("");
    setAiNotice("Menghubungkan ke layanan AI...");

    try {
      // Jeda singkat membuat status berpikir terlihat, tanpa menghalangi respons API.
      const [result] = await Promise.all([
        requestAIResponse(text, requestId),
        new Promise((resolve) => setTimeout(resolve, 500))
      ]);

      // Abaikan respons lama bila pengguna sudah mereset sesi atau komponen ditutup.
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      const aiMessage = {
        id: `ai_${Date.now()}`,
        sender: "toefly",
        text: result.reply,
        translation: result.translation,
        feedback: result.feedback,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      };

      setMessages((previous) => [...previous, aiMessage]);
      setRestingMood(normalizeMood(result.mood));

      if (voiceReplyEnabled) {
        speakText(result.reply);
      }

      if (typeof onAddSession === "function") {
        const score = result.evaluation?.estimatedScore;
        try {
          Promise.resolve(
            onAddSession({
              type: "AI Speaking Partner",
              detail: `Topic: ${selectedTopic.title}`,
              score: Number.isFinite(score) ? `${score}/30` : "Belum dinilai"
            })
          ).catch(() => {
            // Gagal menyimpan riwayat tidak boleh menghentikan percakapan.
          });
        } catch {
          // Abaikan error sinkron dari callback penyimpanan sesi.
        }
      }
    } catch {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setSpeechError("Maaf, terjadi kendala saat memproses pesan. Silakan coba lagi.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        sendLockRef.current = false;
        if (mountedRef.current) setIsThinking(false);
      }
    }
  }

  function startListening() {
    if (typeof window === "undefined") {
      setSpeechError("Mikrofon hanya dapat digunakan di browser.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        "Fitur mikrofon belum didukung. Gunakan Google Chrome atau Microsoft Edge untuk berbicara dengan TOEFLy."
      );
      return;
    }

    if (
      isThinking ||
      sendLockRef.current ||
      isListening ||
      recognitionSessionRef.current
    ) {
      return;
    }

    try {
      stopSpeaking();
      setSpeechError("");
      setInterimText("");

      const recognition = new SpeechRecognition();
      const session = {
        recognition,
        cancelled: false,
        finalTranscript: "",
        interimTranscript: ""
      };

      recognitionRef.current = recognition;
      recognitionSessionRef.current = session;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (
          !mountedRef.current ||
          session.cancelled ||
          recognitionSessionRef.current !== session
        ) {
          return;
        }

        setIsListening(true);
        setSpeechError("");
      };

      recognition.onresult = (event) => {
        if (
          session.cancelled ||
          recognitionSessionRef.current !== session
        ) {
          return;
        }

        let interim = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || "";

          if (event.results[index].isFinal) {
            session.finalTranscript = `${session.finalTranscript} ${transcript}`.trim();
          } else {
            interim += transcript;
          }
        }

        session.interimTranscript = interim.trim();
        const visibleTranscript = [session.finalTranscript, session.interimTranscript]
          .filter(Boolean)
          .join(" ")
          .trim();

        setInterimText(visibleTranscript);
      };

      recognition.onerror = (event) => {
        if (
          !mountedRef.current ||
          session.cancelled ||
          recognitionSessionRef.current !== session
        ) {
          return;
        }

        const errorMessages = {
          "not-allowed": "Izin mikrofon tidak diberikan. Periksa izin situs di browser.",
          "no-speech": "Suara tidak terdeteksi. Silakan coba bicara lagi.",
          "audio-capture": "Mikrofon tidak ditemukan atau sedang digunakan aplikasi lain.",
          network: "Pengenalan suara mengalami gangguan jaringan."
        };

        if (event.error !== "aborted") {
          setSpeechError(
            errorMessages[event.error] || "Pengenalan suara dihentikan. Silakan coba lagi."
          );
        }
      };

      recognition.onend = () => {
        const isCurrentSession = recognitionSessionRef.current === session;
        if (!isCurrentSession) return;

        recognitionSessionRef.current = null;
        recognitionRef.current = null;

        if (mountedRef.current) {
          setIsListening(false);
          setInterimText("");
        }

        const capturedText =
          session.finalTranscript.trim() || session.interimTranscript.trim();
        if (!session.cancelled && capturedText) {
          void handleSendMessage(capturedText);
        }
      };

      recognition.start();
    } catch {
      recognitionSessionRef.current = null;
      recognitionRef.current = null;
      setIsListening(false);
      setSpeechError("Gagal memulai mikrofon. Periksa izin mikrofon pada browser.");
    }
  }

  // Menghentikan rekaman secara normal agar transkrip terakhir tetap dikirim.
  function stopListening() {
    const session = recognitionSessionRef.current;
    if (!session) {
      setIsListening(false);
      return;
    }

    try {
      session.recognition.stop();
    } catch {
      recognitionSessionRef.current = null;
      recognitionRef.current = null;
      setIsListening(false);
    }
  }

  // Kalimat pada balon ucapan karakter: jawaban terakhir TOEFLy.
  // Saat kita bicara, balon menampilkan kalimat penyemangat, sedangkan
  // transkrip suara kita tampil di baris khusus tepat di atas tombol mic.
  // Setiap kalimat selalu disertai terjemahan bahasa Indonesia di bawahnya.
  const latestToeflyMessage = [...messages].reverse().find((m) => m.sender === "toefly");
  const stageLine = isListening
    ? MOOD_SCRIPT.listening.en
    : isThinking
    ? MOOD_SCRIPT.thinking.en
    : (latestToeflyMessage && latestToeflyMessage.text) || moodScript.en;

  const stageTranslation = isListening
    ? MOOD_SCRIPT.listening.id
    : isThinking
    ? MOOD_SCRIPT.thinking.id
    : (latestToeflyMessage && latestToeflyMessage.translation) || moodScript.id;

  return (
    <div className="speaking-partner-container">
      {/* CENTER STAGE — KARAKTER TOEFLy DI TENGAH + TOMBOL MIC DI BAWAHNYA */}
      <div
        className={`speaking-center-stage speaking-stage-card mood-${toeflyMood} ${isListening ? "stage-recording" : ""} ${isSpeaking ? "stage-speaking" : ""}`}
      >
        {/* Papan nama karakter + status suasana hati */}
        <div className="stage-nameplate">
          <span className={`toefly-dot-indicator mood-${toeflyMood}`} />
          <strong>{TOEFLY_PROFILE.name}</strong>
          <em>{moodScript.label}</em>
        </div>

        {/* PEMILIHAN SUARA AI — bisa diatur langsung di panggung latihan */}
        <div className={`stage-voice-control ${showVoicePanel ? "is-open" : ""}`}>
          <button
            type="button"
            className="stage-voice-trigger"
            onClick={() => setShowVoicePanel((open) => !open)}
            aria-expanded={showVoicePanel}
            title="Pengaturan suara AI TOEFLy"
          >
            <Volume2 size={15} />
            <span>Suara AI</span>
          </button>

          {showVoicePanel && (
            <div className="stage-voice-panel" role="dialog" aria-label="Pengaturan suara AI">
              <div className="stage-voice-panel-head">
                <strong>Suara AI TOEFLy</strong>
                <button
                  type="button"
                  className="stage-voice-close"
                  onClick={() => setShowVoicePanel(false)}
                  aria-label="Tutup pengaturan suara"
                >
                  <X size={15} />
                </button>
              </div>

              {voices.length === 0 ? (
                <p className="stage-voice-empty">
                  Browser ini belum menyediakan suara bahasa Inggris. Gunakan Google Chrome
                  atau Microsoft Edge terbaru agar TOEFLy bisa bersuara.
                </p>
              ) : (
                <>
                  <label className="stage-voice-field">
                    <span>Pilihan Suara</span>
                    <select
                      value={activeVoiceName}
                      onChange={(event) => handleVoiceChange(event.target.value)}
                    >
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang}) — {voice.quality}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="stage-voice-actions">
                    <span
                      className={`stage-voice-quality is-${
                        QUALITY_TONES[voiceQualityLabel(activeVoice?.score || 0)] || "low"
                      }`}
                    >
                      <Mic size={12} />
                      {voiceQualityLabel(activeVoice?.score || 0)}
                    </span>
                    <button
                      type="button"
                      className="stage-voice-preview"
                      onClick={handlePreviewVoice}
                    >
                      <Volume2 size={14} />
                      <span>{previewing ? "Hentikan" : "Dengarkan contoh"}</span>
                    </button>
                  </div>

                  <label className="stage-voice-field">
                    <span>Kecepatan Bicara: {Number(prefs.speechRate).toFixed(2)}x</span>
                    <input
                      type="range"
                      min="0.7"
                      max="1.2"
                      step="0.05"
                      value={prefs.speechRate}
                      onChange={(event) => handleRateChange(event.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className={`stage-voice-toggle ${prefs.autoVoiceReply ? "is-on" : ""}`}
                    onClick={handleAutoReplyToggle}
                  >
                    <span className="stage-voice-switch">
                      <i />
                    </span>
                    <span>Balasan otomatis bersuara</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Penanda saat latihan memakai materi yang dibagikan instruktur */}
        {isMaterialTopic && (
          <div className="stage-material-badge">
            <BookOpen size={13} />
            <span>Materi Instruktur: {selectedTopic.title}</span>
          </div>
        )}

        {/* Balon ucapan: menampilkan respons TOEFLy atas pertanyaanmu */}
        <div className="toefly-speech-bubble center-bubble" aria-live="polite">
          <Quote size={13} className="speech-bubble-icon" />
          <div className="bubble-copy">
            <p className="bubble-line-en">{stageLine}</p>
            {stageTranslation && (
              <p className="bubble-line-id">
                <span className="bubble-id-tag">ID</span>
                {stageTranslation}
              </p>
            )}
          </div>
        </div>

        <div className={`mascot-face-container mood-${toeflyMood}`}>
          {/* Cincin aura: menempel pada wadah karakter agar selalu mengelilingi TOEFLy */}
          <span className="orbit-ring orbit-ring-1" aria-hidden="true" />
          <span className="orbit-ring orbit-ring-2" aria-hidden="true" />
          <div className="mascot-robot-body">
            <div className="robot-antenna">
              <span />
            </div>
            <div className="robot-head">
              <div className="robot-face">
                <span className="robot-eye eye-left" />
                <span className="robot-eye eye-right" />
                <span className={`robot-mouth ${isSpeaking ? "speaking" : ""}`} />
                <span className="robot-cheek cheek-left" />
                <span className="robot-cheek cheek-right" />
              </div>
            </div>
            <div className="robot-chest">
              <span>T</span>
            </div>
          </div>
        </div>

        <div className="stage-status-caption">
          <strong>
            {isListening
              ? "Mendengarkan suara Anda..."
              : isSpeaking
              ? "TOEFLy sedang menjawab..."
              : isThinking
              ? "TOEFLy menyusun jawaban..."
              : `${moodScript.face}`}
          </strong>
          <p>
            {isListening
              ? "Bicaralah dengan jelas dalam kalimat bahasa Inggris lengkap."
              : isSpeaking
              ? "Dengarkan aksen dan pola kalimat native speaker."
              : "Tekan tombol mic di bawah, lalu bicara seperti sedang menjawab soal asli."}
          </p>
        </div>

        {/* TRANSKRIP SUARA LANGSUNG — tepat di atas tombol mic */}
        {isListening && (
          <div className="mic-live-transcript" role="status" aria-live="polite">
            <Mic size={14} />
            <span>{interimText || "Mulai bicara, aku sedang mendengarkan..."}</span>
          </div>
        )}

        {/* TOMBOL MIC BESAR DI BAWAH KARAKTER */}
        <div className="center-mic-block">
          <button
            type="button"
            className={`center-mic-btn ${isListening ? "is-recording" : ""}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isThinking}
            aria-label={isListening ? "Selesai Merekam" : "Mulai Bicara"}
            title={isListening ? "Tekan untuk selesai bicara" : "Tekan untuk mulai bertanya / menjawab"}
          >
            {isListening ? <MicOff size={30} /> : <Mic size={30} />}
            {isListening && <span className="mic-pulse-ring" />}
          </button>
          <span className="center-mic-label">
            {isListening ? "Sedang merekam... tekan lagi untuk selesai" : "Tekan untuk bertanya atau menjawab"}
          </span>
        </div>

        {/* Contoh perintah cepat — sekali tekan, TOEFLy langsung menjawab dengan suara. */}
        <div className="quick-prompts-row center-chips" aria-label="Contoh perintah">
          <button
            type="button"
            className="prompt-chip"
            onClick={() => void handleSendMessage("Could you give me a sample answer for this topic?")}
            disabled={isThinking || isListening}
          >
            Minta contoh jawaban
          </button>
          <button
            type="button"
            className="prompt-chip"
            onClick={() => void handleSendMessage("Can you give me tips to improve my TOEFL speaking?")}
            disabled={isThinking || isListening}
          >
            Minta tips TOEFL
          </button>
          <button
            type="button"
            className="prompt-chip"
            onClick={() => void handleSendMessage("Please help me improve this answer.")}
            disabled={isThinking || isListening}
          >
            Bantu kembangkan jawaban
          </button>
        </div>

        {speechError && (
          <div className="speech-error-notice center-error">
            <HelpCircle size={15} />
            <span>{speechError}</span>
          </div>
        )}

        {aiNotice && (
          <div className="ai-source-notice" role="status" aria-live="polite">
            <Sparkles size={14} />
            <span>{aiNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
}
