const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// In-memory admin session storage
const activeTokens = new Map(); // token => expiration timestamp

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Admin Auth Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập quản trị viên' });
  }

  const token = authHeader.split(' ')[1];
  const expiresAt = activeTokens.get(token);

  if (!expiresAt || Date.now() > expiresAt) {
    activeTokens.delete(token);
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' });
  }

  next();
}

// -------------------------------------------------------------
// ADMIN APIs
// -------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu' });
  }

  if (db.verifyAdminPassword(password)) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    activeTokens.set(token, expiresAt);
    return res.json({ success: true, token, message: 'Đăng nhập thành công' });
  } else {
    return res.status(401).json({ success: false, message: 'Mật khẩu quản trị viên không chính xác' });
  }
});

// Verify Admin Token
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Phiên đăng nhập hợp lệ' });
});

// Get Admin Stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Network info for sharing player link
app.get('/api/admin/network-info', requireAdmin, (req, res) => {
  try {
    const os = require('node:os');
    const nets = os.networkInterfaces();
    let localIp = 'localhost';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          localIp = net.address;
          break;
        }
      }
    }
    res.json({
      success: true,
      port: PORT,
      localIp,
      lanUrl: `http://${localIp}:${PORT}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get All Questions for Admin
app.get('/api/admin/questions', requireAdmin, (req, res) => {
  try {
    const questions = db.getAllQuestionsAdmin();
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload Image for Admin
app.post('/api/admin/upload-image', requireAdmin, (req, res) => {
  try {
    const { base64Data } = req.body;
    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ success: false, message: 'Dữ liệu ảnh không hợp lệ' });
    }

    const commaIndex = base64Data.indexOf(',');
    if (commaIndex === -1) {
      return res.status(400).json({ success: false, message: 'Định dạng ảnh không hợp lệ' });
    }

    const meta = base64Data.slice(0, commaIndex).toLowerCase();
    const rawBase64 = base64Data.slice(commaIndex + 1).replace(/\s/g, '');
    const dataBuffer = Buffer.from(rawBase64, 'base64');

    let ext = 'jpg';
    if (meta.includes('png')) ext = 'png';
    else if (meta.includes('gif')) ext = 'gif';
    else if (meta.includes('webp')) ext = 'webp';
    else if (meta.includes('svg')) ext = 'svg';
    else if (meta.includes('jpeg')) ext = 'jpg';

    const filename = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, dataBuffer);

    res.json({
      success: true,
      imageUrl: `/uploads/${filename}`,
      message: 'Tải ảnh lên thành công!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải ảnh: ' + err.message });
  }
});

// Create Question
app.post('/api/admin/questions', requireAdmin, (req, res) => {
  try {
    const { question, option_a, option_b, option_c, option_d, correct_option, explanation, points, image_url } = req.body;
    
    if (!question || !option_a || !option_b || !option_c || !option_d || !correct_option) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ câu hỏi và 4 phương án đáp án' });
    }

    if (!['A', 'B', 'C', 'D'].includes(correct_option.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Đáp án đúng phải là một trong các giá trị: A, B, C, D' });
    }

    const newQuestion = db.createQuestion({
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      explanation,
      points: points || 10,
      image_url: image_url || ''
    });

    res.json({ success: true, question: newQuestion, message: 'Thêm câu hỏi thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Question
app.put('/api/admin/questions/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { question, option_a, option_b, option_c, option_d, correct_option, explanation, points, image_url } = req.body;

    if (!question || !option_a || !option_b || !option_c || !option_d || !correct_option) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ câu hỏi và 4 phương án đáp án' });
    }

    if (!['A', 'B', 'C', 'D'].includes(correct_option.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Đáp án đúng phải là A, B, C hoặc D' });
    }

    const updated = db.updateQuestion(id, {
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      explanation,
      points: points || 10,
      image_url: image_url || ''
    });

    res.json({ success: true, question: updated, message: 'Cập nhật câu hỏi thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Question
app.delete('/api/admin/questions/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    db.deleteQuestion(id);
    res.json({ success: true, message: 'Đã xóa câu hỏi thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Change Admin Password
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 4 ký tự' });
    }
    db.updateAdminPassword(newPassword);
    res.json({ success: true, message: 'Đổi mật khẩu quản trị thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear Leaderboard
app.delete('/api/admin/leaderboard', requireAdmin, (req, res) => {
  try {
    db.clearLeaderboard();
    res.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu bảng xếp hạng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// PLAYER APIs
// -------------------------------------------------------------

// Get questions for playing (Secure: doesn't reveal correct answer)
app.get('/api/play/questions', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const questions = db.getQuestionsForPlayer(limit);
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit player answers & compute score
app.post('/api/play/submit', (req, res) => {
  try {
    const { playerName, answers, timeSpent } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có câu trả lời nào được gửi lên' });
    }

    const result = db.evaluatePlayerSubmission({
      playerName: (playerName || '').trim() || 'Người chơi ẩn danh',
      answers,
      timeSpent: Number(timeSpent) || 0
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Leaderboard
app.get('/api/play/leaderboard', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const leaderboard = db.getLeaderboard(limit);
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// PAGE ROUTING
// -------------------------------------------------------------
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback to Player index page
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Quiz Game Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`🎮 Trang người chơi: http://localhost:${PORT}`);
  console.log(`⚙️  Trang quản trị:   http://localhost:${PORT}/admin (Mật khẩu mặc định: admin123)`);
});
