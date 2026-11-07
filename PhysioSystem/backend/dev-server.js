const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../physio.db');
const db = new DatabaseSync(dbPath);

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;
  const method = req.method;

  try {
    // Health check
    if (url === '/api/health') {
      res.end(JSON.stringify({ status: 'ok', message: 'PhysioSystem Dev API running (Node SQLite bridge)' }));
      return;
    }

    // Module 1: Auth
    if (url === '/api/auth/users' && method === 'GET') {
      const data = db.prepare('SELECT id, username, full_name, role FROM users').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // Module 2: Patients list
    if (url === '/api/prescription/patients' && method === 'GET') {
      const query = `
        SELECT 
          pp.id AS patient_profile_id,
          pp.user_id,
          u.full_name,
          pp.gender,
          pp.date_of_birth,
          pp.injury_diagnosis,
          pp.baseline_rom_score,
          pp.notes
        FROM patient_profiles pp
        JOIN users u ON pp.user_id = u.id
        ORDER BY u.full_name ASC
      `;
      const data = db.prepare(query).all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // Module 2: Register New Patient
    if (url === '/api/prescription/patients' && method === 'POST') {
      const body = await readBody(req);
      const fullName = (body.full_name || '').trim();
      if (!fullName) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Patient name required' }));
        return;
      }

      const username = fullName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
      db.prepare("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, 'demo_hash', ?, 'patient')")
        .run(username, fullName);
      const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);

      db.prepare(
        "INSERT INTO patient_profiles (user_id, date_of_birth, gender, injury_diagnosis, baseline_rom_score, notes) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(user.id, body.date_of_birth || null, body.gender || 'Male', body.injury_diagnosis || 'Physical Therapy', body.baseline_rom_score || 70, body.notes || null);

      const profile = db.prepare("SELECT id FROM patient_profiles WHERE user_id = ?").get(user.id);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, message: 'Patient created', data: profile.id }));
      return;
    }

    // Module 2: Update Patient
    if (url.startsWith('/api/prescription/patients/') && method === 'PUT') {
      const profileId = Number(url.replace('/api/prescription/patients/', ''));
      const body = await readBody(req);
      db.prepare(
        "UPDATE patient_profiles SET injury_diagnosis = ?, baseline_rom_score = ?, notes = ? WHERE id = ?"
      ).run(body.injury_diagnosis || 'Physical Rehabilitation', body.baseline_rom_score || 85, body.notes || null, profileId);

      res.end(JSON.stringify({ success: true, message: 'Patient updated' }));
      return;
    }

    // Module 2: Treatment Plans (List)
    if (url === '/api/prescription/plans' && method === 'GET') {
      const query = `
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
      `;
      const data = db.prepare(query).all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // Module 2: Treatment Plan Detail (Single)
    if (url.match(/^\/api\/prescription\/plans\/\d+$/) && method === 'GET') {
      const planId = Number(url.replace('/api/prescription/plans/', ''));
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
          COUNT(pe.id) AS exercise_count
        FROM treatment_plans tp
        LEFT JOIN patient_profiles pp ON tp.patient_id = pp.id
        LEFT JOIN users u_patient ON pp.user_id = u_patient.id
        LEFT JOIN users u_doctor ON tp.doctor_id = u_doctor.id
        LEFT JOIN prescribed_exercises pe ON tp.id = pe.plan_id
        WHERE tp.id = ?
        GROUP BY tp.id
      `).get(planId);

      if (!plan) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'Plan not found' }));
        return;
      }

      const exercises = db.prepare(`
        SELECT 
          pe.id,
          pe.plan_id,
          pe.exercise_id,
          COALESCE(e.name, 'Exercise #' || pe.exercise_id) AS exercise_name,
          COALESCE(e.target_body_part, 'General') AS target_body_part,
          COALESCE(e.difficulty, 'easy') AS difficulty,
          pe.sets,
          pe.reps,
          pe.hold_seconds,
          pe.daily_frequency,
          pe.safety_notes,
          pe.order_index
        FROM prescribed_exercises pe
        LEFT JOIN exercises e ON pe.exercise_id = e.id
        WHERE pe.plan_id = ?
        ORDER BY pe.order_index ASC, pe.id ASC
      `).all(planId);

      plan.exercises = exercises;
      res.end(JSON.stringify({ success: true, message: 'OK', data: plan }));
      return;
    }

    // Module 2: Create Treatment Plan
    if (url === '/api/prescription/plans' && method === 'POST') {
      const body = await readBody(req);
      db.prepare(
        "INSERT INTO treatment_plans (patient_id, doctor_id, title, status, start_date, end_date) VALUES (?, ?, ?, 'active', ?, ?)"
      ).run(body.patient_id, body.doctor_id || 1, body.title, body.start_date, body.end_date || null);

      const latestPlan = db.prepare("SELECT id FROM treatment_plans ORDER BY id DESC LIMIT 1").get();
      const planId = latestPlan.id;

      if (Array.isArray(body.exercises)) {
        for (let i = 0; i < body.exercises.length; i++) {
          const ex = body.exercises[i];
          db.prepare(
            "INSERT INTO prescribed_exercises (plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ).run(planId, ex.exercise_id, ex.sets || 3, ex.reps || 10, ex.hold_seconds || 0, ex.daily_frequency || 1, ex.safety_notes || null, i + 1);
        }
      }

      res.writeHead(201);
      res.end(JSON.stringify({ success: true, message: 'Plan created successfully', data: planId }));
      return;
    }

    // Module 2: Update Treatment Plan
    if (url.match(/^\/api\/prescription\/plans\/\d+$/) && method === 'PUT') {
      const planId = Number(url.replace('/api/prescription/plans/', ''));
      const body = await readBody(req);

      db.prepare(
        "UPDATE treatment_plans SET title = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?"
      ).run(body.title, body.start_date, body.end_date || null, body.status || 'active', planId);

      // Re-populate exercises
      db.prepare("DELETE FROM prescribed_exercises WHERE plan_id = ?").run(planId);
      if (Array.isArray(body.exercises)) {
        for (let i = 0; i < body.exercises.length; i++) {
          const ex = body.exercises[i];
          db.prepare(
            "INSERT INTO prescribed_exercises (plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ).run(planId, ex.exercise_id, ex.sets || 3, ex.reps || 10, ex.hold_seconds || 0, ex.daily_frequency || 1, ex.safety_notes || null, i + 1);
        }
      }

      res.end(JSON.stringify({ success: true, message: `Plan #${planId} updated successfully` }));
      return;
    }

    // Module 2: Update Plan Status
    if (url.match(/^\/api\/prescription\/plans\/\d+\/status$/) && method === 'PATCH') {
      const planId = Number(url.split('/')[4]);
      const body = await readBody(req);
      db.prepare("UPDATE treatment_plans SET status = ? WHERE id = ?").run(body.status, planId);
      res.end(JSON.stringify({ success: true, message: `Plan #${planId} status updated` }));
      return;
    }

    // Module 2: Delete Plan
    if (url.match(/^\/api\/prescription\/plans\/\d+$/) && method === 'DELETE') {
      const planId = Number(url.replace('/api/prescription/plans/', ''));
      db.prepare("DELETE FROM prescribed_exercises WHERE plan_id = ?").run(planId);
      db.prepare("DELETE FROM treatment_plans WHERE id = ?").run(planId);
      res.end(JSON.stringify({ success: true, message: `Plan #${planId} deleted` }));
      return;
    }

    // Module 3: Library exercises
    if (url === '/api/library/exercises') {
      const data = db.prepare('SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // Module 4: Rehab Game
    if (url === '/api/game/sessions') {
      const data = db.prepare('SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage FROM game_sessions').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // Module 5: Activity Logs
    if (url === '/api/logger/logs') {
      const data = db.prepare('SELECT id, patient_id, prescribed_exercise_id, logged_by_user_id, completed_sets, completed_reps, achieved_rom_angle, pain_scale, rpe_scale, logged_at FROM activity_logs').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // Module 6: Analytics
    if (url === '/api/analytics/summary') {
      const data = db.prepare('SELECT patient_profile_id, patient_name, injury_diagnosis, total_sessions_logged, average_pain_score, max_rom_achieved, last_activity_date FROM view_patient_recovery_summary').all();
      res.end(JSON.stringify({ success: true, message: 'OK', data }));
      return;
    }

    // Fallback 404
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
