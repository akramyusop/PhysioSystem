// MODULE 2: Doctor Prescription & Treatment Planner
// Assigned to: Member 2
use axum::{extract::State, routing::get, Json, Router};
use crate::db::DbPool;
use crate::models::{ApiResponse, TreatmentPlan};

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/plans", get(list_treatment_plans))
}

async fn list_treatment_plans(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<TreatmentPlan>>> {
    let plans = sqlx::query_as::<_, TreatmentPlan>(
        "SELECT id, patient_id, doctor_id, title, status, start_date, end_date FROM treatment_plans"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Treatment plans fetched successfully".into(),
        data: Some(plans),
    })
}
