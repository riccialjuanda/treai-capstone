// Data untuk SpeakTOEFL AI.
// Hanya memuat topik latihan AI Speaking Partner + statistik awal pengguna,
// sesuai fitur yang benar-benar tersedia di aplikasi.

export const INITIAL_SPEAKING_TOPICS = [
  {
    id: "task1_technology",
    category: "TOEFL Task 1 (Independent)",
    title: "Online Learning vs. In-Person Classes",
    prompt:
      "Do you agree or disagree that online classes are just as effective as traditional face-to-face classes? Provide specific reasons to support your answer.",
    prepTime: 15,
    responseTime: 45,
    sampleResponse:
      "In my opinion, traditional face-to-face classes are significantly more effective than online learning. First of all, in-person classes encourage immediate interaction between students and professors, allowing doubts to be clarified on the spot. Secondly, campus classrooms create an engaging atmosphere that keeps students accountable and focused. For instance, in laboratory courses, hands-on experiments simply cannot be replicated online.",
    keyVocabulary: ["significantly", "immediate interaction", "clarified on the spot", "accountable", "replicated"],
    speakingTips: "Use transition markers like 'First of all', 'Secondly', and 'For instance' to organize your argument smoothly."
  },
  {
    id: "task2_campus",
    category: "Campus Life & Discussion",
    title: "University Library Renovation Policy",
    prompt:
      "The university plans to eliminate quiet study zones in the library and replace them with collaborative discussion spaces. Do you support this policy?",
    prepTime: 30,
    responseTime: 60,
    sampleResponse:
      "I disagree with the proposal to remove quiet study zones. While group collaboration is valuable, students still desperately need quiet environments to conduct deep research and prepare for rigorous exams. If quiet zones are eliminated, students will have no choice but to study in dormitories, which are often noisy and cramped. A better solution would be to balance both needs by designating specific floors for collaboration while keeping other floors strictly silent.",
    keyVocabulary: ["collaborative", "desperately need", "rigorous exams", "dormitories", "designate"],
    speakingTips: "Acknowledge the opposing view briefly ('While collaboration is valuable...') before explaining why the policy has drawbacks."
  },
  {
    id: "interview_lpdp",
    category: "Scholarship & Career",
    title: "Academic Goals & Motivation",
    prompt:
      "Why did you choose your field of study, and how do you plan to contribute to your community after graduation?",
    prepTime: 20,
    responseTime: 60,
    sampleResponse:
      "I chose computer science because of its tremendous potential to solve real-world problems through artificial intelligence and automation. Growing up in a developing region, I witnessed firsthand how digital divide affects access to education and healthcare. Upon graduation, I aim to develop accessible educational technologies that empower underserved students with adaptive learning tools.",
    keyVocabulary: ["tremendous potential", "witnessed firsthand", "digital divide", "empower", "underserved communities"],
    speakingTips: "Focus on passion, personal connection, and forward-looking impact."
  }
];

export const INITIAL_USER_STATS = {
  studyMinutes: 48,
  practiceSessions: 6,
  learningStreak: 4,
  toeflGoal: 105,
  weeklyGoal: 5,
  weeklyCompleted: 3,
  recentHistory: [
    { id: "h1", date: "Hari ini / Today", type: "AI Speaking Partner", detail: "Topic: Academic Goals", score: "88/100" }
  ]
};
