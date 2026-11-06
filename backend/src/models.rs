use serde::{Deserialize, Serialize};

// Common Status Response
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
}

// Module 1: Auth & User
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PatientProfile {
    pub id: i64,
    pub user_id: i64,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub injury_diagnosis: String,
    pub baseline_rom_score: Option<f64>,
    pub notes: Option<String>,
}

// Module 2: Treatment Plans
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TreatmentPlan {
    pub id: i64,
    pub patient_id: i64,
    pub doctor_id: i64,
    pub title: String,
    pub status: String,
    pub start_date: String,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PrescribedExercise {
    pub id: i64,
    pub plan_id: i64,
    pub exercise_id: i64,
    pub sets: i64,
    pub reps: i64,
    pub hold_seconds: Option<i64>,
    pub daily_frequency: Option<i64>,
    pub safety_notes: Option<String>,
    pub order_index: Option<i64>,
}

// Module 3: Exercise Library
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Exercise {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub target_body_part: String,
    pub difficulty: String,
    pub recommended_frequency: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MediaAsset {
    pub id: i64,
    pub exercise_id: i64,
    pub asset_type: String,
    pub url: String,
    pub title: Option<String>,
    pub thumbnail_url: Option<String>,
}

// Module 4: Rehab Game
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct GameSession {
    pub id: i64,
    pub patient_id: i64,
    pub exercise_id: Option<i64>,
    pub game_type: String,
    pub duration_seconds: i64,
    pub score: i64,
    pub accuracy_percentage: Option<f64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGameSessionInput {
    pub patient_id: i64,
    pub exercise_id: Option<i64>,
    pub game_type: String,
    pub duration_seconds: i64,
    pub score: i64,
    pub accuracy_percentage: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct HighScore {
    pub id: i64,
    pub patient_id: i64,
    pub game_type: String,
    pub highest_score: i64,
    pub updated_at: Option<String>,
}

// Module 5: Activity Log
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ActivityLog {
    pub id: i64,
    pub patient_id: i64,
    pub prescribed_exercise_id: Option<i64>,
    pub logged_by_user_id: i64,
    pub completed_sets: i64,
    pub completed_reps: i64,
    pub achieved_rom_angle: Option<f64>,
    pub pain_scale: Option<i64>,
    pub rpe_scale: Option<i64>,
    pub logged_at: String,
}

// Module 6: Analytics Summary View
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PatientRecoverySummary {
    pub patient_profile_id: i64,
    pub patient_name: String,
    pub injury_diagnosis: String,
    pub total_sessions_logged: i64,
    pub average_pain_score: Option<f64>,
    pub max_rom_achieved: Option<f64>,
    pub last_activity_date: Option<String>,
}