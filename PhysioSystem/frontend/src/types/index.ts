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

// Module 2: Treatment Plans
export interface TreatmentPlan {
  id: number;
  patient_id: number;
  doctor_id: number;
  title: string;
  status: 'active' | 'completed' | 'paused';
  start_date: string;
  end_date?: string;
}

export interface PrescribedExercise {
  id: number;
  plan_id: number;
  exercise_id: number;
  sets: number;
  reps: number;
  hold_seconds?: number;
  daily_frequency?: number;
  safety_notes?: string;
  order_index?: number;
}

// Module 3: Exercise Library
export interface Exercise {
  id: number;
  name: string;
  description: string;
  target_body_part: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended_frequency?: string;
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
}

// Module 5: Activity Log & Vitals
export interface ActivityLog {
  id?: number;
  patient_id: string;
  nurse_name: string;
  activity_type: string;
  duration_minutes: number;
  assistance_level: string;
  notes?: string;
  logged_at?: string;
  voided?: boolean;
  void_reason?: string;
}

export interface VitalNote {
  id?: number;
  patient_id: string;
  nurse_name: string;
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  spo2: number;
  temperature_c: number;
  pain_score: number;
  clinical_remarks?: string;
  recorded_at?: string;
  news2_score?: number;
  voided?: boolean;
  void_reason?: string;
}

export interface NurseOption {
  id: number;
  full_name: string;
}

export interface PatientOption {
  profile_id: number;
  patient_id: string;
  full_name: string;
  injury_diagnosis: string;
  avatar_url?: string;
}

// Module 6: Analytics Summary
export interface PatientRecoverySummary {
  patient_profile_id: number;
  patient_name: string;
  injury_diagnosis: string;
  total_sessions_logged: number;
  average_pain_score?: number;
  max_rom_achieved?: number;
  last_activity_date?: string;
}
