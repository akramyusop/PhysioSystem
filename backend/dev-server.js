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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  try {
    // Health check
    if (url === '/api/health') {
      res.end(JSON.stringify({ status: 'ok', message: 'PhysioSystem Dev API running (Node SQLite bridge)' }));
      return;
    }

    // ==========================================
    // MODULE 1: AUTH & USERS
    // ==========================================
    if (url === '/api/auth/register' && req.method === 'POST') {
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
      return;
    }

    if (url === '/api/auth/login' && req.method === 'POST') {
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
      return;
    }

    if (url === '/api/auth/users' && req.method === 'GET') {
      const data = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.role, u.avatar_url, p.id as patient_profile_id, p.injury_diagnosis
        FROM users u
        LEFT JOIN patient_profiles p ON u.id = p.user_id
        ORDER BY u.id ASC
      `).all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // ==========================================
    // MODULE 2: DOCTOR PRESCRIPTION PLANNER
    // ==========================================
    // GET /api/prescription/patients
    if (url === '/api/prescription/patients' && req.method === 'GET') {
      const patients = db.prepare(`
        SELECT 
          pp.id AS patient_profile_id,
          pp.user_id,
          u.full_name,
          pp.gender,
          pp.date_of_birth,
          pp.injury_diagnosis,
          pp.baseline_rom_score,
          pp.notes,
          u.avatar_url
        FROM patient_profiles pp
        JOIN users u ON pp.user_id = u.id
        ORDER BY pp.id ASC
      `).all();
      res.end(JSON.stringify({ success: true, message: 'Patients fetched successfully', data: patients }));
      return;
    }

    // POST /api/prescription/patients (Register new patient from doctor workspace)
    if (url === '/api/prescription/patients' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const fullName = String(body.full_name || '').trim();
      const username = 'patient_' + Date.now();
      const diagnosis = String(body.injury_diagnosis || 'Physical Rehabilitation');
      const dob = body.date_of_birth || '1990-01-01';
      const gender = body.gender || 'Not Specified';
      const rom = body.baseline_rom_score !== undefined ? Number(body.baseline_rom_score) : null;
      const notes = body.notes || null;

      const userInsert = db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)');
      const userRes = userInsert.run(username, 'pass', fullName, 'patient');
      const userId = userRes.lastInsertRowid;

      const profileInsert = db.prepare('INSERT INTO patient_profiles (user_id, date_of_birth, gender, injury_diagnosis, baseline_rom_score, notes) VALUES (?, ?, ?, ?, ?, ?)');
      const profileRes = profileInsert.run(userId, dob, gender, diagnosis, rom, notes);
      const profileId = profileRes.lastInsertRowid;

      res.end(JSON.stringify({
        success: true,
        message: 'Patient registered successfully',
        data: profileId
      }));
      return;
    }

    // PUT /api/prescription/patients/:id
    const patientMatch = url.match(/^\/api\/prescription\/patients\/(\d+)$/);
    if (patientMatch && req.method === 'PUT') {
      const profileId = Number(patientMatch[1]);
      const body = await parseJsonBody(req);
      if (body.full_name) {
        db.prepare('UPDATE users SET full_name = ? WHERE id = (SELECT user_id FROM patient_profiles WHERE id = ?)').run(body.full_name, profileId);
      }
      db.prepare(`
        UPDATE patient_profiles 
        SET injury_diagnosis = COALESCE(?, injury_diagnosis),
            baseline_rom_score = COALESCE(?, baseline_rom_score),
            notes = COALESCE(?, notes),
            gender = COALESCE(?, gender),
            date_of_birth = COALESCE(?, date_of_birth)
        WHERE id = ?
      `).run(body.injury_diagnosis || null, body.baseline_rom_score ?? null, body.notes || null, body.gender || null, body.date_of_birth || null, profileId);

      res.end(JSON.stringify({ success: true, message: 'Patient profile updated' }));
      return;
    }

    // PATCH /api/prescription/plans/:id/status
    const statusMatch = url.match(/^\/api\/prescription\/plans\/(\d+)\/status$/);
    if (statusMatch && req.method === 'PATCH') {
      const planId = Number(statusMatch[1]);
      const body = await parseJsonBody(req);
      const status = body.status || 'active';
      db.prepare('UPDATE treatment_plans SET status = ? WHERE id = ?').run(status, planId);
      res.end(JSON.stringify({ success: true, message: 'Status updated', data: { id: planId, status } }));
      return;
    }

    // GET /api/prescription/plans/:id (Detail with prescribed exercises)
    const planDetailMatch = url.match(/^\/api\/prescription\/plans\/(\d+)$/);
    if (planDetailMatch && req.method === 'GET') {
      const planId = Number(planDetailMatch[1]);
      const plan = db.prepare(`
        SELECT 
          tp.id,
          tp.patient_id,
          COALESCE(u_patient.full_name, 'Patient #' || tp.patient_id) AS patient_name,
          COALESCE(pp.injury_diagnosis, 'N/A') AS patient_diagnosis,
          tp.doctor_id,
          COALESCE(u_doctor.full_name, 'Dr. Sarah Chen, MD') AS doctor_name,
          tp.title,
          tp.status,
          tp.start_date,
          tp.end_date,
          (SELECT COUNT(*) FROM prescribed_exercises pe WHERE pe.plan_id = tp.id) AS exercise_count
        FROM treatment_plans tp
        LEFT JOIN patient_profiles pp ON tp.patient_id = pp.id
        LEFT JOIN users u_patient ON pp.user_id = u_patient.id
        LEFT JOIN users u_doctor ON tp.doctor_id = u_doctor.id
        WHERE tp.id = ?
      `).get(planId);

      if (!plan) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'Treatment plan not found' }));
        return;
      }

      const exercises = db.prepare(`
        SELECT 
          pe.id,
          pe.plan_id,
          pe.exercise_id,
          e.name AS exercise_name,
          e.target_body_part,
          e.difficulty,
          pe.sets,
          pe.reps,
          pe.hold_seconds,
          pe.daily_frequency,
          pe.safety_notes,
          pe.order_index
        FROM prescribed_exercises pe
        JOIN exercises e ON pe.exercise_id = e.id
        WHERE pe.plan_id = ?
        ORDER BY pe.order_index ASC, pe.id ASC
      `).all(planId);

      res.end(JSON.stringify({
        success: true,
        message: 'Plan details fetched',
        data: { ...plan, exercises }
      }));
      return;
    }

    // PUT /api/prescription/plans/:id (Update plan & prescribed exercises)
    if (planDetailMatch && req.method === 'PUT') {
      const planId = Number(planDetailMatch[1]);
      const body = await parseJsonBody(req);
      db.prepare(`
        UPDATE treatment_plans
        SET title = COALESCE(?, title),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            status = COALESCE(?, status)
        WHERE id = ?
      `).run(body.title || null, body.start_date || null, body.end_date || null, body.status || null, planId);

      if (Array.isArray(body.exercises)) {
        db.prepare('DELETE FROM prescribed_exercises WHERE plan_id = ?').run(planId);
        const insertEx = db.prepare(`
          INSERT INTO prescribed_exercises (plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (let idx = 0; idx < body.exercises.length; idx++) {
          const ex = body.exercises[idx];
          insertEx.run(planId, ex.exercise_id, ex.sets || 3, ex.reps || 10, ex.hold_seconds || 0, ex.daily_frequency || 1, ex.safety_notes || null, ex.order_index || (idx + 1));
        }
      }

      res.end(JSON.stringify({ success: true, message: 'Treatment plan updated successfully' }));
      return;
    }

    // DELETE /api/prescription/plans/:id
    if (planDetailMatch && req.method === 'DELETE') {
      const planId = Number(planDetailMatch[1]);
      db.prepare('DELETE FROM prescribed_exercises WHERE plan_id = ?').run(planId);
      db.prepare('DELETE FROM treatment_plans WHERE id = ?').run(planId);
      res.end(JSON.stringify({ success: true, message: 'Treatment plan deleted', data: { deleted: true } }));
      return;
    }

    // GET /api/prescription/plans
    if (url === '/api/prescription/plans' && req.method === 'GET') {
      const data = db.prepare(`
        SELECT 
          tp.id,
          tp.patient_id,
          COALESCE(u_patient.full_name, 'Patient #' || tp.patient_id) AS patient_name,
          COALESCE(pp.injury_diagnosis, 'N/A') AS patient_diagnosis,
          tp.doctor_id,
          COALESCE(u_doctor.full_name, 'Dr. Sarah Chen, MD') AS doctor_name,
          tp.title,
          tp.status,
          tp.start_date,
          tp.end_date,
          COUNT(pe.id) AS exercise_count
        FROM treatment_plans tp
        LEFT JOIN patient_profiles pp ON tp.patient_id = pp.id
        LEFT JOIN users u_patient ON pp.user_id = u_patient.id
        LEFT JOIN users u_doctor ON tp.doctor_id = u_doctor.id
        LEFT JOIN prescribed_exercises pe ON tp.id = pe.plan_id
        GROUP BY tp.id
        ORDER BY tp.id DESC
      `).all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // POST /api/prescription/plans (Issue new prescription)
    if (url === '/api/prescription/plans' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const patientId = Number(body.patient_id) || 1;
      const doctorId = Number(body.doctor_id) || 1;
      const title = String(body.title || 'Rehabilitation Plan').trim();
      const startDate = body.start_date || new Date().toISOString().split('T')[0];
      const endDate = body.end_date || null;

      const planStmt = db.prepare('INSERT INTO treatment_plans (patient_id, doctor_id, title, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)');
      const planRes = planStmt.run(patientId, doctorId, title, 'active', startDate, endDate);
      const planId = planRes.lastInsertRowid;

      if (Array.isArray(body.exercises) && body.exercises.length > 0) {
        const exStmt = db.prepare(`
          INSERT INTO prescribed_exercises (plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (let idx = 0; idx < body.exercises.length; idx++) {
          const ex = body.exercises[idx];
          exStmt.run(planId, Number(ex.exercise_id), Number(ex.sets) || 3, Number(ex.reps) || 10, Number(ex.hold_seconds) || 0, Number(ex.daily_frequency) || 1, ex.safety_notes || null, ex.order_index || (idx + 1));
        }
      }

      res.end(JSON.stringify({
        success: true,
        message: 'Treatment plan issued successfully!',
        data: { id: planId, patient_id: patientId, doctor_id: doctorId, title, status: 'active', start_date: startDate, end_date: endDate }
      }));
      return;
    }

    // ==========================================
    // MODULE 3: EXERCISE LIBRARY & PATIENT GUIDANCE
    // ==========================================
    if (url === '/api/library/catalog' && req.method === 'GET') {
      const exercises = db.prepare('SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises ORDER BY id ASC').all();
      const allMedia = db.prepare('SELECT id, exercise_id, asset_type, url, title, thumbnail_url FROM media_assets ORDER BY id ASC').all();
      const catalog = exercises.map(ex => ({
        ...ex,
        media_assets: allMedia.filter(m => m.exercise_id === ex.id)
      }));
      res.end(JSON.stringify({ success: true, message: 'Full exercise catalog with media fetched successfully', data: catalog }));
      return;
    }

    if (url === '/api/library/patients' && req.method === 'GET') {
      const patients = db.prepare(`
        SELECT 
          p.id AS patient_id,
          u.id AS user_id,
          u.full_name,
          p.injury_diagnosis,
          p.baseline_rom_score,
          p.notes
        FROM patient_profiles p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.id ASC
      `).all();
      res.end(JSON.stringify({ success: true, message: 'Patients fetched for guidance view', data: patients }));
      return;
    }

    const guidanceMatch = url.match(/^\/api\/library\/guidance\/(\d+)$/);
    if (guidanceMatch && req.method === 'GET') {
      const patientId = Number(guidanceMatch[1]);
      const patient = db.prepare(`
        SELECT 
          p.id AS patient_id,
          u.id AS user_id,
          u.full_name,
          p.injury_diagnosis,
          p.baseline_rom_score,
          p.notes
        FROM patient_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(patientId);

      if (!patient) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'Patient profile not found', data: null }));
        return;
      }

      const rows = db.prepare(`
        SELECT 
          pe.id AS prescribed_id,
          tp.id AS plan_id,
          tp.title AS plan_title,
          tp.status AS plan_status,
          u.full_name AS doctor_name,
          e.id AS exercise_id,
          e.name AS exercise_name,
          e.description,
          e.target_body_part,
          e.difficulty,
          e.recommended_frequency,
          pe.sets,
          pe.reps,
          pe.hold_seconds,
          pe.daily_frequency,
          pe.safety_notes,
          pe.order_index
        FROM prescribed_exercises pe
        JOIN treatment_plans tp ON pe.plan_id = tp.id
        JOIN users u ON tp.doctor_id = u.id
        JOIN exercises e ON pe.exercise_id = e.id
        WHERE tp.patient_id = ? AND tp.status = 'active'
        ORDER BY pe.order_index ASC, pe.id ASC
      `).all(patientId);

      const allMedia = db.prepare('SELECT id, exercise_id, asset_type, url, title, thumbnail_url FROM media_assets ORDER BY id ASC').all();

      const items = rows.map(r => ({
        prescribed_id: r.prescribed_id,
        plan_id: r.plan_id,
        plan_title: r.plan_title,
        doctor_name: r.doctor_name,
        exercise_id: r.exercise_id,
        exercise_name: r.exercise_name,
        description: r.description,
        target_body_part: r.target_body_part,
        difficulty: r.difficulty,
        recommended_frequency: r.recommended_frequency,
        sets: r.sets,
        reps: r.reps,
        hold_seconds: r.hold_seconds || 0,
        daily_frequency: r.daily_frequency || 1,
        safety_notes: r.safety_notes,
        order_index: r.order_index || 1,
        media_assets: allMedia.filter(m => m.exercise_id === r.exercise_id)
      }));

      res.end(JSON.stringify({
        success: true,
        message: 'Patient daily guidance fetched successfully',
        data: { patient, items }
      }));
      return;
    }

    if (url === '/api/library/exercises' && req.method === 'GET') {
      const data = db.prepare(`
        SELECT 
          e.id, 
          e.name, 
          e.description, 
          e.target_body_part, 
          e.difficulty, 
          e.recommended_frequency,
          m.url AS media_url,
          m.asset_type AS media_type,
          m.title AS media_title,
          m.thumbnail_url
        FROM exercises e
        LEFT JOIN media_assets m ON e.id = m.exercise_id
      `).all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    if (url === '/api/library/exercises' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const name = String(body.name || '').trim();
      const desc = String(body.description || '').trim();
      const target = String(body.target_body_part || 'General').trim();
      const diff = body.difficulty || 'easy';
      const freq = body.recommended_frequency || '1x daily';

      const insertStmt = db.prepare('INSERT INTO exercises (name, description, target_body_part, difficulty, recommended_frequency) VALUES (?, ?, ?, ?, ?)');
      const resEx = insertStmt.run(name, desc, target, diff, freq);
      const exerciseId = resEx.lastInsertRowid;

      if (body.initial_media_url) {
        db.prepare('INSERT INTO media_assets (exercise_id, asset_type, url, title, thumbnail_url) VALUES (?, ?, ?, ?, ?)')
          .run(exerciseId, body.initial_media_type || 'video', body.initial_media_url, body.initial_media_title || name, body.initial_thumbnail_url || null);
      }

      const created = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exerciseId);
      const media = db.prepare('SELECT * FROM media_assets WHERE exercise_id = ?').all(exerciseId);
      res.end(JSON.stringify({ success: true, message: 'Exercise created', data: { ...created, media_assets: media } }));
      return;
    }

    const exIdMatch = url.match(/^\/api\/library\/exercises\/(\d+)$/);
    if (exIdMatch && req.method === 'PUT') {
      const exId = Number(exIdMatch[1]);
      const body = await parseJsonBody(req);
      db.prepare('UPDATE exercises SET name = COALESCE(?, name), description = COALESCE(?, description), target_body_part = COALESCE(?, target_body_part), difficulty = COALESCE(?, difficulty), recommended_frequency = COALESCE(?, recommended_frequency) WHERE id = ?')
        .run(body.name || null, body.description || null, body.target_body_part || null, body.difficulty || null, body.recommended_frequency || null, exId);
      const updated = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exId);
      const media = db.prepare('SELECT * FROM media_assets WHERE exercise_id = ?').all(exId);
      res.end(JSON.stringify({ success: true, message: 'Exercise updated', data: { ...updated, media_assets: media } }));
      return;
    }

    if (exIdMatch && req.method === 'DELETE') {
      const exId = Number(exIdMatch[1]);
      db.prepare('DELETE FROM media_assets WHERE exercise_id = ?').run(exId);
      db.prepare('DELETE FROM exercises WHERE id = ?').run(exId);
      res.end(JSON.stringify({ success: true, message: 'Exercise deleted', data: exId }));
      return;
    }

    const exMediaMatch = url.match(/^\/api\/library\/exercises\/(\d+)\/media$/);
    if (exMediaMatch && req.method === 'POST') {
      const exId = Number(exMediaMatch[1]);
      const body = await parseJsonBody(req);
      const stmt = db.prepare('INSERT INTO media_assets (exercise_id, asset_type, url, title, thumbnail_url) VALUES (?, ?, ?, ?, ?)');
      const resMedia = stmt.run(exId, body.asset_type || 'video', body.url, body.title || null, body.thumbnail_url || null);
      const created = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(resMedia.lastInsertRowid);
      res.end(JSON.stringify({ success: true, message: 'Media added', data: created }));
      return;
    }

    const delMediaMatch = url.match(/^\/api\/library\/media\/(\d+)$/);
    if (delMediaMatch && req.method === 'DELETE') {
      const mediaId = Number(delMediaMatch[1]);
      db.prepare('DELETE FROM media_assets WHERE id = ?').run(mediaId);
      res.end(JSON.stringify({ success: true, message: 'Media removed', data: mediaId }));
      return;
    }

    // ==========================================
    // MODULE 4: GAMIFIED REHAB ENGINE
    // ==========================================
    if (url === '/api/game/sessions' && req.method === 'GET') {
      const data = db.prepare('SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage, created_at FROM game_sessions ORDER BY id DESC').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    if (url === '/api/game/high-scores' && req.method === 'GET') {
      const data = db.prepare('SELECT id, patient_id, game_type, highest_score, updated_at FROM high_scores ORDER BY highest_score DESC').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    if (url === '/api/game/sessions' && req.method === 'POST') {
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
      return;
    }

    // ==========================================
    // MODULE 5: NURSE & ACTIVITY LOGGER
    // ==========================================
    if (url === '/api/logger/meta' && req.method === 'GET') {
      const nurses = db.prepare("SELECT id, full_name FROM users WHERE role = 'nurse'").all();
      const patients = db.prepare("SELECT p.id as profile_id, ('PT-' || substr('000' || p.id, -3)) as patient_id, u.full_name, p.injury_diagnosis, u.avatar_url FROM patient_profiles p JOIN users u ON p.user_id = u.id").all();
      res.end(JSON.stringify({
        success: true,
        message: 'Meta loaded',
        data: { nurses, patients }
      }));
      return;
    }

    if ((url === '/api/logger/activities' || url === '/api/logger/logs') && req.method === 'GET') {
      const data = db.prepare("SELECT id, patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, logged_at, voided, void_reason FROM activity_logs ORDER BY id DESC").all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    if (url === '/api/logger/activities' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const stmt = db.prepare("INSERT INTO activity_logs (patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes) VALUES (?, ?, ?, ?, ?, ?)");
      const result = stmt.run(body.patient_id, body.nurse_name, body.activity_type, Number(body.duration_minutes) || 15, body.assistance_level, body.notes || null);
      const created = db.prepare("SELECT * FROM activity_logs WHERE id = ?").get(result.lastInsertRowid);
      res.end(JSON.stringify({ success: true, message: 'Activity logged', data: created }));
      return;
    }

    if (url === '/api/logger/vitals' && req.method === 'GET') {
      const data = db.prepare("SELECT id, patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, recorded_at, news2_score, voided, void_reason FROM vital_notes ORDER BY id DESC").all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    if (url === '/api/logger/vitals' && req.method === 'POST') {
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
      return;
    }

    if (url === '/api/logger/void' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (body.record_type === 'activity') {
        db.prepare("UPDATE activity_logs SET voided = 1, void_reason = ? WHERE id = ?").run(body.reason, body.id);
      } else {
        db.prepare("UPDATE vital_notes SET voided = 1, void_reason = ? WHERE id = ?").run(body.reason, body.id);
      }
      res.end(JSON.stringify({ success: true, message: 'Record voided successfully' }));
      return;
    }

    // ==========================================
    // MODULE 6: CLINICAL RECOVERY ANALYTICS
    // ==========================================
    if (url === '/api/analytics/summary' && req.method === 'GET') {
      const data = db.prepare('SELECT patient_profile_id, patient_name, injury_diagnosis, total_sessions_logged, average_pain_score, max_rom_achieved, last_activity_date FROM view_patient_recovery_summary').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: 'Route not found' }));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, message: err.message }));
  }
});

const PORT = 3001;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`PhysioSystem Backend Dev API listening on http://127.0.0.1:${PORT}`);
});