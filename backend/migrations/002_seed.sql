-- 002_seed.sql: Realistic Seed Data for all 6 modules
-- Enables team members 2, 4, 5, and 6 to develop and test immediately

-- 1. USERS (Doctor, Nurse, Patients)
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role) VALUES 
(1, 'doctor_chen', 'demo_hash_chen', 'Dr. Sarah Chen, MD', 'doctor'),
(2, 'nurse_mark', 'demo_hash_mark', 'Mark Davis, RN', 'nurse'),
(3, 'john_doe', 'demo_hash_john', 'John Doe', 'patient'),
(4, 'emily_rose', 'demo_hash_emily', 'Emily Rose', 'patient');

-- 2. PATIENT PROFILES
INSERT OR IGNORE INTO patient_profiles (id, user_id, date_of_birth, gender, injury_diagnosis, baseline_rom_score, notes) VALUES
(1, 3, '1992-05-14', 'Male', 'Post-Op Right ACL Reconstruction', 85.0, 'Surgery 3 weeks ago. Focus on extension and quad activation.'),
(2, 4, '1985-11-20', 'Female', 'Adhesive Capsulitis (Frozen Shoulder - Left)', 45.0, 'Stage 2 freezing phase. Moderate stiffness, avoid forced abduction.');

-- 3. EXERCISE LIBRARY & MEDIA ASSETS
INSERT OR IGNORE INTO exercises (id, name, description, target_body_part, difficulty, recommended_frequency) VALUES
(1, 'Quadriceps Isometric Set', 'Tighten your thigh muscles while keeping your leg straight on the mat. Hold for 5 seconds.', 'Knee / Quadriceps', 'easy', '3x daily'),
(2, 'Heel Slides with Strap', 'Slowly slide your heel toward your buttocks, bending your knee as far as comfortable.', 'Knee / Hamstring', 'medium', '2x daily'),
(3, 'Shoulder Pendulum Swing', 'Lean forward holding a table with your good arm. Let your injured arm hang and gently swing in circles.', 'Shoulder', 'easy', '3x daily'),
(4, 'Wall Angels', 'Stand with back and elbows against the wall, slide arms upward maintaining contact.', 'Upper Back & Shoulder', 'medium', '1x daily');

INSERT OR IGNORE INTO media_assets (id, exercise_id, asset_type, url, title, thumbnail_url) VALUES
(1, 1, 'video', 'https://youtu.be/HscSsKwohoQ?si=RZ5ayjgvD13cVYp1', 'Quadriceps Isometrics Clinic Tutorial', 'https://img.youtube.com/vi/HscSsKwohoQ/hqdefault.jpg'),
(2, 2, 'video', 'https://youtu.be/yxmPWykyov4?si=-rcCPlKPERoT3HVc', 'Heel Slides with Strap Tutorial', 'https://img.youtube.com/vi/yxmPWykyov4/hqdefault.jpg'),
(3, 3, 'video', 'https://youtu.be/zY5nq68IxwA?si=lMe96uvUW6CcaDxf&t=20', 'Shoulder Pendulum Swing Tutorial', 'https://img.youtube.com/vi/zY5nq68IxwA/hqdefault.jpg'),
(4, 4, 'video', 'https://youtu.be/Qlan0IApO7o?si=OjWqXDcMd_TWZ2FM', 'Wall Angels Posture Tutorial', 'https://img.youtube.com/vi/Qlan0IApO7o/hqdefault.jpg');

-- 4. TREATMENT PLANS & PRESCRIBED EXERCISES
INSERT OR IGNORE INTO treatment_plans (id, patient_id, doctor_id, title, status, start_date, end_date) VALUES
(1, 1, 1, 'Phase 1 ACL Recovery Protocol', 'active', '2026-10-15', '2026-12-01'),
(2, 2, 1, 'Shoulder Mobility & Pain Reduction', 'active', '2026-10-20', '2026-11-30');

INSERT OR IGNORE INTO prescribed_exercises (id, plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index) VALUES
(1, 1, 1, 3, 10, 5, 3, 'Stop if sharp knee pain exceeds 4/10.', 1),
(2, 1, 2, 3, 12, 0, 2, 'Use smooth gliding motions. Do not force flexion.', 2),
(3, 2, 3, 2, 15, 0, 3, 'Keep arm completely relaxed; momentum drives the swing.', 1);

-- 5. REHAB GAME SESSIONS & HIGH SCORES
INSERT OR IGNORE INTO game_sessions (id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage) VALUES
(1, 1, 1, 'Rhythm Knee Hold', 120, 850, 92.5),
(2, 1, 1, 'Rhythm Knee Hold', 120, 920, 96.0),
(3, 2, 3, 'Pendulum Orbit Catcher', 90, 640, 88.0);

INSERT OR IGNORE INTO high_scores (id, patient_id, game_type, highest_score) VALUES
(1, 1, 'Rhythm Knee Hold', 920),
(2, 2, 'Pendulum Orbit Catcher', 640);

-- 6. ACTIVITY LOGS & VITAL NOTES
INSERT OR IGNORE INTO activity_logs (id, patient_id, prescribed_exercise_id, logged_by_user_id, completed_sets, completed_reps, achieved_rom_angle, pain_scale, rpe_scale, logged_at) VALUES
(1, 1, 1, 3, 3, 10, 88.0, 3, 4, '2026-10-28 09:30:00'),
(2, 1, 2, 3, 3, 12, 92.0, 4, 5, '2026-10-28 09:45:00'),
(3, 1, 1, 2, 3, 10, 95.0, 2, 3, '2026-11-01 14:00:00'),
(4, 2, 3, 2, 2, 15, 50.0, 6, 6, '2026-11-02 11:15:00');

INSERT OR IGNORE INTO vital_notes (id, patient_id, author_id, note_text, alert_flag, created_at) VALUES
(1, 1, 2, 'Patient showing excellent quad contraction. Swelling reduced to minimal.', 0, '2026-11-01 14:10:00'),
(2, 2, 2, 'Patient reported elevated pain when reaching 55 degrees flexion. Advised icing.', 1, '2026-11-02 11:25:00');
