// MODULE 5: Nurse & Patient Activity Logger
// Assigned to: Member 5
use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use crate::db::DbPool;
use crate::models::{
    ActivityLog, ApiResponse, LoggerMetaResponse, NurseOption, PatientOption, VitalNote, VoidRequest,
};

#[derive(Debug, Deserialize)]
pub struct PatientQuery {
    pub patient_id: Option<String>,
}

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/logs", get(list_activity_logs))
        .route("/activities", get(list_activity_logs).post(create_activity_log))
        .route("/vitals", get(list_vital_notes).post(create_vital_note))
        .route("/meta", get(get_logger_meta))
        .route("/void", post(void_record))
}

pub fn calculate_news2(bp_sys: i64, hr: i64, spo2: i64, temp: f64) -> i64 {
    let mut score = 0;
    // Systolic BP
    if bp_sys <= 90 || bp_sys >= 220 {
        score += 3;
    } else if bp_sys <= 100 {
        score += 2;
    } else if bp_sys <= 110 {
        score += 1;
    }
    // Heart Rate
    if hr <= 40 || hr >= 131 {
        score += 3;
    } else if hr >= 111 {
        score += 2;
    } else if hr <= 50 || hr >= 91 {
        score += 1;
    }
    // SpO2
    if spo2 <= 91 {
        score += 3;
    } else if spo2 <= 93 {
        score += 2;
    } else if spo2 <= 95 {
        score += 1;
    }
    // Temp
    if temp <= 35.0 {
        score += 3;
    } else if temp >= 39.1 {
        score += 2;
    } else if temp <= 36.0 || temp >= 38.1 {
        score += 1;
    }
    score
}

async fn get_logger_meta(State(pool): State<DbPool>) -> Json<ApiResponse<LoggerMetaResponse>> {
    let nurses = sqlx::query_as::<_, NurseOption>("SELECT id, full_name FROM users WHERE role = 'nurse'")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let patients = sqlx::query_as::<_, PatientOption>(
        "SELECT p.id as profile_id, ('PT-' || substr('000' || p.id, -3)) as patient_id, u.full_name, p.injury_diagnosis 
         FROM patient_profiles p JOIN users u ON p.user_id = u.id"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Logger metadata fetched successfully".into(),
        data: Some(LoggerMetaResponse { nurses, patients }),
    })
}

async fn list_activity_logs(
    State(pool): State<DbPool>,
    Query(query): Query<PatientQuery>,
) -> Json<ApiResponse<Vec<ActivityLog>>> {
    let logs = if let Some(ref pid) = query.patient_id {
        sqlx::query_as::<_, ActivityLog>(
            "SELECT id, patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, logged_at, voided, void_reason 
             FROM activity_logs WHERE patient_id = ? ORDER BY logged_at DESC LIMIT 100",
        )
        .bind(pid)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, ActivityLog>(
            "SELECT id, patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, logged_at, voided, void_reason 
             FROM activity_logs ORDER BY logged_at DESC LIMIT 100",
        )
        .fetch_all(&pool)
        .await
    }
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Activity logs fetched successfully".into(),
        data: Some(logs),
    })
}

async fn create_activity_log(
    State(pool): State<DbPool>,
    Json(payload): Json<ActivityLog>,
) -> Json<ApiResponse<i64>> {
    let res = sqlx::query(
        "INSERT INTO activity_logs (patient_id, nurse_name, activity_type, duration_minutes, assistance_level, notes, voided)
         VALUES (?, ?, ?, ?, ?, ?, 0)",
    )
    .bind(&payload.patient_id)
    .bind(&payload.nurse_name)
    .bind(&payload.activity_type)
    .bind(payload.duration_minutes)
    .bind(&payload.assistance_level)
    .bind(&payload.notes)
    .execute(&pool)
    .await;

    match res {
        Ok(result) => Json(ApiResponse {
            success: true,
            message: "Activity log recorded successfully".into(),
            data: Some(result.last_insert_rowid()),
        }),
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to insert activity log: {}", err),
            data: None,
        }),
    }
}

async fn list_vital_notes(
    State(pool): State<DbPool>,
    Query(query): Query<PatientQuery>,
) -> Json<ApiResponse<Vec<VitalNote>>> {
    let vitals = if let Some(ref pid) = query.patient_id {
        sqlx::query_as::<_, VitalNote>(
            "SELECT id, patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, recorded_at, news2_score, voided, void_reason 
             FROM vital_notes WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 100",
        )
        .bind(pid)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, VitalNote>(
            "SELECT id, patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, recorded_at, news2_score, voided, void_reason 
             FROM vital_notes ORDER BY recorded_at DESC LIMIT 100",
        )
        .fetch_all(&pool)
        .await
    }
    .unwrap_or_default();

    Json(ApiResponse {
        success: true,
        message: "Vital notes fetched successfully".into(),
        data: Some(vitals),
    })
}

async fn create_vital_note(
    State(pool): State<DbPool>,
    Json(payload): Json<VitalNote>,
) -> Json<ApiResponse<i64>> {
    let computed_news2 = payload.news2_score.unwrap_or_else(|| {
        calculate_news2(
            payload.bp_systolic,
            payload.heart_rate,
            payload.spo2,
            payload.temperature_c,
        )
    });

    let res = sqlx::query(
        "INSERT INTO vital_notes (patient_id, nurse_name, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, pain_score, clinical_remarks, news2_score, voided)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
    )
    .bind(&payload.patient_id)
    .bind(&payload.nurse_name)
    .bind(payload.bp_systolic)
    .bind(payload.bp_diastolic)
    .bind(payload.heart_rate)
    .bind(payload.spo2)
    .bind(payload.temperature_c)
    .bind(payload.pain_score)
    .bind(&payload.clinical_remarks)
    .bind(computed_news2)
    .execute(&pool)
    .await;

    match res {
        Ok(result) => Json(ApiResponse {
            success: true,
            message: "Vital note recorded successfully with NEWS2 scoring".into(),
            data: Some(result.last_insert_rowid()),
        }),
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to insert vital note: {}", err),
            data: None,
        }),
    }
}

async fn void_record(
    State(pool): State<DbPool>,
    Json(payload): Json<VoidRequest>,
) -> Json<ApiResponse<bool>> {
    let table = if payload.record_type == "activity" {
        "activity_logs"
    } else {
        "vital_notes"
    };

    let sql = format!("UPDATE {} SET voided = 1, void_reason = ? WHERE id = ?", table);
    let res = sqlx::query(&sql)
        .bind(&payload.reason)
        .bind(payload.id)
        .execute(&pool)
        .await;

    match res {
        Ok(_) => Json(ApiResponse {
            success: true,
            message: "Record successfully amended in clinical audit trail".into(),
            data: Some(true),
        }),
        Err(err) => Json(ApiResponse {
            success: false,
            message: format!("Failed to void record: {}", err),
            data: Some(false),
        }),
    }
}
