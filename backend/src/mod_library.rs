// MODULE 3: Patient Guidance & Video Tutorial Library
// Assigned to: Member 3
use axum::{extract::State, routing::get, Json, Router};
use crate::db::DbPool;
use crate::models::{ApiResponse, Exercise};

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/exercises", get(list_exercises))
}

async fn list_exercises(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<Exercise>>> {
    let exercises = sqlx::query_as::<_, Exercise>(
        "SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Exercises fetched successfully".into(),
        data: Some(exercises),
    })
}
