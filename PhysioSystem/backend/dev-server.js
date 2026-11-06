const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../physio.db');
const db = new DatabaseSync(dbPath);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  try {
    if (url === '/api/health') {
      res.end(JSON.stringify({ status: 'ok', message: 'PhysioSystem Dev API running (Node SQLite bridge)' }));
    } else if (url === '/api/auth/users') {
      const data = db.prepare('SELECT id, username, full_name, role FROM users').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/prescription/plans') {
      const data = db.prepare('SELECT id, patient_id, doctor_id, title, status, start_date, end_date FROM treatment_plans').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/library/exercises') {
      const data = db.prepare('SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/game/sessions') {
      const data = db.prepare('SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage FROM game_sessions').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/logger/logs') {
      const data = db.prepare('SELECT id, patient_id, prescribed_exercise_id, logged_by_user_id, completed_sets, completed_reps, achieved_rom_angle, pain_scale, rpe_scale, logged_at FROM activity_logs').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (url === '/api/analytics/summary') {
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
