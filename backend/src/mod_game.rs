// MODULE 4: Gamified Rehabilitation Engine
// Assigned to: Member 4
use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use crate::db::DbPool;
use crate::models::{ApiResponse, CreateGameSessionInput, GameSession, HighScore};

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/sessions", get(list_game_sessions).post(create_game_session))
        .route("/high-scores", get(list_high_scores))
}

async fn list_game_sessions(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<GameSession>>> {
    let sessions = sqlx::query_as::<_, GameSession>(
        "SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage, created_at FROM game_sessions ORDER BY id DESC"
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

async fn list_high_scores(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<HighScore>>> {
    let scores = sqlx::query_as::<_, HighScore>(
        "SELECT id, patient_id, game_type, highest_score, updated_at FROM high_scores ORDER BY highest_score DESC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "High scores fetched successfully".into(),
        data: Some(scores),
    })
}

async fn create_game_session(
    State(pool): State<DbPool>,
    Json(payload): Json<CreateGameSessionInput>,
) -> Json<ApiResponse<GameSession>> {
    // 1. Insert the new game session
    let insert_res = sqlx::query(
        "INSERT INTO game_sessions (patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(payload.patient_id)
    .bind(payload.exercise_id)
    .bind(&payload.game_type)
    .bind(payload.duration_seconds)
    .bind(payload.score)
    .bind(payload.accuracy_percentage)
    .execute(&pool)
    .await;

    match insert_res {
        Ok(result) => {
            let new_id = result.last_insert_rowid();

            // 2. Upsert into high_scores if this beats the personal record
            let _ = sqlx::query(
                "INSERT INTO high_scores (patient_id, game_type, highest_score, updated_at)
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(patient_id, game_type) DO UPDATE SET
                    highest_score = CASE WHEN excluded.highest_score > high_scores.highest_score THEN excluded.highest_score ELSE high_scores.highest_score END,
                    updated_at = CURRENT_TIMESTAMP"
            )
            .bind(payload.patient_id)
            .bind(&payload.game_type)
            .bind(payload.score)
            .execute(&pool)
            .await;

            let created = sqlx::query_as::<_, GameSession>(
                "SELECT id, patient_id, exercise_id, game_type, duration_seconds, score, accuracy_percentage, created_at FROM game_sessions WHERE id = ?"
            )
            .bind(new_id)
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();

            Json(ApiResponse {
                success: true,
                message: "Game session saved and high scores updated".into(),
                data: created,
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            message: format!("Failed to save game session: {}", e),
            data: None,
        }),
    }
}