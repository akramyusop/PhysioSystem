// MODULE 2: Doctor Prescription & Treatment Planner
// Assigned to: Member 2
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use crate::db::DbPool;
use crate::models::ApiResponse;

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/plans", get(list_treatment_plans).post(create_treatment_plan))
        .route(
            "/plans/:id",
            get(get_treatment_plan)
                .put(update_treatment_plan)
                .delete(delete_treatment_plan),
        )
        .route("/plans/:id/status", patch(update_treatment_plan_status))
        .route("/plans/:id/exercises", post(add_prescribed_exercise))
        .route("/exercises/:exercise_id", delete(remove_prescribed_exercise))
        .route(
            "/patients",
            get(list_prescription_patients).post(create_prescription_patient),
        )
        .route("/patients/:id", put(update_prescription_patient))
}

// ==========================================================
// DTOs & Models for Module 2
// ==========================================================

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TreatmentPlanSummary {
    pub id: i64,
    pub patient_id: i64,
    pub patient_name: String,
    pub patient_diagnosis: String,
    pub doctor_id: i64,
    pub doctor_name: String,
    pub title: String,
    pub status: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub exercise_count: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PrescribedExerciseDetail {
    pub id: i64,
    pub plan_id: i64,
    pub exercise_id: i64,
    pub exercise_name: String,
    pub target_body_part: String,
    pub difficulty: String,
    pub sets: i64,
    pub reps: i64,
    pub hold_seconds: Option<i64>,
    pub daily_frequency: Option<i64>,
    pub safety_notes: Option<String>,
    pub order_index: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TreatmentPlanDetail {
    pub id: i64,
    pub patient_id: i64,
    pub patient_name: String,
    pub patient_diagnosis: String,
    pub doctor_id: i64,
    pub doctor_name: String,
    pub title: String,
    pub status: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub exercises: Vec<PrescribedExerciseDetail>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePlanPayload {
    pub patient_id: i64,
    pub doctor_id: i64,
    pub title: String,
    pub start_date: String,
    pub end_date: Option<String>,
    #[serde(default)]
    pub exercises: Vec<CreatePrescribedExerciseItem>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePlanPayload {
    pub title: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub status: Option<String>,
    #[serde(default)]
    pub exercises: Vec<CreatePrescribedExerciseItem>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePrescribedExerciseItem {
    pub exercise_id: i64,
    pub sets: Option<i64>,
    pub reps: Option<i64>,
    pub hold_seconds: Option<i64>,
    pub daily_frequency: Option<i64>,
    pub safety_notes: Option<String>,
    pub order_index: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStatusPayload {
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PatientSelectionOption {
    pub patient_profile_id: i64,
    pub user_id: i64,
    pub full_name: String,
    pub gender: Option<String>,
    pub date_of_birth: Option<String>,
    pub injury_diagnosis: String,
    pub baseline_rom_score: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePatientPayload {
    pub full_name: String,
    pub gender: Option<String>,
    pub date_of_birth: Option<String>,
    pub injury_diagnosis: String,
    pub baseline_rom_score: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePatientPayload {
    pub full_name: Option<String>,
    pub gender: Option<String>,
    pub date_of_birth: Option<String>,
    pub injury_diagnosis: String,
    pub baseline_rom_score: Option<f64>,
    pub notes: Option<String>,
}

// ==========================================================
// Handlers
// ==========================================================

/// GET /api/prescription/plans
/// Fetches all treatment plans with patient & doctor info and exercise count.
async fn list_treatment_plans(
    State(pool): State<DbPool>,
) -> Result<Json<ApiResponse<Vec<TreatmentPlanSummary>>>, (StatusCode, Json<ApiResponse<Vec<TreatmentPlanSummary>>>)> {
    let query = "
        SELECT 
            tp.id,
            tp.patient_id,
            COALESCE(u_patient.full_name, 'Patient #' || tp.patient_id) AS patient_name,
            COALESCE(pp.injury_diagnosis, 'N/A') AS patient_diagnosis,
            tp.doctor_id,
            COALESCE(u_doctor.full_name, 'Dr. Sarah Chen, MD') AS doctor_name,
            tp.title,
            tp.status,
            tp.start_date,
            tp.end_date,
            COUNT(pe.id) AS exercise_count
        FROM treatment_plans tp
        LEFT JOIN patient_profiles pp ON tp.patient_id = pp.id
        LEFT JOIN users u_patient ON pp.user_id = u_patient.id
        LEFT JOIN users u_doctor ON tp.doctor_id = u_doctor.id
        LEFT JOIN prescribed_exercises pe ON tp.id = pe.plan_id
        GROUP BY tp.id
        ORDER BY tp.id DESC
    ";

    match sqlx::query_as::<_, TreatmentPlanSummary>(query).fetch_all(&pool).await {
        Ok(plans) => Ok(Json(ApiResponse {
            success: true,
            message: "Treatment plans fetched successfully".into(),
            data: Some(plans),
        })),
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Failed to fetch treatment plans: {}", err),
                data: None,
            }),
        )),
    }
}

/// GET /api/prescription/plans/:id
/// Fetches a single treatment plan and all associated prescribed exercises.
async fn get_treatment_plan(
    Path(id): Path<i64>,
    State(pool): State<DbPool>,
) -> Result<Json<ApiResponse<TreatmentPlanDetail>>, (StatusCode, Json<ApiResponse<TreatmentPlanDetail>>)> {
    let plan_row = sqlx::query_as::<_, TreatmentPlanSummary>("
        SELECT 
            tp.id,
            tp.patient_id,
            COALESCE(u_patient.full_name, 'Patient #' || tp.patient_id) AS patient_name,
            COALESCE(pp.injury_diagnosis, 'N/A') AS patient_diagnosis,
            tp.doctor_id,
            COALESCE(u_doctor.full_name, 'Doctor #' || tp.doctor_id) AS doctor_name,
            tp.title,
            tp.status,
            tp.start_date,
            tp.end_date,
            COUNT(pe.id) AS exercise_count
        FROM treatment_plans tp
        LEFT JOIN patient_profiles pp ON tp.patient_id = pp.id
        LEFT JOIN users u_patient ON pp.user_id = u_patient.id
        LEFT JOIN users u_doctor ON tp.doctor_id = u_doctor.id
        LEFT JOIN prescribed_exercises pe ON tp.id = pe.plan_id
        WHERE tp.id = ?
        GROUP BY tp.id
    ")
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let plan = match plan_row {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse {
                    success: false,
                    message: format!("Treatment plan with ID {} not found", id),
                    data: None,
                }),
            ));
        }
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Database error: {}", e),
                    data: None,
                }),
            ));
        }
    };

    let exercises = sqlx::query_as::<_, PrescribedExerciseDetail>("
        SELECT 
            pe.id,
            pe.plan_id,
            pe.exercise_id,
            COALESCE(e.name, 'Exercise #' || pe.exercise_id) AS exercise_name,
            COALESCE(e.target_body_part, 'General') AS target_body_part,
            COALESCE(e.difficulty, 'easy') AS difficulty,
            pe.sets,
            pe.reps,
            pe.hold_seconds,
            pe.daily_frequency,
            pe.safety_notes,
            pe.order_index
        FROM prescribed_exercises pe
        LEFT JOIN exercises e ON pe.exercise_id = e.id
        WHERE pe.plan_id = ?
        ORDER BY pe.order_index ASC, pe.id ASC
    ")
    .bind(id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let detail = TreatmentPlanDetail {
        id: plan.id,
        patient_id: plan.patient_id,
        patient_name: plan.patient_name,
        patient_diagnosis: plan.patient_diagnosis,
        doctor_id: plan.doctor_id,
        doctor_name: plan.doctor_name,
        title: plan.title,
        status: plan.status,
        start_date: plan.start_date,
        end_date: plan.end_date,
        exercises,
    };

    Ok(Json(ApiResponse {
        success: true,
        message: "Treatment plan details fetched successfully".into(),
        data: Some(detail),
    }))
}

/// POST /api/prescription/plans
/// Creates a new treatment plan with its prescribed exercises inside a transaction.
async fn create_treatment_plan(
    State(pool): State<DbPool>,
    Json(payload): Json<CreatePlanPayload>,
) -> Result<(StatusCode, Json<ApiResponse<i64>>), (StatusCode, Json<ApiResponse<i64>>)> {
    if payload.title.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: "Plan title cannot be empty".into(),
                data: None,
            }),
        ));
    }

    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to initiate database transaction: {}", e),
                    data: None,
                }),
            ));
        }
    };

    let plan_insert_res = sqlx::query(
        "INSERT INTO treatment_plans (patient_id, doctor_id, title, status, start_date, end_date) VALUES (?, ?, ?, 'active', ?, ?)"
    )
    .bind(payload.patient_id)
    .bind(payload.doctor_id)
    .bind(&payload.title)
    .bind(&payload.start_date)
    .bind(&payload.end_date)
    .execute(&mut *tx)
    .await;

    let plan_id = match plan_insert_res {
        Ok(res) => res.last_insert_rowid(),
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to insert treatment plan: {}", e),
                    data: None,
                }),
            ));
        }
    };

    for (idx, item) in payload.exercises.iter().enumerate() {
        let sets = item.sets.unwrap_or(3);
        let reps = item.reps.unwrap_or(10);
        let hold_seconds = item.hold_seconds.unwrap_or(0);
        let daily_frequency = item.daily_frequency.unwrap_or(1);
        let order_idx = item.order_index.unwrap_or(idx as i64 + 1);

        if let Err(e) = sqlx::query(
            "INSERT INTO prescribed_exercises (plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(plan_id)
        .bind(item.exercise_id)
        .bind(sets)
        .bind(reps)
        .bind(hold_seconds)
        .bind(daily_frequency)
        .bind(&item.safety_notes)
        .bind(order_idx)
        .execute(&mut *tx)
        .await
        {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to insert prescribed exercise: {}", e),
                    data: None,
                }),
            ));
        }
    }

    if let Err(e) = tx.commit().await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Failed to commit transaction: {}", e),
                data: None,
            }),
        ));
    }

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse {
            success: true,
            message: format!("Treatment plan #{} created with {} exercise(s)", plan_id, payload.exercises.len()),
            data: Some(plan_id),
        }),
    ))
}

/// PUT /api/prescription/plans/:id
/// Updates an existing treatment plan and its prescribed exercises inside a transaction.
async fn update_treatment_plan(
    Path(id): Path<i64>,
    State(pool): State<DbPool>,
    Json(payload): Json<UpdatePlanPayload>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    if payload.title.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: "Plan title cannot be empty".into(),
                data: None,
            }),
        ));
    }

    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to initiate transaction: {}", e),
                    data: None,
                }),
            ));
        }
    };

    let status_val = payload.status.unwrap_or_else(|| "active".to_string());
    let update_res = sqlx::query(
        "UPDATE treatment_plans SET title = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?"
    )
    .bind(&payload.title)
    .bind(&payload.start_date)
    .bind(&payload.end_date)
    .bind(&status_val)
    .bind(id)
    .execute(&mut *tx)
    .await;

    match update_res {
        Ok(r) if r.rows_affected() > 0 => (),
        Ok(_) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse {
                    success: false,
                    message: format!("Treatment plan #{} not found", id),
                    data: None,
                }),
            ));
        }
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to update treatment plan: {}", e),
                    data: None,
                }),
            ));
        }
    }

    // Delete existing prescribed exercises and replace with the updated set
    if let Err(e) = sqlx::query("DELETE FROM prescribed_exercises WHERE plan_id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await
    {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Failed to update exercises: {}", e),
                data: None,
            }),
        ));
    }

    for (idx, item) in payload.exercises.iter().enumerate() {
        let sets = item.sets.unwrap_or(3);
        let reps = item.reps.unwrap_or(10);
        let hold_seconds = item.hold_seconds.unwrap_or(0);
        let daily_frequency = item.daily_frequency.unwrap_or(1);
        let order_idx = item.order_index.unwrap_or(idx as i64 + 1);

        if let Err(e) = sqlx::query(
            "INSERT INTO prescribed_exercises (plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(item.exercise_id)
        .bind(sets)
        .bind(reps)
        .bind(hold_seconds)
        .bind(daily_frequency)
        .bind(&item.safety_notes)
        .bind(order_idx)
        .execute(&mut *tx)
        .await
        {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to insert updated exercise: {}", e),
                    data: None,
                }),
            ));
        }
    }

    if let Err(e) = tx.commit().await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Failed to commit transaction: {}", e),
                data: None,
            }),
        ));
    }

    Ok(Json(ApiResponse {
        success: true,
        message: format!("Treatment plan #{} updated successfully with {} exercise(s)", id, payload.exercises.len()),
        data: None,
    }))
}

/// PATCH /api/prescription/plans/:id/status
/// Updates the status of an existing treatment plan ('active', 'completed', 'paused').
async fn update_treatment_plan_status(
    Path(id): Path<i64>,
    State(pool): State<DbPool>,
    Json(payload): Json<UpdateStatusPayload>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let valid_statuses = ["active", "completed", "paused"];
    let status_lower = payload.status.to_lowercase();

    if !valid_statuses.contains(&status_lower.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: format!("Invalid status '{}'. Must be 'active', 'completed', or 'paused'", payload.status),
                data: None,
            }),
        ));
    }

    let res = sqlx::query("UPDATE treatment_plans SET status = ? WHERE id = ?")
        .bind(&status_lower)
        .bind(id)
        .execute(&pool)
        .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => Ok(Json(ApiResponse {
            success: true,
            message: format!("Plan #{} status updated to '{}'", id, status_lower),
            data: None,
        })),
        Ok(_) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                success: false,
                message: format!("Treatment plan #{} not found", id),
                data: None,
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Database error: {}", e),
                data: None,
            }),
        )),
    }
}

/// POST /api/prescription/plans/:id/exercises
/// Appends a new prescribed exercise to an existing plan.
async fn add_prescribed_exercise(
    Path(plan_id): Path<i64>,
    State(pool): State<DbPool>,
    Json(item): Json<CreatePrescribedExerciseItem>,
) -> Result<(StatusCode, Json<ApiResponse<i64>>), (StatusCode, Json<ApiResponse<i64>>)> {
    let sets = item.sets.unwrap_or(3);
    let reps = item.reps.unwrap_or(10);
    let hold_seconds = item.hold_seconds.unwrap_or(0);
    let daily_frequency = item.daily_frequency.unwrap_or(1);
    let order_idx = item.order_index.unwrap_or(1);

    let res = sqlx::query(
        "INSERT INTO prescribed_exercises (plan_id, exercise_id, sets, reps, hold_seconds, daily_frequency, safety_notes, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(plan_id)
    .bind(item.exercise_id)
    .bind(sets)
    .bind(reps)
    .bind(hold_seconds)
    .bind(daily_frequency)
    .bind(&item.safety_notes)
    .bind(order_idx)
    .execute(&pool)
    .await;

    match res {
        Ok(r) => Ok((
            StatusCode::CREATED,
            Json(ApiResponse {
                success: true,
                message: "Prescribed exercise added successfully".into(),
                data: Some(r.last_insert_rowid()),
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Failed to add exercise: {}", e),
                data: None,
            }),
        )),
    }
}

/// DELETE /api/prescription/exercises/:exercise_id
/// Removes a prescribed exercise item from a plan.
async fn remove_prescribed_exercise(
    Path(exercise_id): Path<i64>,
    State(pool): State<DbPool>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let res = sqlx::query("DELETE FROM prescribed_exercises WHERE id = ?")
        .bind(exercise_id)
        .execute(&pool)
        .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => Ok(Json(ApiResponse {
            success: true,
            message: "Prescribed exercise removed".into(),
            data: None,
        })),
        Ok(_) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                success: false,
                message: format!("Prescribed exercise #{} not found", exercise_id),
                data: None,
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Database error: {}", e),
                data: None,
            }),
        )),
    }
}

/// DELETE /api/prescription/plans/:id
/// Deletes an entire treatment plan and its prescribed exercises (via CASCADE).
async fn delete_treatment_plan(
    Path(id): Path<i64>,
    State(pool): State<DbPool>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let res = sqlx::query("DELETE FROM treatment_plans WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => Ok(Json(ApiResponse {
            success: true,
            message: format!("Treatment plan #{} deleted successfully", id),
            data: None,
        })),
        Ok(_) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                success: false,
                message: format!("Treatment plan #{} not found", id),
                data: None,
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Database error: {}", e),
                data: None,
            }),
        )),
    }
}

/// GET /api/prescription/patients
/// Helper endpoint to fetch patients with their diagnosis to populate Doctor prescription forms.
async fn list_prescription_patients(
    State(pool): State<DbPool>,
) -> Result<Json<ApiResponse<Vec<PatientSelectionOption>>>, (StatusCode, Json<ApiResponse<Vec<PatientSelectionOption>>>)> {
    let query = "
        SELECT 
            pp.id AS patient_profile_id,
            pp.user_id,
            u.full_name,
            pp.gender,
            pp.date_of_birth,
            pp.injury_diagnosis,
            pp.baseline_rom_score,
            pp.notes
        FROM patient_profiles pp
        JOIN users u ON pp.user_id = u.id
        ORDER BY u.full_name ASC
    ";

    match sqlx::query_as::<_, PatientSelectionOption>(query).fetch_all(&pool).await {
        Ok(patients) => Ok(Json(ApiResponse {
            success: true,
            message: "Patients fetched successfully".into(),
            data: Some(patients),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Database error: {}", e),
                data: None,
            }),
        )),
    }
}

/// POST /api/prescription/patients
/// Register a new patient profile directly from Doctor workspace.
async fn create_prescription_patient(
    State(pool): State<DbPool>,
    Json(payload): Json<CreatePatientPayload>,
) -> Result<(StatusCode, Json<ApiResponse<i64>>), (StatusCode, Json<ApiResponse<i64>>)> {
    if payload.full_name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: "Patient full name cannot be empty".into(),
                data: None,
            }),
        ));
    }

    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Database transaction error: {}", e),
                    data: None,
                }),
            ));
        }
    };

    let sanitized_name = payload.full_name.to_lowercase().replace(' ', "_");
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let username = format!("{}_{}", sanitized_name, timestamp);

    let user_res = sqlx::query(
        "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, 'demo_hash', ?, 'patient')"
    )
    .bind(&username)
    .bind(&payload.full_name)
    .execute(&mut *tx)
    .await;

    let user_id = match user_res {
        Ok(r) => r.last_insert_rowid(),
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to create user record: {}", e),
                    data: None,
                }),
            ));
        }
    };

    let profile_res = sqlx::query(
        "INSERT INTO patient_profiles (user_id, date_of_birth, gender, injury_diagnosis, baseline_rom_score, notes) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(user_id)
    .bind(&payload.date_of_birth)
    .bind(&payload.gender)
    .bind(&payload.injury_diagnosis)
    .bind(payload.baseline_rom_score)
    .bind(&payload.notes)
    .execute(&mut *tx)
    .await;

    let profile_id = match profile_res {
        Ok(r) => r.last_insert_rowid(),
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to create patient profile: {}", e),
                    data: None,
                }),
            ));
        }
    };

    if let Err(e) = tx.commit().await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Failed to commit patient transaction: {}", e),
                data: None,
            }),
        ));
    }

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse {
            success: true,
            message: format!("Patient '{}' registered successfully with ID #{}", payload.full_name, profile_id),
            data: Some(profile_id),
        }),
    ))
}

/// PUT /api/prescription/patients/:id
/// Updates patient clinical diagnosis, notes, and baseline ROM score.
async fn update_prescription_patient(
    Path(profile_id): Path<i64>,
    State(pool): State<DbPool>,
    Json(payload): Json<UpdatePatientPayload>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Transaction error: {}", e),
                    data: None,
                }),
            ));
        }
    };

    if let Some(ref name) = payload.full_name {
        if !name.trim().is_empty() {
            let _ = sqlx::query(
                "UPDATE users SET full_name = ? WHERE id = (SELECT user_id FROM patient_profiles WHERE id = ?)"
            )
            .bind(name)
            .bind(profile_id)
            .execute(&mut *tx)
            .await;
        }
    }

    let profile_res = sqlx::query(
        "UPDATE patient_profiles SET injury_diagnosis = ?, baseline_rom_score = ?, notes = ?, gender = COALESCE(?, gender), date_of_birth = COALESCE(?, date_of_birth) WHERE id = ?"
    )
    .bind(&payload.injury_diagnosis)
    .bind(payload.baseline_rom_score)
    .bind(&payload.notes)
    .bind(&payload.gender)
    .bind(&payload.date_of_birth)
    .bind(profile_id)
    .execute(&mut *tx)
    .await;

    match profile_res {
        Ok(r) if r.rows_affected() > 0 => (),
        Ok(_) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse {
                    success: false,
                    message: format!("Patient profile #{} not found", profile_id),
                    data: None,
                }),
            ));
        }
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to update profile: {}", e),
                    data: None,
                }),
            ));
        }
    }

    if let Err(e) = tx.commit().await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: format!("Commit failed: {}", e),
                data: None,
            }),
        ));
    }

    Ok(Json(ApiResponse {
        success: true,
        message: format!("Patient #{} clinical profile updated successfully", profile_id),
        data: None,
    }))
}
