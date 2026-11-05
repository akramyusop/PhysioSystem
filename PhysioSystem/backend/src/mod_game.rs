// MODULE 4: Gamified Rehabilitation Engine
// Assigned to: Member 4
use axum::{extract::State, routing::get, Json, Router};
use crate::db::DbPool;
use crate::models::{ApiResponse, GameSession};

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/sessions", get(list_game_sessions))
}

async fn list_game_sessions(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<GameSession>>> {
    let sessions = sqlx::query_as::<_, GameSession>(
        "SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage FROM game_sessions"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Game sessions fetched successfully".into(),
        data: Some(sessions),
    })
}
