// Quiz Game - Player Frontend Logic

// Web Audio API Synthesizer for sound effects
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('quiz_sound_enabled') !== 'false';
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.setValueAtTime(164.81, now + 0.15); // E3

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.25, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.4);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }
}

const sounds = new SoundEffects();

// State
let gameState = {
  playerName: '',
  questions: [],
  currentIndex: 0,
  userAnswers: [], // { questionId, selectedOption }
  currentScore: 0,
  streak: 0,
  timerSeconds: 15,
  timerRemaining: 15,
  timerInterval: null,
  gameStartTime: 0,
  totalTimeSpent: 0,
  isAnswerSubmitted: false,
  finalResult: null
};

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const gameplayScreen = document.getElementById('gameplayScreen');
const resultsScreen = document.getElementById('resultsScreen');
const startForm = document.getElementById('startForm');
const playerNameInput = document.getElementById('playerNameInput');
const questionLimitSelect = document.getElementById('questionLimitSelect');
const timerToggleSelect = document.getElementById('timerToggleSelect');
const soundToggleBtn = document.getElementById('soundToggleBtn');

// Gameplay Elements
const displayPlayerName = document.getElementById('displayPlayerName');
const playerAvatarInitial = document.getElementById('playerAvatarInitial');
const currentScoreEl = document.getElementById('currentScore');
const streakBadge = document.getElementById('streakBadge');
const streakCount = document.getElementById('streakCount');
const currentQuestionNum = document.getElementById('currentQuestionNum');
const totalQuestionsNum = document.getElementById('totalQuestionsNum');
const questionBadgeNum = document.getElementById('questionBadgeNum');
const questionPointsVal = document.getElementById('questionPointsVal');
const quizProgressBar = document.getElementById('quizProgressBar');
const questionText = document.getElementById('questionText');
const questionImageContainer = document.getElementById('questionImageContainer');
const questionImage = document.getElementById('questionImage');
const optionsGrid = document.getElementById('optionsGrid');
const optionButtons = document.querySelectorAll('.option-btn');
const explanationBox = document.getElementById('explanationBox');
const explanationText = document.getElementById('explanationText');
const feedbackIcon = document.getElementById('feedbackIcon');
const feedbackTitle = document.getElementById('feedbackTitle');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const nextBtnLabel = document.getElementById('nextBtnLabel');
const timerContainer = document.getElementById('timerContainer');
const timerText = document.getElementById('timerText');

// Results Elements
const resultBadgeIcon = document.getElementById('resultBadgeIcon');
const resultTitle = document.getElementById('resultTitle');
const resultSubtitle = document.getElementById('resultSubtitle');
const finalScoreVal = document.getElementById('finalScoreVal');
const correctCountVal = document.getElementById('correctCountVal');
const totalAttemptedVal = document.getElementById('totalAttemptedVal');
const accuracyVal = document.getElementById('accuracyVal');
const timeSpentVal = document.getElementById('timeSpentVal');
const playAgainBtn = document.getElementById('playAgainBtn');
const toggleReviewBtn = document.getElementById('toggleReviewBtn');
const reviewContainer = document.getElementById('reviewContainer');
const reviewList = document.getElementById('reviewList');
const showLeaderboardFromResultsBtn = document.getElementById('showLeaderboardFromResultsBtn');

// Leaderboard Modal Elements
const leaderboardModal = document.getElementById('leaderboardModal');
const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
const closeLeaderboardModalBtn = document.getElementById('closeLeaderboardModalBtn');
const closeLeaderboardBottomBtn = document.getElementById('closeLeaderboardBottomBtn');
const leaderboardModalList = document.getElementById('leaderboardModalList');

// Sound toggle handler
soundToggleBtn.addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  localStorage.setItem('quiz_sound_enabled', sounds.enabled);
  soundToggleBtn.textContent = sounds.enabled ? '🔊' : '🔇';
});
soundToggleBtn.textContent = sounds.enabled ? '🔊' : '🔇';

// Initialize pre-saved player name
const savedName = localStorage.getItem('quiz_player_name');
if (savedName && playerNameInput) {
  playerNameInput.value = savedName;
}

// -------------------------------------------------------------
// START GAME
// -------------------------------------------------------------
startForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = playerNameInput.value.trim();
  if (!name) return;

  localStorage.setItem('quiz_player_name', name);
  gameState.playerName = name;
  gameState.timerSeconds = parseInt(timerToggleSelect.value, 10);

  const limit = questionLimitSelect.value;

  try {
    const res = await fetch(`/api/play/questions?limit=${limit}`);
    const data = await res.json();

    if (!data.success || !data.questions || data.questions.length === 0) {
      alert('Chưa có câu hỏi nào trong hệ thống! Vui lòng nhờ Admin thêm câu hỏi.');
      return;
    }

    gameState.questions = data.questions;
    gameState.currentIndex = 0;
    gameState.userAnswers = [];
    gameState.currentScore = 0;
    gameState.streak = 0;
    gameState.gameStartTime = Date.now();

    // Setup player view
    displayPlayerName.textContent = name;
    playerAvatarInitial.textContent = name.charAt(0).toUpperCase();
    totalQuestionsNum.textContent = gameState.questions.length;

    // Switch screen
    welcomeScreen.classList.add('hidden');
    resultsScreen.classList.add('hidden');
    gameplayScreen.classList.remove('hidden');

    loadQuestion(gameState.currentIndex);
  } catch (err) {
    console.error(err);
    alert('Không thể kết nối đến máy chủ. Vui lòng thử lại!');
  }
});

// -------------------------------------------------------------
// LOAD & DISPLAY QUESTION
// -------------------------------------------------------------
function loadQuestion(index) {
  if (index >= gameState.questions.length) {
    finishQuiz();
    return;
  }

  const q = gameState.questions[index];
  gameState.isAnswerSubmitted = false;

  // Update progress
  currentQuestionNum.textContent = index + 1;
  questionBadgeNum.textContent = index + 1;
  questionPointsVal.textContent = q.points || 10;
  const progressPercent = Math.round(((index + 1) / gameState.questions.length) * 100);
  quizProgressBar.style.width = `${progressPercent}%`;

  // Render text
  questionText.textContent = q.question;

  // Handle question image
  if (q.image_url) {
    questionImage.src = q.image_url;
    questionImageContainer.classList.remove('hidden');
  } else {
    questionImage.src = '';
    questionImageContainer.classList.add('hidden');
  }

  // Reset Option buttons
  optionButtons.forEach(btn => {
    const opt = btn.getAttribute('data-option');
    const textSpan = btn.querySelector('.option-text');
    textSpan.textContent = q[`option_${opt.toLowerCase()}`];

    btn.disabled = false;
    btn.className = 'option-btn group text-left p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-750 border border-slate-700/70 flex items-center gap-3.5 text-slate-200 hover:text-white transition-all cursor-pointer';
  });

  // Hide feedback & Next button
  explanationBox.classList.add('hidden');
  nextQuestionBtn.classList.add('hidden');

  // Next button label
  if (index === gameState.questions.length - 1) {
    nextBtnLabel.textContent = 'Hoàn thành & Xem kết quả';
  } else {
    nextBtnLabel.textContent = 'Câu tiếp theo';
  }

  // Handle Timer
  clearInterval(gameState.timerInterval);
  if (gameState.timerSeconds > 0) {
    timerContainer.classList.remove('hidden');
    gameState.timerRemaining = gameState.timerSeconds;
    updateTimerDisplay();

    gameState.timerInterval = setInterval(() => {
      gameState.timerRemaining--;
      updateTimerDisplay();

      if (gameState.timerRemaining <= 0) {
        clearInterval(gameState.timerInterval);
        handleTimeOut();
      }
    }, 1000);
  } else {
    timerContainer.classList.add('hidden');
  }
}

function updateTimerDisplay() {
  timerText.textContent = `${gameState.timerRemaining}s`;
  if (gameState.timerRemaining <= 5) {
    timerText.classList.add('timer-danger');
  } else {
    timerText.classList.remove('timer-danger');
  }
}

// Timeout handler (unanswered question)
function handleTimeOut() {
  if (gameState.isAnswerSubmitted) return;
  gameState.isAnswerSubmitted = true;
  gameState.streak = 0;
  updateStreakDisplay();

  const currentQ = gameState.questions[gameState.currentIndex];
  gameState.userAnswers.push({
    questionId: currentQ.id,
    selectedOption: null // timed out
  });

  // Disable all buttons
  optionButtons.forEach(btn => {
    btn.disabled = true;
    btn.classList.add('opacity-60', 'cursor-not-allowed');
  });

  sounds.playWrong();

  // Show feedback
  explanationBox.classList.remove('hidden');
  feedbackIcon.textContent = '⏰';
  feedbackTitle.textContent = 'Hết thời gian!';
  explanationText.textContent = 'Bạn đã không kịp đưa ra câu trả lời cho câu hỏi này.';

  nextQuestionBtn.classList.remove('hidden');
  nextQuestionBtn.classList.add('flex');
}

// -------------------------------------------------------------
// SELECT OPTION
// -------------------------------------------------------------
optionButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (gameState.isAnswerSubmitted) return;
    gameState.isAnswerSubmitted = true;
    clearInterval(gameState.timerInterval);

    const selectedOption = button.getAttribute('data-option');
    const currentQ = gameState.questions[gameState.currentIndex];

    gameState.userAnswers.push({
      questionId: currentQ.id,
      selectedOption
    });

    // Disable all option buttons
    optionButtons.forEach(btn => {
      btn.disabled = true;
      if (btn === button) {
        // Highlight chosen button
        btn.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-950/60');
      } else {
        btn.classList.add('opacity-50');
      }
    });

    // Show next button immediately
    nextQuestionBtn.classList.remove('hidden');
    nextQuestionBtn.classList.add('flex');
  });
});

// Next question button click
nextQuestionBtn.addEventListener('click', () => {
  gameState.currentIndex++;
  loadQuestion(gameState.currentIndex);
});

// Update streak badge
function updateStreakDisplay() {
  if (gameState.streak >= 2) {
    streakBadge.classList.remove('hidden');
    streakCount.textContent = gameState.streak;
  } else {
    streakBadge.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// FINISH QUIZ & SUBMIT
// -------------------------------------------------------------
async function finishQuiz() {
  clearInterval(gameState.timerInterval);
  gameState.totalTimeSpent = Math.max(1, Math.round((Date.now() - gameState.gameStartTime) / 1000));

  try {
    const res = await fetch('/api/play/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: gameState.playerName,
        answers: gameState.userAnswers,
        timeSpent: gameState.totalTimeSpent
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert('Có lỗi khi gửi bài thi: ' + data.message);
      return;
    }

    displayResults(data.result);
  } catch (err) {
    console.error(err);
    alert('Không thể kết nối để chấm điểm. Vui lòng thử lại!');
  }
}

// -------------------------------------------------------------
// DISPLAY RESULTS
// -------------------------------------------------------------
function displayResults(result) {
  gameState.finalResult = result;

  // Switch screen
  gameplayScreen.classList.add('hidden');
  resultsScreen.classList.remove('hidden');

  // Fill in numbers
  finalScoreVal.textContent = result.totalScore;
  correctCountVal.textContent = result.correctCount;
  totalAttemptedVal.textContent = result.totalQuestions;
  accuracyVal.textContent = `${result.percentage}%`;
  timeSpentVal.textContent = `${result.timeSpent}s`;

  // Performance badges & title
  resultTitle.textContent = 'Chị em chúc các anh team RWN mạnh khoẻ, vui vẻ nhé !';
  resultSubtitle.textContent = `Chúc a ${result.playerName} ngày men's day cười haha lên nào !`;

  if (result.percentage >= 80) {
    resultBadgeIcon.textContent = '🌟';
  } else if (result.percentage >= 50) {
    resultBadgeIcon.textContent = '🎉';
  } else {
    resultBadgeIcon.textContent = '💪';
  }
  triggerConfetti();
  sounds.playVictory();

  // Render Detailed Review List
  renderReviewList(result.detailedResults);
}

// Confetti burst
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  }
}

// Render Review Details
function renderReviewList(details) {
  reviewList.innerHTML = '';
  if (!details || details.length === 0) return;

  details.forEach((item, idx) => {
    const card = document.createElement('div');
    const isCorrect = item.isCorrect;

    card.className = `p-4 rounded-2xl border ${
      isCorrect 
        ? 'bg-emerald-950/20 border-emerald-500/40' 
        : 'bg-rose-950/20 border-rose-500/40'
    } text-left transition-all`;

    const selectedLetter = item.selectedOption || 'Chưa chọn';
    const correctLetter = item.correctOption;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="font-bold text-white text-sm">
          <span class="text-slate-400">Câu ${idx + 1}:</span> ${escapeHtml(item.question)}
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
          isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }">
          ${isCorrect ? '✓ Đúng' : '✗ Sai'}
        </span>
      </div>

      ${item.image_url ? `
        <div class="my-2 max-w-xs">
          <img src="${escapeHtml(item.image_url)}" alt="Hình ảnh câu hỏi" class="max-h-32 rounded-xl border border-slate-700/80 object-contain bg-slate-950 p-1" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs my-2.5">
        <div class="p-2 rounded-xl ${item.selectedOption === 'A' ? 'ring-1 ring-white/50' : ''} ${item.correctOption === 'A' ? 'bg-emerald-900/40 text-emerald-200 font-semibold' : 'bg-slate-900/60 text-slate-300'}">
          <strong>A:</strong> ${escapeHtml(item.option_a)}
        </div>
        <div class="p-2 rounded-xl ${item.selectedOption === 'B' ? 'ring-1 ring-white/50' : ''} ${item.correctOption === 'B' ? 'bg-emerald-900/40 text-emerald-200 font-semibold' : 'bg-slate-900/60 text-slate-300'}">
          <strong>B:</strong> ${escapeHtml(item.option_b)}
        </div>
        <div class="p-2 rounded-xl ${item.selectedOption === 'C' ? 'ring-1 ring-white/50' : ''} ${item.correctOption === 'C' ? 'bg-emerald-900/40 text-emerald-200 font-semibold' : 'bg-slate-900/60 text-slate-300'}">
          <strong>C:</strong> ${escapeHtml(item.option_c)}
        </div>
        <div class="p-2 rounded-xl ${item.selectedOption === 'D' ? 'ring-1 ring-white/50' : ''} ${item.correctOption === 'D' ? 'bg-emerald-900/40 text-emerald-200 font-semibold' : 'bg-slate-900/60 text-slate-300'}">
          <strong>D:</strong> ${escapeHtml(item.option_d)}
        </div>
      </div>

      <div class="mt-2 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
        <div>Bạn đã chọn: <strong class="${isCorrect ? 'text-emerald-400' : 'text-rose-400'}">${selectedLetter}</strong> | Đáp án đúng: <strong class="text-emerald-400">${correctLetter}</strong></div>
        ${item.explanation ? `<div class="mt-1 text-slate-400 italic">💡 Giải thích: ${escapeHtml(item.explanation)}</div>` : ''}
      </div>
    `;

    reviewList.appendChild(card);
  });
}

// Toggle Review
toggleReviewBtn.addEventListener('click', () => {
  const isHidden = reviewContainer.classList.contains('hidden');
  if (isHidden) {
    reviewContainer.classList.remove('hidden');
    toggleReviewBtn.textContent = 'Ẩn chi tiết đáp án';
    reviewContainer.scrollIntoView({ behavior: 'smooth' });
  } else {
    reviewContainer.classList.add('hidden');
    toggleReviewBtn.textContent = '📋 Xem lại đáp án chi tiết';
  }
});

// Play Again
playAgainBtn.addEventListener('click', () => {
  resultsScreen.classList.add('hidden');
  reviewContainer.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
});

// -------------------------------------------------------------
// LEADERBOARD MODAL
// -------------------------------------------------------------
async function openLeaderboard() {
  leaderboardModal.classList.remove('hidden');
  leaderboardModalList.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Đang tải bảng xếp hạng...</div>';

  try {
    const res = await fetch('/api/play/leaderboard?limit=20');
    const data = await res.json();

    if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
      leaderboardModalList.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Chưa có lượt chơi nào được ghi nhận. Hãy là người đầu tiên!</div>';
      return;
    }

    leaderboardModalList.innerHTML = '';
    data.leaderboard.forEach((item, index) => {
      const row = document.createElement('div');
      
      let rankBadge = '';
      if (index === 0) rankBadge = '<span class="text-xl">🥇</span>';
      else if (index === 1) rankBadge = '<span class="text-xl">🥈</span>';
      else if (index === 2) rankBadge = '<span class="text-xl">🥉</span>';
      else rankBadge = `<span class="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center">${index + 1}</span>`;

      row.className = 'flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-7 flex justify-center">${rankBadge}</div>
          <div>
            <div class="font-bold text-sm text-white">${escapeHtml(item.player_name)}</div>
            <div class="text-[11px] text-slate-400">
              Đúng: ${item.correct_count}/${item.total_questions} • Thời gian: ${item.time_spent || 0}s
            </div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-base font-extrabold text-indigo-400">${item.score}</span>
          <span class="text-xs text-slate-400 block">điểm</span>
        </div>
      `;

      leaderboardModalList.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    leaderboardModalList.innerHTML = '<div class="text-center py-8 text-rose-400 text-sm">Không thể tải dữ liệu bảng xếp hạng.</div>';
  }
}

function closeLeaderboard() {
  leaderboardModal.classList.add('hidden');
}

viewLeaderboardBtn.addEventListener('click', openLeaderboard);
showLeaderboardFromResultsBtn.addEventListener('click', openLeaderboard);
closeLeaderboardModalBtn.addEventListener('click', closeLeaderboard);
closeLeaderboardBottomBtn.addEventListener('click', closeLeaderboard);

leaderboardModal.addEventListener('click', (e) => {
  if (e.target === leaderboardModal) closeLeaderboard();
});

// Helper to escape HTML safely
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
