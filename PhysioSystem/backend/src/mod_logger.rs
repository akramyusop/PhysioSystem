// MODULE 5: Nurse & Patient Activity Logger
// Assigned to: Member 5
use axum::{extract::State, routing::get, Json, Router};
use crate::db::DbPool;
use crate::models::{ActivityLog, ApiResponse};

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/logs", get(list_activity_logs))
}

async fn list_activity_logs(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<ActivityLog>>> {
    let logs = sqlx::query_as::<_, ActivityLog>(
        "SELECT id, patient_id, prescribed_exercise_id, logged_by_user_id, completed_sets, completed_reps, achieved_rom_angle, pain_scale, rpe_scale, logged_at FROM activity_logs"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Activity logs fetched successfully".into(),
        data: Some(logs),
    })
}
