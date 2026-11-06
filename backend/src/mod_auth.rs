// MODULE 1: Identity, Auth & Patient Onboarding
// Assigned to: Member 1
use axum::{extract::State, routing::get, Json, Router};
use crate::db::DbPool;
use crate::models::{ApiResponse, User};

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/users", get(list_users))
}

async fn list_users(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<User>>> {
    let users = sqlx::query_as::<_, User>("SELECT id, username, full_name, role FROM users")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Users fetched successfully".into(),
        data: Some(users),
    })
}
