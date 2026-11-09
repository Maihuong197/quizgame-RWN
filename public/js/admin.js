// Admin Portal Logic

let adminToken = localStorage.getItem('quiz_admin_token') || '';
let allQuestions = [];

// DOM Elements - Auth
const adminLoginSection = document.getElementById('adminLoginSection');
const adminDashboardSection = document.getElementById('adminDashboardSection');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

// DOM Elements - Stats
const statTotalQuestions = document.getElementById('statTotalQuestions');
const statTotalPlays = document.getElementById('statTotalPlays');
const statAvgScore = document.getElementById('statAvgScore');
const statTopPlayer = document.getElementById('statTopPlayer');

// DOM Elements - Tabs
const tabQuestionsBtn = document.getElementById('tabQuestionsBtn');
const tabLeaderboardBtn = document.getElementById('tabLeaderboardBtn');
const tabSettingsBtn = document.getElementById('tabSettingsBtn');
const tabQuestionsContent = document.getElementById('tabQuestionsContent');
const tabLeaderboardContent = document.getElementById('tabLeaderboardContent');
const tabSettingsContent = document.getElementById('tabSettingsContent');

// DOM Elements - Questions Management
const questionsList = document.getElementById('questionsList');
const searchQuestionInput = document.getElementById('searchQuestionInput');
const filteredQuestionCount = document.getElementById('filteredQuestionCount');
const openAddModalBtn = document.getElementById('openAddModalBtn');

// DOM Elements - Question Modal Form
const questionModal = document.getElementById('questionModal');
const modalTitle = document.getElementById('modalTitle');
const questionForm = document.getElementById('questionForm');
const editingQuestionId = document.getElementById('editingQuestionId');
const inputQuestionText = document.getElementById('inputQuestionText');
const inputOptionA = document.getElementById('inputOptionA');
const inputOptionB = document.getElementById('inputOptionB');
const inputOptionC = document.getElementById('inputOptionC');
const inputOptionD = document.getElementById('inputOptionD');
const inputPoints = document.getElementById('inputPoints');
const inputExplanation = document.getElementById('inputExplanation');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// DOM Elements - Image Handling
const imageFileInput = document.getElementById('imageFileInput');
const imageUrlInput = document.getElementById('imageUrlInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
let currentUploadedImageUrl = '';

// DOM Elements - Leaderboard & Settings
const adminLeaderboardList = document.getElementById('adminLeaderboardList');
const clearLeaderboardBtn = document.getElementById('clearLeaderboardBtn');
const changePasswordForm = document.getElementById('changePasswordForm');
const newPasswordInput = document.getElementById('newPasswordInput');

// DOM Elements - Share Player Link & QR Code
const sharePlayerLinkInput = document.getElementById('sharePlayerLinkInput');
const copyPlayerLinkBtn = document.getElementById('copyPlayerLinkBtn');
const openQrCodeModalBtn = document.getElementById('openQrCodeModalBtn');
const qrCodeModal = document.getElementById('qrCodeModal');
const closeQrModalBtn = document.getElementById('closeQrModalBtn');
const closeQrBottomBtn = document.getElementById('closeQrBottomBtn');
const qrcodeCanvas = document.getElementById('qrcodeCanvas');
const qrCodeUrlDisplay = document.getElementById('qrCodeUrlDisplay');
let qrCodeInstance = null;
let playerShareUrl = '';

// -------------------------------------------------------------
// AUTHENTICATION & INITIALIZATION
// -------------------------------------------------------------
async function initAdmin() {
  if (!adminToken) {
    showLoginView();
    return;
  }

  try {
    const res = await fetch('/api/admin/verify', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.ok) {
      showDashboardView();
      loadAllData();
    } else {
      adminToken = '';
      localStorage.removeItem('quiz_admin_token');
      showLoginView();
    }
  } catch (err) {
    console.error(err);
    showLoginView();
  }
}

function showLoginView() {
  adminLoginSection.classList.remove('hidden');
  adminDashboardSection.classList.add('hidden');
  adminLogoutBtn.classList.add('hidden');
}

function showDashboardView() {
  adminLoginSection.classList.add('hidden');
  adminDashboardSection.classList.remove('hidden');
  adminLogoutBtn.classList.remove('hidden');
}

// Login Submit
adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErrorMsg.classList.add('hidden');

  const password = adminPasswordInput.value;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (data.success && data.token) {
      adminToken = data.token;
      localStorage.setItem('quiz_admin_token', adminToken);
      adminPasswordInput.value = '';
      showDashboardView();
      loadAllData();
    } else {
      loginErrorMsg.textContent = data.message || 'Mật khẩu không đúng';
      loginErrorMsg.classList.remove('hidden');
    }
  } catch (err) {
    loginErrorMsg.textContent = 'Lỗi kết nối đến máy chủ. Vui lòng thử lại!';
    loginErrorMsg.classList.remove('hidden');
  }
});

// Logout
adminLogoutBtn.addEventListener('click', () => {
  if (confirm('Bạn có chắc muốn đăng xuất khỏi trang quản trị?')) {
    adminToken = '';
    localStorage.removeItem('quiz_admin_token');
    showLoginView();
  }
});

// Helper authenticated fetch
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  headers['Authorization'] = `Bearer ${adminToken}`;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  options.headers = headers;

  const res = await fetch(url, options);
  if (res.status === 401) {
    alert('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!');
    adminToken = '';
    localStorage.removeItem('quiz_admin_token');
    showLoginView();
    throw new Error('Unauthorized');
  }
  return res.json();
}

// Load stats and questions
async function loadAllData() {
  await Promise.all([loadStats(), loadQuestions(), loadLeaderboard(), loadNetworkShareInfo()]);
}

// -------------------------------------------------------------
// SHARE LINK & QR CODE
// -------------------------------------------------------------
async function loadNetworkShareInfo() {
  try {
    const data = await authFetch('/api/admin/network-info');
    if (data.success && data.lanUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        playerShareUrl = data.lanUrl;
      } else {
        playerShareUrl = window.location.origin;
      }
    } else {
      playerShareUrl = window.location.origin;
    }
  } catch (e) {
    playerShareUrl = window.location.origin;
  }
  if (sharePlayerLinkInput) {
    sharePlayerLinkInput.value = playerShareUrl;
  }
}

// Copy Share Link
if (copyPlayerLinkBtn) {
  copyPlayerLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(sharePlayerLinkInput.value);
      const originalText = copyPlayerLinkBtn.innerHTML;
      copyPlayerLinkBtn.innerHTML = '✓ Đã chép!';
      copyPlayerLinkBtn.classList.replace('bg-indigo-600', 'bg-emerald-600');
      setTimeout(() => {
        copyPlayerLinkBtn.innerHTML = originalText;
        copyPlayerLinkBtn.classList.replace('bg-emerald-600', 'bg-indigo-600');
      }, 2000);
    } catch {
      sharePlayerLinkInput.select();
      document.execCommand('copy');
      alert('Đã sao chép link người chơi!');
    }
  });
}

// Open QR Code Modal
if (openQrCodeModalBtn) {
  openQrCodeModalBtn.addEventListener('click', () => {
    const url = sharePlayerLinkInput.value || window.location.origin;
    qrCodeUrlDisplay.textContent = url;
    qrcodeCanvas.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      qrCodeInstance = new QRCode(qrcodeCanvas, {
        text: url,
        width: 190,
        height: 190,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    qrCodeModal.classList.remove('hidden');
  });
}

function closeQrModal() {
  qrCodeModal.classList.add('hidden');
}

if (closeQrModalBtn) closeQrModalBtn.addEventListener('click', closeQrModal);
if (closeQrBottomBtn) closeQrBottomBtn.addEventListener('click', closeQrModal);
if (qrCodeModal) {
  qrCodeModal.addEventListener('click', (e) => {
    if (e.target === qrCodeModal) closeQrModal();
  });
}

// -------------------------------------------------------------
// STATS
// -------------------------------------------------------------
async function loadStats() {
  try {
    const data = await authFetch('/api/admin/stats');
    if (data.success && data.stats) {
      statTotalQuestions.textContent = data.stats.totalQuestions;
      statTotalPlays.textContent = data.stats.totalPlays;
      statAvgScore.textContent = `${data.stats.averageScore}đ`;
      
      if (data.stats.topPlayer) {
        statTopPlayer.textContent = `${data.stats.topPlayer.player_name} (${data.stats.topPlayer.score}đ)`;
      } else {
        statTopPlayer.textContent = 'Chưa có lượt chơi';
      }
    }
  } catch (e) {
    console.error('Error loading stats:', e);
  }
}

// -------------------------------------------------------------
// QUESTIONS MANAGEMENT
// -------------------------------------------------------------
async function loadQuestions() {
  try {
    questionsList.innerHTML = '<div class="text-center py-10 text-slate-400">Đang tải danh sách câu hỏi...</div>';
    const data = await authFetch('/api/admin/questions');
    if (data.success) {
      allQuestions = data.questions || [];
      renderQuestionsList();
    }
  } catch (e) {
    console.error('Error loading questions:', e);
    questionsList.innerHTML = '<div class="text-center py-10 text-rose-400">Không thể tải danh sách câu hỏi.</div>';
  }
}

function renderQuestionsList() {
  const keyword = searchQuestionInput.value.toLowerCase().trim();
  const filtered = allQuestions.filter(q => 
    q.question.toLowerCase().includes(keyword) ||
    q.option_a.toLowerCase().includes(keyword) ||
    q.option_b.toLowerCase().includes(keyword) ||
    q.option_c.toLowerCase().includes(keyword) ||
    q.option_d.toLowerCase().includes(keyword)
  );

  filteredQuestionCount.textContent = filtered.length;

  if (filtered.length === 0) {
    questionsList.innerHTML = `
      <div class="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700/50">
        <div class="text-4xl mb-2">🔍</div>
        <p class="text-slate-400 text-sm">Không tìm thấy câu hỏi nào phù hợp.</p>
      </div>
    `;
    return;
  }

  questionsList.innerHTML = '';
  filtered.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-sm transition-all hover:border-slate-600';

    const getOptionClass = (letter) => {
      return q.correct_option === letter 
        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-semibold ring-1 ring-emerald-500/30' 
        : 'bg-slate-900/60 border border-slate-800 text-slate-300';
    };

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4 mb-3">
        <div class="flex items-start gap-2.5">
          <span class="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 shrink-0">
            #${q.id}
          </span>
          <h4 class="font-bold text-white text-base leading-snug">
            ${escapeHtml(q.question)}
          </h4>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 font-semibold mr-1">
            +${q.points || 10}đ
          </span>
          <button data-id="${q.id}" class="edit-btn p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 transition-colors" title="Chỉnh sửa câu hỏi">
            ✏️
          </button>
          <button data-id="${q.id}" class="delete-btn p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors" title="Xóa câu hỏi">
            🗑️
          </button>
        </div>
      </div>

      <!-- 4 Options Grid -->
      ${q.image_url ? `
        <div class="mb-3">
          <img src="${escapeHtml(q.image_url)}" alt="Ảnh minh họa câu hỏi" class="max-h-36 rounded-xl border border-slate-700/80 object-contain bg-slate-950 p-1 shadow-sm" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3">
        <div class="p-2.5 rounded-xl flex items-center gap-2 ${getOptionClass('A')}">
          <span class="font-bold w-5 h-5 rounded flex items-center justify-center ${q.correct_option === 'A' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}">A</span>
          <span>${escapeHtml(q.option_a)}</span>
        </div>
        <div class="p-2.5 rounded-xl flex items-center gap-2 ${getOptionClass('B')}">
          <span class="font-bold w-5 h-5 rounded flex items-center justify-center ${q.correct_option === 'B' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}">B</span>
          <span>${escapeHtml(q.option_b)}</span>
        </div>
        <div class="p-2.5 rounded-xl flex items-center gap-2 ${getOptionClass('C')}">
          <span class="font-bold w-5 h-5 rounded flex items-center justify-center ${q.correct_option === 'C' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}">C</span>
          <span>${escapeHtml(q.option_c)}</span>
        </div>
        <div class="p-2.5 rounded-xl flex items-center gap-2 ${getOptionClass('D')}">
          <span class="font-bold w-5 h-5 rounded flex items-center justify-center ${q.correct_option === 'D' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}">D</span>
          <span>${escapeHtml(q.option_d)}</span>
        </div>
      </div>

      ${q.explanation ? `
        <div class="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
          💡 <span class="font-semibold text-slate-300">Giải thích:</span> ${escapeHtml(q.explanation)}
        </div>
      ` : ''}
    `;

    questionsList.appendChild(card);
  });

  // Attach Edit and Delete listeners
  questionsList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openEditModal(id);
    });
  });

  questionsList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleDeleteQuestion(id);
    });
  });
}

searchQuestionInput.addEventListener('input', renderQuestionsList);

// -------------------------------------------------------------
// QUESTION MODAL (ADD / EDIT) & IMAGE HANDLING
// -------------------------------------------------------------
function openAddModal() {
  modalTitle.textContent = 'Thêm Câu Hỏi Mới';
  editingQuestionId.value = '';
  questionForm.reset();
  inputPoints.value = '10';

  // Reset image
  currentUploadedImageUrl = '';
  imageUrlInput.value = '';
  imageFileInput.value = '';
  imagePreview.src = '';
  imagePreviewContainer.classList.add('hidden');
  removeImageBtn.classList.add('hidden');

  // default radio to A
  const defaultRadio = document.querySelector('input[name="correctOptionRadio"][value="A"]');
  if (defaultRadio) defaultRadio.checked = true;

  questionModal.classList.remove('hidden');
  inputQuestionText.focus();
}

function openEditModal(id) {
  const q = allQuestions.find(item => String(item.id) === String(id));
  if (!q) return;

  modalTitle.textContent = `Chỉnh Sửa Câu Hỏi #${q.id}`;
  editingQuestionId.value = q.id;
  inputQuestionText.value = q.question;
  inputOptionA.value = q.option_a;
  inputOptionB.value = q.option_b;
  inputOptionC.value = q.option_c;
  inputOptionD.value = q.option_d;
  inputPoints.value = q.points || 10;
  inputExplanation.value = q.explanation || '';

  // Load image
  currentUploadedImageUrl = q.image_url || '';
  imageUrlInput.value = q.image_url || '';
  imageFileInput.value = '';
  if (q.image_url) {
    imagePreview.src = q.image_url;
    imagePreviewContainer.classList.remove('hidden');
    removeImageBtn.classList.remove('hidden');
  } else {
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    removeImageBtn.classList.add('hidden');
  }

  const targetRadio = document.querySelector(`input[name="correctOptionRadio"][value="${q.correct_option}"]`);
  if (targetRadio) targetRadio.checked = true;

  questionModal.classList.remove('hidden');
}

function closeModal() {
  questionModal.classList.add('hidden');
}

// Image upload handling
imageFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('Dung lượng ảnh tối đa là 5MB!');
    imageFileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const base64Data = reader.result;
    try {
      const data = await authFetch('/api/admin/upload-image', {
        method: 'POST',
        body: { base64Data }
      });

      if (data.success && data.imageUrl) {
        currentUploadedImageUrl = data.imageUrl;
        imageUrlInput.value = data.imageUrl;
        imagePreview.src = data.imageUrl;
        imagePreviewContainer.classList.remove('hidden');
        removeImageBtn.classList.remove('hidden');
      } else {
        alert(data.message || 'Lỗi tải ảnh lên');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tải ảnh lên máy chủ');
    }
  };
  reader.readAsDataURL(file);
});

// Image URL typed
imageUrlInput.addEventListener('input', () => {
  const url = imageUrlInput.value.trim();
  if (url) {
    currentUploadedImageUrl = url;
    imagePreview.src = url;
    imagePreviewContainer.classList.remove('hidden');
    removeImageBtn.classList.remove('hidden');
  } else {
    currentUploadedImageUrl = '';
    imagePreviewContainer.classList.add('hidden');
    removeImageBtn.classList.add('hidden');
  }
});

// Remove image
removeImageBtn.addEventListener('click', () => {
  currentUploadedImageUrl = '';
  imageUrlInput.value = '';
  imageFileInput.value = '';
  imagePreview.src = '';
  imagePreviewContainer.classList.add('hidden');
  removeImageBtn.classList.add('hidden');
});

openAddModalBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

questionModal.addEventListener('click', (e) => {
  if (e.target === questionModal) closeModal();
});

// Submit Form (Add or Edit)
questionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editingQuestionId.value;
  const question = inputQuestionText.value.trim();
  const option_a = inputOptionA.value.trim();
  const option_b = inputOptionB.value.trim();
  const option_c = inputOptionC.value.trim();
  const option_d = inputOptionD.value.trim();
  const points = parseInt(inputPoints.value, 10) || 10;
  const explanation = inputExplanation.value.trim();
  const selectedRadio = document.querySelector('input[name="correctOptionRadio"]:checked');

  if (!selectedRadio) {
    alert('Vui lòng chọn đáp án đúng (A, B, C hoặc D)!');
    return;
  }
  const correct_option = selectedRadio.value;
  const image_url = currentUploadedImageUrl || imageUrlInput.value.trim() || '';

  const payload = {
    question,
    image_url,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option,
    explanation,
    points
  };

  try {
    let result;
    if (id) {
      // Edit existing
      result = await authFetch(`/api/admin/questions/${id}`, {
        method: 'PUT',
        body: payload
      });
    } else {
      // Add new
      result = await authFetch('/api/admin/questions', {
        method: 'POST',
        body: payload
      });
    }

    if (result.success) {
      closeModal();
      await loadQuestions();
      await loadStats();
      alert(result.message || 'Lưu câu hỏi thành công!');
    } else {
      alert(result.message || 'Lỗi khi lưu câu hỏi');
    }
  } catch (err) {
    console.error(err);
    alert('Không thể lưu câu hỏi. Vui lòng kiểm tra lại!');
  }
});

// Delete question
async function handleDeleteQuestion(id) {
  if (!confirm(`Bạn có chắc chắn muốn xóa câu hỏi #${id}? Hành động này không thể hoàn tác.`)) {
    return;
  }

  try {
    const result = await authFetch(`/api/admin/questions/${id}`, {
      method: 'DELETE'
    });

    if (result.success) {
      await loadQuestions();
      await loadStats();
    } else {
      alert(result.message || 'Lỗi khi xóa câu hỏi');
    }
  } catch (err) {
    console.error(err);
    alert('Không thể xóa câu hỏi. Vui lòng thử lại!');
  }
}

// -------------------------------------------------------------
// LEADERBOARD TAB
// -------------------------------------------------------------
async function loadLeaderboard() {
  try {
    adminLeaderboardList.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Đang tải lịch sử người chơi...</div>';
    const res = await fetch('/api/play/leaderboard?limit=50');
    const data = await res.json();

    if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
      adminLeaderboardList.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Chưa có người chơi nào tham gia.</div>';
      return;
    }

    adminLeaderboardList.innerHTML = '';
    data.leaderboard.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60';

      const dateStr = new Date(item.created_at).toLocaleString('vi-VN');

      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="w-7 h-7 rounded-full bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">
            ${index + 1}
          </span>
          <div>
            <div class="font-bold text-sm text-white">${escapeHtml(item.player_name)}</div>
            <div class="text-[11px] text-slate-400">
              Đúng: ${item.correct_count}/${item.total_questions} • Thời gian: ${item.time_spent}s • ${dateStr}
            </div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-base font-extrabold text-indigo-400">${item.score}</span>
          <span class="text-xs text-slate-400 block">điểm</span>
        </div>
      `;
      adminLeaderboardList.appendChild(row);
    });
  } catch (e) {
    console.error('Error loading leaderboard:', e);
    adminLeaderboardList.innerHTML = '<div class="text-center py-8 text-rose-400 text-sm">Lỗi tải dữ liệu bảng xếp hạng.</div>';
  }
}

clearLeaderboardBtn.addEventListener('click', async () => {
  if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử điểm số và bảng xếp hạng?')) {
    return;
  }

  try {
    const result = await authFetch('/api/admin/leaderboard', {
      method: 'DELETE'
    });
    if (result.success) {
      alert('Đã xóa sạch bảng xếp hạng!');
      await loadLeaderboard();
      await loadStats();
    }
  } catch (err) {
    console.error(err);
    alert('Không thể xóa bảng xếp hạng. Vui lòng thử lại!');
  }
});

// -------------------------------------------------------------
// SETTINGS TAB (CHANGE PASSWORD)
// -------------------------------------------------------------
changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = newPasswordInput.value.trim();

  if (newPassword.length < 4) {
    alert('Mật khẩu mới phải có ít nhất 4 ký tự!');
    return;
  }

  try {
    const result = await authFetch('/api/admin/change-password', {
      method: 'POST',
      body: { newPassword }
    });

    if (result.success) {
      alert('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.');
      newPasswordInput.value = '';
    } else {
      alert(result.message || 'Lỗi khi đổi mật khẩu');
    }
  } catch (err) {
    console.error(err);
    alert('Không thể đổi mật khẩu. Vui lòng thử lại!');
  }
});

// -------------------------------------------------------------
// TAB SWITCHING
// -------------------------------------------------------------
tabQuestionsBtn.addEventListener('click', () => switchTab('questions'));
tabLeaderboardBtn.addEventListener('click', () => switchTab('leaderboard'));
tabSettingsBtn.addEventListener('click', () => switchTab('settings'));

function switchTab(tab) {
  // Reset buttons
  tabQuestionsBtn.className = 'px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium text-sm transition-all';
  tabLeaderboardBtn.className = 'px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium text-sm transition-all';
  tabSettingsBtn.className = 'px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium text-sm transition-all';

  // Hide all contents
  tabQuestionsContent.classList.add('hidden');
  tabLeaderboardContent.classList.add('hidden');
  tabSettingsContent.classList.add('hidden');

  if (tab === 'questions') {
    tabQuestionsBtn.className = 'px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md transition-all';
    tabQuestionsContent.classList.remove('hidden');
    loadQuestions();
  } else if (tab === 'leaderboard') {
    tabLeaderboardBtn.className = 'px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md transition-all';
    tabLeaderboardContent.classList.remove('hidden');
    loadLeaderboard();
  } else if (tab === 'settings') {
    tabSettingsBtn.className = 'px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md transition-all';
    tabSettingsContent.classList.remove('hidden');
  }
}

// Escape helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Auto init on page load
initAdmin();
