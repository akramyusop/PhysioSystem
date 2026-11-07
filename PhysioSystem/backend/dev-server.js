const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../physio.db');
const db = new DatabaseSync(dbPath);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  try {
    if (pathname === '/api/health') {
      res.end(JSON.stringify({ status: 'ok', message: 'PhysioSystem Dev API running (Node SQLite bridge)' }));
    } else if (pathname === '/api/logger/meta') {
      const nurses = db.prepare("SELECT id, full_name FROM users WHERE role = 'nurse'").all();
      const rawPatients = db.prepare(`
        SELECT p.id as profile_id, 
               ('PT-' || substr('000' || p.id, -3)) as patient_id, 
               u.full_name, 
               p.injury_diagnosis 
        FROM patient_profiles p 
        JOIN users u ON p.user_id = u.id
      `).all();
      const patients = rawPatients.map(p => ({
        ...p,
        avatar_url: p.profile_id === 1 
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : p.profile_id === 2 
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
          : null
      }));
      res.end(JSON.stringify({ success: true, message: 'OK', data: { nurses, patients } }));
    } else if (pathname === '/api/auth/users') {
      const data = db.prepare('SELECT id, username, full_name, role FROM users').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (pathname === '/api/prescription/plans') {
      const data = db.prepare('SELECT id, patient_id, doctor_id, title, status, start_date, end_date FROM treatment_plans').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (pathname === '/api/library/exercises') {
      const data = db.prepare('SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (pathname === '/api/game/sessions') {
      const data = db.prepare('SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage FROM game_sessions').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
    } else if (pathname === '/api/logger/activities' || pathname === '/api/logger/logs') {
      if (req.method === 'POST') {
        const body = await readBody(req);
        const stmt = db.prepare(`
          INSERT INTO activity_logs (patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, voided)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `);
        const result = stmt.run(
          body.patient_id || 'PT-001',
          body.nurse_name || 'Nurse Staff',
          body.activity_type || 'General Mobility',
          Number(body.duration_minutes) || 15,
          body.assistance_level || 'Independent',
          body.notes || ''
        );
        res.end(JSON.stringify({ success: true, message: 'Activity log saved', data: { id: result.lastInsertRowid } }));
      } else {
        const patientId = searchParams.get('patient_id');
        let query = 'SELECT id, patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, logged_at, voided, void_reason FROM activity_logs';
        const params = [];
        if (patientId) {
          query += ' WHERE patient_id = ?';
          params.push(patientId);
        }
        query += ' ORDER BY logged_at DESC LIMIT 100';
        const data = db.prepare(query).all(...params);
        res.end(JSON.stringify({ success: true, message: 'OK', data }));
      }
    } else if (pathname === '/api/logger/vitals') {
      if (req.method === 'POST') {
        const body = await readBody(req);
        const sys = Number(body.bp_systolic) || 120;
        const hr = Number(body.heart_rate) || 72;
        const spo2 = Number(body.spo2) || 98;
        const temp = Number(body.temperature_c) || 37.0;

        let news2 = 0;
        if (sys <= 90 || sys >= 220) news2 += 3;
        else if (sys <= 100) news2 += 2;
        else if (sys <= 110) news2 += 1;

        if (hr <= 40 || hr >= 131) news2 += 3;
        else if (hr >= 111) news2 += 2;
        else if (hr <= 50 || hr >= 91) news2 += 1;

        if (spo2 <= 91) news2 += 3;
        else if (spo2 <= 93) news2 += 2;
        else if (spo2 <= 95) news2 += 1;

        if (temp <= 35.0) news2 += 3;
        else if (temp >= 39.1) news2 += 2;
        else if (temp <= 36.0 || temp >= 38.1) news2 += 1;

        if (body.news2_score !== undefined && body.news2_score !== null) {
          news2 = Number(body.news2_score);
        }

        const stmt = db.prepare(`
          INSERT INTO vital_notes (patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, news2_score, voided)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);
        const result = stmt.run(
          body.patient_id || 'PT-001',
          body.nurse_name || 'Nurse Staff',
          sys,
          Number(body.bp_diastolic) || 80,
          hr,
          spo2,
          temp,
          Number(body.pain_score) || 0,
          body.clinical_remarks || '',
          news2
        );
        res.end(JSON.stringify({ success: true, message: 'Vital note saved', data: { id: result.lastInsertRowid, news2_score: news2 } }));
      } else {
        const patientId = searchParams.get('patient_id');
        let query = 'SELECT id, patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, recorded_at, news2_score, voided, void_reason FROM vital_notes';
        const params = [];
        if (patientId) {
          query += ' WHERE patient_id = ?';
          params.push(patientId);
        }
        query += ' ORDER BY recorded_at DESC LIMIT 100';
        const data = db.prepare(query).all(...params);
        res.end(JSON.stringify({ success: true, message: 'OK', data }));
      }
    } else if (pathname === '/api/logger/void') {
      if (req.method === 'POST') {
        const body = await readBody(req);
        const table = body.record_type === 'activity' ? 'activity_logs' : 'vital_notes';
        const stmt = db.prepare(`UPDATE ${table} SET voided = 1, void_reason = ? WHERE id = ?`);
        stmt.run(body.reason || 'Clinical typo / administrative amendment', Number(body.id));
        res.end(JSON.stringify({ success: true, message: 'Record voided in audit trail' }));
      } else {
        res.writeHead(405);
        res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
      }
        const data = db.prepare(query).all(...params);
        res.end(JSON.stringify({ success: true, message: 'OK', data }));
      }
    } else if (pathname === '/api/analytics/summary') {
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
