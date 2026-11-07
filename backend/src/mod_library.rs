// MODULE 3: Patient Guidance & Video Tutorial Library
// Assigned to: Member 3
use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use crate::db::DbPool;
use crate::models::{ApiResponse, Exercise, MediaAsset};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExerciseWithMedia {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub target_body_part: String,
    pub difficulty: String,
    pub recommended_frequency: Option<String>,
    pub media_assets: Vec<MediaAsset>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PatientOption {
    pub patient_id: i64,
    pub user_id: i64,
    pub full_name: String,
    pub injury_diagnosis: String,
    pub baseline_rom_score: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct PrescribedGuidanceRow {
    pub prescribed_id: i64,
    pub plan_id: i64,
    pub plan_title: String,
    pub plan_status: String,
    pub doctor_name: String,
    pub exercise_id: i64,
    pub exercise_name: String,
    pub description: String,
    pub target_body_part: String,
    pub difficulty: String,
    pub recommended_frequency: Option<String>,
    pub sets: i64,
    pub reps: i64,
    pub hold_seconds: Option<i64>,
    pub daily_frequency: Option<i64>,
    pub safety_notes: Option<String>,
    pub order_index: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GuidedExerciseItem {
    pub prescribed_id: i64,
    pub plan_id: i64,
    pub plan_title: String,
    pub doctor_name: String,
    pub exercise_id: i64,
    pub exercise_name: String,
    pub description: String,
    pub target_body_part: String,
    pub difficulty: String,
    pub recommended_frequency: Option<String>,
    pub sets: i64,
    pub reps: i64,
    pub hold_seconds: i64,
    pub daily_frequency: i64,
    pub safety_notes: Option<String>,
    pub order_index: i64,
    pub media_assets: Vec<MediaAsset>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PatientGuidancePayload {
    pub patient: PatientOption,
    pub items: Vec<GuidedExerciseItem>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExerciseInput {
    pub name: String,
    pub description: String,
    pub target_body_part: String,
    pub difficulty: String,
    pub recommended_frequency: Option<String>,
    pub initial_media_type: Option<String>,
    pub initial_media_url: Option<String>,
    pub initial_media_title: Option<String>,
    pub initial_thumbnail_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExerciseInput {
    pub name: String,
    pub description: String,
    pub target_body_part: String,
    pub difficulty: String,
    pub recommended_frequency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMediaInput {
    pub asset_type: String,
    pub url: String,
    pub title: Option<String>,
    pub thumbnail_url: Option<String>,
}

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/exercises", get(list_exercises).post(create_exercise))
        .route("/exercises/:id", put(update_exercise).delete(delete_exercise))
        .route("/exercises/:id/media", post(add_media_asset))
        .route("/media/:media_id", delete(delete_media_asset))
        .route("/catalog", get(get_full_catalog))
        .route("/patients", get(list_patients_for_guidance))
        .route("/guidance/:patient_id", get(get_patient_guidance))
}

async fn list_exercises(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<Exercise>>> {
    let exercises = sqlx::query_as::<_, Exercise>(
        "SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises ORDER BY id ASC"
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

async fn get_full_catalog(State(pool): State<DbPool>) -> Json<ApiResponse<Vec<ExerciseWithMedia>>> {
    let exercises = sqlx::query_as::<_, Exercise>(
        "SELECT id, name, description, target_body_part, difficulty, recommended_frequency FROM exercises ORDER BY id ASC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let all_media = sqlx::query_as::<_, MediaAsset>(
        "SELECT id, exercise_id, asset_type, url, title, thumbnail_url FROM media_assets ORDER BY id ASC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let catalog = exercises
        .into_iter()
        .map(|ex| {
            let media_assets = all_media
                .iter()
                .filter(|m| m.exercise_id == ex.id)
                .map(|m| MediaAsset {
                    id: m.id,
                    exercise_id: m.exercise_id,
                    asset_type: m.asset_type.clone(),
                    url: m.url.clone(),
                    title: m.title.clone(),
                    thumbnail_url: m.thumbnail_url.clone(),
                })
                .collect();

            ExerciseWithMedia {
                id: ex.id,
                name: ex.name,
                description: ex.description,
                target_body_part: ex.target_body_part,
                difficulty: ex.difficulty,
                recommended_frequency: ex.recommended_frequency,
                media_assets,
            }
        })
        .collect();

    Json(ApiResponse {
        success: true,
        message: "Full exercise catalog with media fetched successfully".into(),
        data: Some(catalog),
    })
}

async fn create_exercise(
    State(pool): State<DbPool>,
    Json(payload): Json<CreateExerciseInput>,
) -> Json<ApiResponse<ExerciseWithMedia>> {
    let difficulty = match payload.difficulty.as_str() {
        "easy" | "medium" | "hard" => payload.difficulty.clone(),
        _ => "easy".to_string(),
    };
    let freq = payload
        .recommended_frequency
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "1x daily".to_string());

    let insert_res = sqlx::query(
        "INSERT INTO exercises (name, description, target_body_part, difficulty, recommended_frequency) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(payload.name.trim())
    .bind(payload.description.trim())
    .bind(payload.target_body_part.trim())
    .bind(&difficulty)
    .bind(&freq)
    .execute(&pool)
    .await;

    match insert_res {
        Ok(res) => {
            let exercise_id = res.last_insert_rowid();
            let mut media_assets = Vec::new();

            if let Some(url) = payload.initial_media_url.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
                let asset_type = payload
                    .initial_media_type
                    .as_deref()
                    .filter(|t| matches!(*t, "video" | "image" | "diagram"))
                    .unwrap_or("video")
                    .to_string();
                let title = payload.initial_media_title.clone().filter(|s| !s.trim().is_empty());
                let thumb = payload.initial_thumbnail_url.clone().filter(|s| !s.trim().is_empty());

                if let Ok(m_res) = sqlx::query(
                    "INSERT INTO media_assets (exercise_id, asset_type, url, title, thumbnail_url) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(exercise_id)
                .bind(&asset_type)
                .bind(url)
                .bind(&title)
                .bind(&thumb)
                .execute(&pool)
                .await
                {
                    media_assets.push(MediaAsset {
                        id: m_res.last_insert_rowid(),
                        exercise_id,
                        asset_type,
                        url: url.to_string(),
                        title,
                        thumbnail_url: thumb,
                    });
                }
            }

            Json(ApiResponse {
                success: true,
                message: "Exercise created successfully".into(),
                data: Some(ExerciseWithMedia {
                    id: exercise_id,
                    name: payload.name,
                    description: payload.description,
                    target_body_part: payload.target_body_part,
                    difficulty,
                    recommended_frequency: Some(freq),
                    media_assets,
                }),
            })
        }
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to create exercise: {}", err),
            data: None,
        }),
    }
}

async fn update_exercise(
    Path(id): Path<i64>,
    State(pool): State<DbPool>,
    Json(payload): Json<UpdateExerciseInput>,
) -> Json<ApiResponse<Exercise>> {
    let difficulty = match payload.difficulty.as_str() {
        "easy" | "medium" | "hard" => payload.difficulty.clone(),
        _ => "easy".to_string(),
    };
    let freq = payload
        .recommended_frequency
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "1x daily".to_string());

    let res = sqlx::query(
        "UPDATE exercises SET name = ?, description = ?, target_body_part = ?, difficulty = ?, recommended_frequency = ? WHERE id = ?"
    )
    .bind(payload.name.trim())
    .bind(payload.description.trim())
    .bind(payload.target_body_part.trim())
    .bind(&difficulty)
    .bind(&freq)
    .bind(id)
    .execute(&pool)
    .await;

    match res {
        Ok(_) => Json(ApiResponse {
            success: true,
            message: "Exercise updated successfully".into(),
            data: Some(Exercise {
                id,
                name: payload.name,
                description: payload.description,
                target_body_part: payload.target_body_part,
                difficulty,
                recommended_frequency: Some(freq),
            }),
        }),
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to update exercise: {}", err),
            data: None,
        }),
    }
}

async fn delete_exercise(
    Path(id): Path<i64>,
    State(pool): State<DbPool>,
) -> Json<ApiResponse<i64>> {
    let res = sqlx::query("DELETE FROM exercises WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await;

    match res {
        Ok(_) => Json(ApiResponse {
            success: true,
            message: "Exercise deleted successfully".into(),
            data: Some(id),
        }),
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to delete exercise: {}", err),
            data: None,
        }),
    }
}

async fn add_media_asset(
    Path(exercise_id): Path<i64>,
    State(pool): State<DbPool>,
    Json(payload): Json<CreateMediaInput>,
) -> Json<ApiResponse<MediaAsset>> {
    let asset_type = match payload.asset_type.as_str() {
        "video" | "image" | "diagram" => payload.asset_type.clone(),
        _ => "video".to_string(),
    };
    let title = payload.title.filter(|s| !s.trim().is_empty());
    let thumbnail_url = payload.thumbnail_url.filter(|s| !s.trim().is_empty());

    let res = sqlx::query(
        "INSERT INTO media_assets (exercise_id, asset_type, url, title, thumbnail_url) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(exercise_id)
    .bind(&asset_type)
    .bind(payload.url.trim())
    .bind(&title)
    .bind(&thumbnail_url)
    .execute(&pool)
    .await;

    match res {
        Ok(r) => Json(ApiResponse {
            success: true,
            message: "Media asset attached successfully".into(),
            data: Some(MediaAsset {
                id: r.last_insert_rowid(),
                exercise_id,
                asset_type,
                url: payload.url.trim().to_string(),
                title,
                thumbnail_url,
            }),
        }),
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to attach media asset: {}", err),
            data: None,
        }),
    }
}

async fn delete_media_asset(
    Path(media_id): Path<i64>,
    State(pool): State<DbPool>,
) -> Json<ApiResponse<i64>> {
    let res = sqlx::query("DELETE FROM media_assets WHERE id = ?")
        .bind(media_id)
        .execute(&pool)
        .await;

    match res {
        Ok(_) => Json(ApiResponse {
            success: true,
            message: "Media asset removed".into(),
            data: Some(media_id),
        }),
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to remove media asset: {}", err),
            data: None,
        }),
    }
}

async fn list_patients_for_guidance(
    State(pool): State<DbPool>,
) -> Json<ApiResponse<Vec<PatientOption>>> {
    let patients = sqlx::query_as::<_, PatientOption>(
        r#"
        SELECT 
            p.id AS patient_id,
            u.id AS user_id,
            u.full_name,
            p.injury_diagnosis,
            p.baseline_rom_score,
            p.notes
        FROM patient_profiles p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.id ASC
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Patients fetched for guidance view".into(),
        data: Some(patients),
    })
}

async fn get_patient_guidance(
    Path(patient_id): Path<i64>,
    State(pool): State<DbPool>,
) -> Json<ApiResponse<PatientGuidancePayload>> {
    let patient_opt = sqlx::query_as::<_, PatientOption>(
        r#"
        SELECT 
            p.id AS patient_id,
            u.id AS user_id,
            u.full_name,
            p.injury_diagnosis,
            p.baseline_rom_score,
            p.notes
        FROM patient_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
        "#
    )
    .bind(patient_id)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten();

    let Some(patient) = patient_opt else {
        return Json(ApiResponse {
            success: false,
            message: "Patient profile not found".into(),
            data: None,
        });
    };

    let rows = sqlx::query_as::<_, PrescribedGuidanceRow>(
        r#"
        SELECT 
            pe.id AS prescribed_id,
            tp.id AS plan_id,
            tp.title AS plan_title,
            tp.status AS plan_status,
            u.full_name AS doctor_name,
            e.id AS exercise_id,
            e.name AS exercise_name,
            e.description,
            e.target_body_part,
            e.difficulty,
            e.recommended_frequency,
            pe.sets,
            pe.reps,
            pe.hold_seconds,
            pe.daily_frequency,
            pe.safety_notes,
            pe.order_index
        FROM prescribed_exercises pe
        JOIN treatment_plans tp ON pe.plan_id = tp.id
        JOIN users u ON tp.doctor_id = u.id
        JOIN exercises e ON pe.exercise_id = e.id
        WHERE tp.patient_id = ? AND tp.status = 'active'
        ORDER BY pe.order_index ASC, pe.id ASC
        "#
    )
    .bind(patient_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let all_media = sqlx::query_as::<_, MediaAsset>(
        "SELECT id, exercise_id, asset_type, url, title, thumbnail_url FROM media_assets ORDER BY id ASC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let items = rows
        .into_iter()
        .map(|r| {
            let media_assets = all_media
                .iter()
                .filter(|m| m.exercise_id == r.exercise_id)
                .map(|m| MediaAsset {
                    id: m.id,
                    exercise_id: m.exercise_id,
                    asset_type: m.asset_type.clone(),
                    url: m.url.clone(),
                    title: m.title.clone(),
                    thumbnail_url: m.thumbnail_url.clone(),
                })
                .collect();

            GuidedExerciseItem {
                prescribed_id: r.prescribed_id,
                plan_id: r.plan_id,
                plan_title: r.plan_title,
                doctor_name: r.doctor_name,
                exercise_id: r.exercise_id,
                exercise_name: r.exercise_name,
                description: r.description,
                target_body_part: r.target_body_part,
                difficulty: r.difficulty,
                recommended_frequency: r.recommended_frequency,
                sets: r.sets,
                reps: r.reps,
                hold_seconds: r.hold_seconds.unwrap_or(0),
                daily_frequency: r.daily_frequency.unwrap_or(1),
                safety_notes: r.safety_notes,
                order_index: r.order_index.unwrap_or(1),
                media_assets,
            }
        })
        .collect();

    Json(ApiResponse {
        success: true,
        message: "Patient daily guidance fetched successfully".into(),
        data: Some(PatientGuidancePayload { patient, items }),
    })
}
