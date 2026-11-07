-- 003_update_logger_vitals.sql: Update schema for Module 5 (Nurse & Activity Logger)

DROP VIEW IF EXISTS view_patient_alerts;
DROP VIEW IF EXISTS view_patient_recovery_summary;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS vital_notes;

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    nurse_name TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- e.g., 'Mobility', 'ROM Exercise', 'Gait Training', 'Transfer'
    duration_minutes INTEGER NOT NULL,
    assistance_level TEXT NOT NULL, -- e.g., 'Independent', 'Min Assist', 'Mod Assist', 'Max Assist'
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vital_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    nurse_name TEXT NOT NULL,
    bp_systolic INTEGER NOT NULL,
    bp_diastolic INTEGER NOT NULL,
    heart_rate INTEGER NOT NULL,
    spo2 INTEGER NOT NULL,
    temperature_c REAL NOT NULL,
    pain_score INTEGER NOT NULL, -- 0 to 10 scale
    clinical_remarks TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ensure nurse accounts exist in users table
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role) VALUES 
(5, 'nurse_sarah', 'demo_hash_sarah', 'Sarah Jenkins, RN', 'nurse');

-- Seed realistic initial data for Module 5
INSERT INTO activity_logs (patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, logged_at) VALUES
('PT-001', 'Nurse Sarah Jenkins', 'ROM Exercise', 30, 'Min Assist', 'Patient tolerated gentle passive flexion up to 90 degrees with mild discomfort.', '2026-11-01 09:30:00'),
('PT-001', 'Nurse Mark Davis', 'Bed Mobility & Transfer', 20, 'Independent', 'Independent sit-to-stand transfers performed cleanly 5 times.', '2026-11-02 11:15:00'),
('PT-002', 'Nurse Sarah Jenkins', 'Gait & Ambulation Training', 25, 'Supervision', 'Ambulated 40 meters using quad cane. Good posture, minimal limp.', '2026-11-03 14:00:00');

INSERT INTO vital_notes (patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, recorded_at) VALUES
('PT-001', 'Nurse Sarah Jenkins', 120, 80, 72, 98, 36.8, 3, 'Pre-session baseline vitals stable. No dizziness reported.', '2026-11-01 09:15:00'),
('PT-001', 'Nurse Mark Davis', 128, 84, 78, 97, 36.9, 2, 'Post-exercise recovery vitals normal. Hydration encouraged.', '2026-11-02 11:40:00'),
('PT-002', 'Nurse Sarah Jenkins', 135, 88, 82, 96, 37.0, 5, 'Elevated pain reported in left shoulder during abduction. Cold pack applied.', '2026-11-03 14:30:00');

-- Recreate views for Module 6 compatibility
CREATE VIEW IF NOT EXISTS view_patient_recovery_summary AS
SELECT 
    p.id AS patient_profile_id,
    u.full_name AS patient_name,
    p.injury_diagnosis,
    COUNT(DISTINCT a.id) AS total_sessions_logged,
    ROUND(AVG(v.pain_score), 1) AS average_pain_score,
    NULL AS max_rom_achieved,
    MAX(COALESCE(a.logged_at, v.recorded_at)) AS last_activity_date
FROM patient_profiles p
JOIN users u ON p.user_id = u.id
LEFT JOIN activity_logs a ON ('PT-' || substr('000' || p.id, -3)) = a.patient_id OR CAST(p.id AS TEXT) = a.patient_id
LEFT JOIN vital_notes v ON ('PT-' || substr('000' || p.id, -3)) = v.patient_id OR CAST(p.id AS TEXT) = v.patient_id
GROUP BY p.id;

CREATE VIEW IF NOT EXISTS view_patient_alerts AS
SELECT 
    a.id AS log_id,
    a.patient_id AS patient_id,
    a.nurse_name AS patient_name,
    NULL AS pain_scale,
    NULL AS achieved_rom_angle,
    a.logged_at,
    'Activity: ' || a.activity_type AS alert_type
FROM activity_logs a
UNION ALL
SELECT 
    v.id AS log_id,
    v.patient_id AS patient_id,
    v.nurse_name AS patient_name,
    v.pain_score AS pain_scale,
    NULL AS achieved_rom_angle,
    v.recorded_at AS logged_at,
    'Vital Alert: Pain ' || v.pain_score || '/10' AS alert_type
FROM vital_notes v
WHERE v.pain_score >= 7 OR v.bp_systolic >= 140 OR v.spo2 < 95;

