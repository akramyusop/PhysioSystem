// MODULE 1: Identity, Auth & Patient Onboarding
// Assigned to: Member 1
use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use crate::db::DbPool;
use crate::models::{ApiResponse, User};

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuthUser {
    pub id: i64,
    pub username: String,
    pub full_name: String,
    pub role: String,
    pub patient_profile_id: Option<i64>,
    pub injury_diagnosis: Option<String>,
}

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/users", get(list_users))
        .route("/login", post(login))
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

async fn login(
    State(pool): State<DbPool>,
    Json(payload): Json<LoginPayload>,
) -> Json<ApiResponse<AuthUser>> {
    let username = payload.username.trim().to_lowercase();

    let user = sqlx::query_as::<_, AuthUser>(
        "SELECT u.id, u.username, u.full_name, u.role, p.id as patient_profile_id, p.injury_diagnosis
         FROM users u
         LEFT JOIN patient_profiles p ON u.id = p.user_id
         WHERE LOWER(u.username) = ?"
    )
    .bind(username)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten();

    match user {
        Some(u) => Json(ApiResponse {
            success: true,
            message: "Login successful".into(),
            data: Some(u),
        }),
        None => Json(ApiResponse {
            success: false,
            message: "User not found".into(),
            data: None,
        }),
    }
}