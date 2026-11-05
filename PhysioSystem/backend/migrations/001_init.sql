-- 001_init.sql: Unified Database Schema for PhysioSystem (Modules 1 - 6)
PRAGMA foreign_keys = ON;

-- ==========================================================
-- MODULE 1: Identity, Auth & Patient Onboarding
-- ==========================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('doctor', 'nurse', 'patient')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth TEXT,
    gender TEXT,
    injury_diagnosis TEXT NOT NULL,
    baseline_rom_score REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- MODULE 3: Patient Guidance & Video Tutorial Library
-- (Defined before Module 2 for foreign key reference)
-- ==========================================================
CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    target_body_part TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
    recommended_frequency TEXT DEFAULT '1x daily',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('video', 'image', 'diagram')),
    url TEXT NOT NULL,
    title TEXT,
    thumbnail_url TEXT
);

-- ==========================================================
-- MODULE 2: Doctor Prescription & Treatment Planner
-- ==========================================================
CREATE TABLE IF NOT EXISTS treatment_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescribed_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    sets INTEGER NOT NULL DEFAULT 3,
    reps INTEGER NOT NULL DEFAULT 10,
    hold_seconds INTEGER DEFAULT 0,
    daily_frequency INTEGER DEFAULT 1,
    safety_notes TEXT,
    order_index INTEGER DEFAULT 0
);

-- ==========================================================
-- MODULE 4: Gamified Rehabilitation Engine
-- ==========================================================
CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    game_type TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    score INTEGER NOT NULL,
    accuracy_percentage REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS high_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    highest_score INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patient_id, game_type)
);

-- ==========================================================
-- MODULE 5: Nurse & Patient Activity Logger
-- ==========================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    prescribed_exercise_id INTEGER REFERENCES prescribed_exercises(id),
    logged_by_user_id INTEGER NOT NULL REFERENCES users(id),
    completed_sets INTEGER NOT NULL,
    completed_reps INTEGER NOT NULL,
    achieved_rom_angle REAL,
    pain_scale INTEGER CHECK(pain_scale BETWEEN 0 AND 10),
    rpe_scale INTEGER CHECK(rpe_scale BETWEEN 1 AND 10),
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vital_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id),
    note_text TEXT NOT NULL,
    alert_flag BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- MODULE 6: Health Condition Analytics & Recovery Dashboard (VIEWs)
-- ==========================================================
CREATE VIEW IF NOT EXISTS view_patient_recovery_summary AS
SELECT 
    p.id AS patient_profile_id,
    u.full_name AS patient_name,
    p.injury_diagnosis,
    COUNT(a.id) AS total_sessions_logged,
    AVG(a.pain_scale) AS average_pain_score,
    MAX(a.achieved_rom_angle) AS max_rom_achieved,
    MAX(a.logged_at) AS last_activity_date
FROM patient_profiles p
JOIN users u ON p.user_id = u.id
LEFT JOIN activity_logs a ON p.id = a.patient_id
GROUP BY p.id;

CREATE VIEW IF NOT EXISTS view_patient_alerts AS
SELECT 
    a.id AS log_id,
    p.id AS patient_id,
    u.full_name AS patient_name,
    a.pain_scale,
    a.achieved_rom_angle,
    a.logged_at,
    'High Pain Alert' AS alert_type
FROM activity_logs a
JOIN patient_profiles p ON a.patient_id = p.id
JOIN users u ON p.user_id = u.id
WHERE a.pain_scale >= 7
UNION ALL
SELECT 
    v.id AS log_id,
    p.id AS patient_id,
    u.full_name AS patient_name,
    NULL AS pain_scale,
    NULL AS achieved_rom_angle,
    v.created_at AS logged_at,
    'Nurse Vital Alert: ' || v.note_text AS alert_type
FROM vital_notes v
JOIN patient_profiles p ON v.patient_id = p.id
JOIN users u ON p.user_id = u.id
WHERE v.alert_flag = 1;
