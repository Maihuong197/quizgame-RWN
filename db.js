const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const dbPath = path.join(__dirname, 'quiz.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    points INTEGER DEFAULT 10,
    image_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    time_spent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migration: Ensure image_url exists
try {
  db.exec("ALTER TABLE questions ADD COLUMN image_url TEXT DEFAULT '';");
} catch (e) {
  // column already exists
}

// Seed default admin password if not set
const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

if (!getSetting.get('admin_password')) {
  // Default password: admin123
  setSetting.run('admin_password', 'admin123');
}

// Seed sample questions if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM questions');
const { count } = countStmt.get();

if (count === 0) {
  const insertQuestion = db.prepare(`
    INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_option, explanation, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleQuestions = [
    {
      question: 'Thủ đô của Việt Nam là thành phố nào?',
      option_a: 'Hồ Chí Minh',
      option_b: 'Hà Nội',
      option_c: 'Đà Nẵng',
      option_d: 'Huế',
      correct_option: 'B',
      explanation: 'Hà Nội là thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.',
      points: 10
    },
    {
      question: 'Hành tinh nào trong hệ Mặt Trời còn được gọi là "Hành tinh Đỏ"?',
      option_a: 'Sao Kim',
      option_b: 'Sao Thủy',
      option_c: 'Sao Hỏa',
      option_d: 'Sao Mộc',
      correct_option: 'C',
      explanation: 'Sao Hỏa được gọi là Hành tinh Đỏ do bề mặt chứa nhiều oxit sắt (rỉ sét).',
      points: 10
    },
    {
      question: 'Ngôn ngữ lập trình nào thường được sử dụng nhiều nhất cho phát triển web phía client (frontend)?',
      option_a: 'JavaScript',
      option_b: 'Python',
      option_c: 'C++',
      option_d: 'Java',
      correct_option: 'A',
      explanation: 'JavaScript là ngôn ngữ cốt lõi chạy trực tiếp trên tất cả trình duyệt hiện đại.',
      points: 10
    },
    {
      question: 'Việt Nam có đường bờ biển dài khoảng bao nhiêu km?',
      option_a: '2.500 km',
      option_b: '3.260 km',
      option_c: '4.100 km',
      option_d: '1.800 km',
      correct_option: 'B',
      explanation: 'Việt Nam có bờ biển dài khoảng 3.260 km chạy từ Móng Cái đến Hà Tiên.',
      points: 10
    },
    {
      question: 'Đỉnh núi cao nhất Việt Nam và Đông Dương là đỉnh núi nào?',
      option_a: 'Bạch Mộc Lương Tử',
      option_b: 'Fansipan',
      option_c: 'Tây Côn Lĩnh',
      option_d: 'Pu Si Lung',
      correct_option: 'B',
      explanation: 'Fansipan có độ cao 3.143m, được mệnh danh là Nóc nhà Đông Dương.',
      points: 10
    }
  ];

  for (const q of sampleQuestions) {
    insertQuestion.run(
      q.question,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option,
      q.explanation,
      q.points
    );
  }
}

// Database helper functions
const dbHelpers = {
  // Admin authentication
  verifyAdminPassword(password) {
    const row = getSetting.get('admin_password');
    return row && row.value === password;
  },

  updateAdminPassword(newPassword) {
    setSetting.run('admin_password', newPassword);
  },

  // Questions CRUD
  getAllQuestionsAdmin() {
    const stmt = db.prepare('SELECT * FROM questions ORDER BY id DESC');
    return stmt.all();
  },

  getQuestionById(id) {
    const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    return stmt.get(id);
  },

  createQuestion({ question, option_a, option_b, option_c, option_d, correct_option, explanation, points, image_url }) {
    const stmt = db.prepare(`
      INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_option, explanation, points, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option.toUpperCase(),
      explanation || '',
      Number(points) || 10,
      image_url || ''
    );
    return this.getQuestionById(info.lastInsertRowid);
  },

  updateQuestion(id, { question, option_a, option_b, option_c, option_d, correct_option, explanation, points, image_url }) {
    const stmt = db.prepare(`
      UPDATE questions 
      SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, explanation = ?, points = ?, image_url = ?
      WHERE id = ?
    `);
    stmt.run(
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option.toUpperCase(),
      explanation || '',
      Number(points) || 10,
      image_url || '',
      id
    );
    return this.getQuestionById(id);
  },

  deleteQuestion(id) {
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    stmt.run(id);
    return true;
  },

  // Player Questions (safe, without leaking correct_option)
  getQuestionsForPlayer(limit = null) {
    let sql = 'SELECT id, question, image_url, option_a, option_b, option_c, option_d, points FROM questions ORDER BY RANDOM()';
    if (limit && Number(limit) > 0) {
      sql += ` LIMIT ${Number(limit)}`;
    }
    const stmt = db.prepare(sql);
    return stmt.all();
  },

  // Validate player answers & score calculation
  evaluatePlayerSubmission({ playerName, answers, timeSpent }) {
    // answers format: [{ questionId: 1, selectedOption: 'B' }, ...]
    let totalScore = 0;
    let correctCount = 0;
    const detailedResults = [];

    const getFullQuestion = db.prepare('SELECT * FROM questions WHERE id = ?');

    for (const item of answers) {
      const q = getFullQuestion.get(item.questionId);
      if (!q) continue;

      const isCorrect = (item.selectedOption || '').toUpperCase() === q.correct_option;
      const pointsEarned = isCorrect ? (q.points || 10) : 0;
      
      if (isCorrect) {
        correctCount++;
        totalScore += pointsEarned;
      }

      detailedResults.push({
        questionId: q.id,
        question: q.question,
        image_url: q.image_url || '',
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        selectedOption: item.selectedOption,
        correctOption: q.correct_option,
        isCorrect,
        explanation: q.explanation,
        pointsEarned
      });
    }

    // Save to leaderboard
    const insertLeaderboard = db.prepare(`
      INSERT INTO leaderboard (player_name, score, total_questions, correct_count, time_spent)
      VALUES (?, ?, ?, ?, ?)
    `);
    const leaderboardInfo = insertLeaderboard.run(
      playerName || 'Người chơi ẩn danh',
      totalScore,
      answers.length,
      correctCount,
      Number(timeSpent) || 0
    );

    return {
      submissionId: leaderboardInfo.lastInsertRowid,
      playerName: playerName || 'Người chơi ẩn danh',
      totalScore,
      totalQuestions: answers.length,
      correctCount,
      percentage: answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0,
      timeSpent: Number(timeSpent) || 0,
      detailedResults
    };
  },

  // Leaderboard
  getLeaderboard(limit = 20) {
    const stmt = db.prepare(`
      SELECT id, player_name, score, total_questions, correct_count, time_spent, created_at
      FROM leaderboard
      ORDER BY score DESC, time_spent ASC, created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  clearLeaderboard() {
    db.exec('DELETE FROM leaderboard');
    return true;
  },

  // Stats for Admin Dashboard
  getStats() {
    const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
    const leaderboardCount = db.prepare('SELECT COUNT(*) as count FROM leaderboard').get().count;
    const avgScore = db.prepare('SELECT AVG(score) as avg FROM leaderboard').get().avg || 0;
    const topPlayer = db.prepare('SELECT player_name, score FROM leaderboard ORDER BY score DESC, time_spent ASC LIMIT 1').get() || null;

    return {
      totalQuestions: questionCount,
      totalPlays: leaderboardCount,
      averageScore: Math.round(avgScore),
      topPlayer
    };
  }
};

module.exports = dbHelpers;
