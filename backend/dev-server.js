const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../physio.db');
const db = new DatabaseSync(dbPath);

// Ensure migrations are loaded
const migrations = [
  '001_init.sql',
  '002_seed.sql',
  '003_update_logger_vitals.sql',
  '004_clinical_audit_fields.sql'
];

for (const m of migrations) {
  const p = path.resolve(__dirname, 'migrations', m);
  if (fs.existsSync(p)) {
    try { db.exec(fs.readFileSync(p, 'utf8')); } catch (_) {}
  }
}

function calculateNews2(bpSys, hr, spo2, temp) {
  let score = 0;
  if (bpSys <= 90 || bpSys >= 220) score += 3;
  else if (bpSys <= 100) score += 2;
  else if (bpSys <= 110) score += 1;

  if (hr <= 40 || hr >= 131) score += 3;
  else if (hr >= 111) score += 2;
  else if (hr <= 50 || hr >= 91) score += 1;

  if (spo2 <= 91) score += 3;
  else if (spo2 <= 93) score += 2;
  else if (spo2 <= 95) score += 1;

  if (temp <= 35.0) score += 3;
  else if (temp >= 39.1) score += 2;
  else if (temp <= 36.0 || temp >= 38.1) score += 1;

  return score;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  try {
    if (url === '/api/health') {
      res.end(JSON.stringify({ status: 'ok', message: 'PhysioSystem Dev API running (Node SQLite bridge)' }));
    } else if (url === '/api/auth/register' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const username = String(body.username || '').trim().toLowerCase();
      const fullName = String(body.full_name || '').trim();
      const role = body.role || 'patient';
      const diagnosis = String(body.injury_diagnosis || 'General Physiotherapy / Rehabilitation');
      const dob = body.date_of_birth || '2000-01-01';
      const gender = body.gender || 'Not Specified';
      const rom = body.baseline_rom_score !== undefined ? Number(body.baseline_rom_score) : null;
      const avatarUrl = body.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

      if (!username || !fullName) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Username and Full Name are required' }));
        return;
      }

      try {
        const userInsert = db.prepare('INSERT INTO users (username, password_hash, full_name, role, avatar_url) VALUES (?, ?, ?, ?, ?)');
        const userResult = userInsert.run(username, 'hash_pass', fullName, role, avatarUrl);
        const userId = userResult.lastInsertRowid;

        let patientProfileId = null;
        if (role === 'patient') {
          const profileInsert = db.prepare('INSERT INTO patient_profiles (user_id, date_of_birth, gender, injury_diagnosis, baseline_rom_score) VALUES (?, ?, ?, ?, ?)');
          const profileResult = profileInsert.run(userId, dob, gender, diagnosis, rom);
          patientProfileId = profileResult.lastInsertRowid;
        }

        res.end(JSON.stringify({
          success: true,
          message: 'Account registered successfully',
          data: {
            id: userId,
            username,
            full_name: fullName,
            role,
            avatar_url: avatarUrl,
            patient_profile_id: patientProfileId,
            injury_diagnosis: diagnosis,
          }
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Username already exists or database error: ' + err.message }));
      }
    } else if (url === '/api/auth/login' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const username = String(body.username || '').trim().toLowerCase();
      
      const user = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.role, u.avatar_url, p.id as patient_profile_id, p.injury_diagnosis
        FROM users u
        LEFT JOIN patient_profiles p ON u.id = p.user_id
        WHERE LOWER(u.username) = ?
      `).get(username);

      if (user) {
        res.end(JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            avatar_url: user.avatar_url || null,
            patient_profile_id: user.patient_profile_id || null,
            injury_diagnosis: user.injury_diagnosis || null,
          }
        }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ success: false, message: 'Invalid username or credentials' }));
      }
    } else if (url === '/api/auth/users' && req.method === 'GET') {
      const data = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.role, u.avatar_url, p.id as patient_profile_id, p.injury_diagnosis
        FROM users u
        LEFT JOIN patient_profiles p ON u.id = p.user_id
        ORDER BY u.id ASC
      `).all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/prescription/plans' && req.method === 'GET') {
      const data = db.prepare('SELECT id, patient_id, doctor_id, title, status, start_date, end_date FROM treatment_plans').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/library/exercises' && req.method === 'GET') {
      const data = db.prepare('SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/game/sessions' && req.method === 'GET') {
      const data = db.prepare('SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage, created_at FROM game_sessions ORDER BY id DESC').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/game/high-scores' && req.method === 'GET') {
      const data = db.prepare('SELECT id, patient_id, game_type, highest_score, updated_at FROM high_scores ORDER BY highest_score DESC').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/game/sessions' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const patientId = Number(body.patient_id) || 1;
      const exerciseId = body.exercise_id ? Number(body.exercise_id) : null;
      const gameType = String(body.game_type || 'Upper-Limb Fruit Reach');
      const durationSeconds = Number(body.duration_seconds) || 0;
      const score = Number(body.score) || 0;
      const accuracyPercentage = body.accuracy_percentage !== undefined ? Number(body.accuracy_percentage) : null;

      const insertStmt = db.prepare(
        'INSERT INTO game_sessions (patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const result = insertStmt.run(patientId, exerciseId, gameType, durationSeconds, score, accuracyPercentage);

      const upsertHighScore = db.prepare(
        `INSERT INTO high_scores (patient_id, game_type, highest_score, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(patient_id, game_type) DO UPDATE SET
           highest_score = CASE WHEN excluded.highest_score > high_scores.highest_score THEN excluded.highest_score ELSE high_scores.highest_score END,
           updated_at = CURRENT_TIMESTAMP`
      );
      upsertHighScore.run(patientId, gameType, score);

      const created = db
        .prepare('SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage, created_at FROM game_sessions WHERE id = ?')
        .get(result.lastInsertRowid);

      res.end(JSON.stringify({
        success: true,
        message: 'Game session saved and high scores updated',
        data: created,
      }));
    } else if (url === '/api/logger/meta' && req.method === 'GET') {
      const nurses = db.prepare("SELECT id, full_name FROM users WHERE role = 'nurse'").all();
      const patients = db.prepare("SELECT p.id as profile_id, ('PT-' || substr('000' || p.id, -3)) as patient_id, u.full_name, p.injury_diagnosis, u.avatar_url FROM patient_profiles p JOIN users u ON p.user_id = u.id").all();
      res.end(JSON.stringify({
        success: true,
        message: 'Meta loaded',
        data: { nurses, patients }
      }));
    } else if ((url === '/api/logger/activities' || url === '/api/logger/logs') && req.method === 'GET') {
      const data = db.prepare("SELECT id, patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, logged_at, voided, void_reason FROM activity_logs ORDER BY id DESC").all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/logger/activities' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const stmt = db.prepare("INSERT INTO activity_logs (patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes) VALUES (?, ?, ?, ?, ?, ?)");
      const result = stmt.run(body.patient_id, body.nurse_name, body.activity_type, Number(body.duration_minutes) || 15, body.assistance_level, body.notes || null);
      const created = db.prepare("SELECT * FROM activity_logs WHERE id = ?").get(result.lastInsertRowid);
      res.end(JSON.stringify({ success: true, message: 'Activity logged', data: created }));
    } else if (url === '/api/logger/vitals' && req.method === 'GET') {
      const data = db.prepare("SELECT id, patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, recorded_at, news2_score, voided, void_reason FROM vital_notes ORDER BY id DESC").all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/logger/vitals' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const bpSys = Number(body.bp_systolic) || 120;
      const bpDia = Number(body.bp_diastolic) || 80;
      const hr = Number(body.heart_rate) || 72;
      const spo2 = Number(body.spo2) || 98;
      const temp = Number(body.temperature_c) || 36.8;
      const pain = Number(body.pain_score) || 0;
      const news2 = calculateNews2(bpSys, hr, spo2, temp);

      const stmt = db.prepare("INSERT INTO vital_notes (patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, news2_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const result = stmt.run(body.patient_id, body.nurse_name, bpSys, bpDia, hr, spo2, temp, pain, body.clinical_remarks || null, news2);
      const created = db.prepare("SELECT * FROM vital_notes WHERE id = ?").get(result.lastInsertRowid);
      res.end(JSON.stringify({ success: true, message: 'Vitals recorded', data: created }));
    } else if (url === '/api/logger/void' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (body.record_type === 'activity') {
        db.prepare("UPDATE activity_logs SET voided = 1, void_reason = ? WHERE id = ?").run(body.reason, body.id);
      } else {
        db.prepare("UPDATE vital_notes SET voided = 1, void_reason = ? WHERE id = ?").run(body.reason, body.id);
      }
      res.end(JSON.stringify({ success: true, message: 'Record voided successfully' }));
    } else if (url === '/api/analytics/summary' && req.method === 'GET') {
      const data = db.prepare('SELECT patient_profile_id, patient_name, injury_diagnosis, total_sessions_logged, average_pain_score, max_rom_achieved, last_activity_date FROM view_patient_recovery_summary').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, message: 'Route not found' }));
    }
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, message: err.message }));
  }
});

const PORT = 3001;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`PhysioSystem Backend Dev API listening on http://127.0.0.1:${PORT}`);
});