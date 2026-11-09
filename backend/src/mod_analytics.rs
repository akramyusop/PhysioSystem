// MODULE 6: Health Condition Analytics & Recovery Dashboard
// Assigned to: Member 6
use axum::{extract::State, routing::get, Json, Router};
use crate::db::DbPool;
use crate::models::{ApiResponse, PatientRecoverySummary};

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/summary", get(get_recovery_summary))
}

async fn get_recovery_summary(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<PatientRecoverySummary>>> {
    let summary = sqlx::query_as::<_, PatientRecoverySummary>(
        "SELECT patient_profile_id, patient_name, injury_diagnosis, total_sessions_logged, average_pain_score, max_rom_achieved, last_activity_date FROM view_patient_recovery_summary"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Recovery summaries fetched successfully".into(),
        data: Some(summary),
    })
}
