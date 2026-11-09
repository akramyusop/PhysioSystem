export interface RegisterPayload {
  full_name: string;
  username: string;
  password?: string;
  role?: 'patient' | 'doctor';
  injury_diagnosis: string;
  date_of_birth?: string;
  gender?: string;
  baseline_rom_score?: number;
  avatar_url?: string | null;
}
// Auth session user
export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'patient';
  patient_profile_id?: number | null;
  injury_diagnosis?: string | null;
  avatar_url?: string | null;
}

export interface LoginPayload {
  username: string;
  password?: string;
}
// Shared API Models for all 6 Modules

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// Module 1: Auth & User
export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'patient';
}

export interface PatientProfile {
  id: number;
  user_id: number;
  date_of_birth?: string;
  gender?: string;
  injury_diagnosis: string;
  baseline_rom_score?: number;
  notes?: string;
}

// Module 2: Treatment Plans & Prescriptions
export interface TreatmentPlan {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_diagnosis?: string;
  doctor_id: number;
  doctor_name?: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  start_date: string;
  end_date?: string | null;
  exercise_count?: number;
  exercises?: PrescribedExercise[];
}

export interface PrescribedExercise {
  id: number;
  plan_id: number;
  exercise_id: number;
  exercise_name?: string;
  target_body_part?: string;
  difficulty?: string;
  sets: number;
  reps: number;
  hold_seconds?: number;
  daily_frequency?: number;
  safety_notes?: string;
  order_index?: number;
}

export interface TreatmentPlanDetail {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_diagnosis?: string;
  doctor_id: number;
  doctor_name?: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  start_date: string;
  end_date?: string | null;
  exercise_count?: number;
  exercises: PrescribedExercise[];
}

export interface PatientOption {
  patient_profile_id: number;
  user_id: number;
  full_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  injury_diagnosis: string;
  baseline_rom_score?: number | null;
  notes?: string | null;
  avatar_url?: string | null;
}

export interface CreatePatientPayload {
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  injury_diagnosis: string;
  baseline_rom_score?: number;
  notes?: string;
}

export interface UpdatePatientPayload {
  full_name?: string;
  gender?: string;
  date_of_birth?: string;
  injury_diagnosis: string;
  baseline_rom_score?: number;
  notes?: string;
}

export interface CreatePrescribedExerciseInput {
  exercise_id: number;
  sets: number;
  reps: number;
  hold_seconds?: number;
  daily_frequency?: number;
  safety_notes?: string;
  order_index?: number;
}

export interface CreatePlanPayload {
  patient_id: number;
  doctor_id: number;
  title: string;
  start_date: string;
  end_date?: string;
  exercises?: CreatePrescribedExerciseInput[];
}

export interface UpdatePlanPayload {
  title?: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'completed' | 'paused';
  exercises?: CreatePrescribedExerciseInput[];
}

// Module 3: Exercise Library
export interface Exercise {
  id: number;
  name: string;
  description: string;
  target_body_part: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended_frequency?: string;
  media_url?: string | null;
  media_type?: 'video' | 'image' | 'diagram' | null;
  media_title?: string | null;
  thumbnail_url?: string | null;
}

export interface MediaAsset {
  id: number;
  exercise_id: number;
  asset_type: 'video' | 'image' | 'diagram';
  url: string;
  title?: string;
  thumbnail_url?: string;
}

// Module 4: Rehab Game
export interface GameSession {
  id: number;
  patient_id: number;
  exercise_id?: number;
  game_type: string;
  duration_seconds: number;
  score: number;
  accuracy_percentage?: number;
  created_at?: string;
}

export interface CreateGameSessionInput {
  patient_id: number;
  exercise_id?: number;
  game_type: string;
  duration_seconds: number;
  score: number;
  accuracy_percentage?: number;
}

export interface HighScore {
  id: number;
  patient_id: number;
  game_type: string;
  highest_score: number;
  updated_at?: string;
}

// Module 5: Activity Log
export interface ActivityLog {
  id: number;
  patient_id: number;
  prescribed_exercise_id?: number;
  logged_by_user_id: number;
  completed_sets: number;
  completed_reps: number;
  achieved_rom_angle?: number;
  pain_scale?: number;
  rpe_scale?: number;
  logged_at: string;
}

// Module 6: Analytics Summary & Detailed Trends
export interface PatientRecoverySummary {
  patient_profile_id: number;
  patient_name: string;
  injury_diagnosis: string;
  baseline_rom_score?: number | null;
  total_sessions_logged: number;
  average_pain_score?: number | null;
  latest_pain_score?: number | null;
  max_rom_achieved?: number | null;
  adherence_rate_pct?: number;
  clinical_alert_count?: number;
  last_activity_date?: string | null;
}

export interface RomDataPoint {
  date: string;
  rom_angle: number;
  target_angle: number;
  exercise_name: string;
  source: 'game' | 'nurse' | 'self';
}

export interface PainDataPoint {
  date: string;
  pain_score: number;
  source: string;
  notes?: string;
}

export interface ClinicalAlertItem {
  id: string | number;
  date: string;
  patient_name?: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  alert_type: string;
  message: string;
  acknowledged?: boolean;
}

export interface PatientTrendData {
  patient_info: {
    id: number;
    name: string;
    diagnosis: string;
    baseline_rom: number;
    doctor_name: string;
    start_date: string;
  };
  rom_progression: RomDataPoint[];
  pain_trend: PainDataPoint[];
  adherence: {
    prescribed_sessions: number;
    completed_sessions: number;
    compliance_pct: number;
    streak_days: number;
  };
  clinical_alerts: ClinicalAlertItem[];
}