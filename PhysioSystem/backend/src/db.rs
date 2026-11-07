use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::fs;

pub type DbPool = Pool<Sqlite>;

pub async fn init_db(database_url: &str) -> Result<DbPool, Box<dyn std::error::Error>> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    // Auto-run migrations if tables do not exist
    if let Ok(init_sql) = fs::read_to_string("migrations/001_init.sql") {
        sqlx::query(&init_sql).execute(&pool).await?;
        tracing::info!("Applied migrations/001_init.sql successfully.");
    }

    if let Ok(seed_sql) = fs::read_to_string("migrations/002_seed.sql") {
        sqlx::query(&seed_sql).execute(&pool).await?;
        tracing::info!("Applied migrations/002_seed.sql successfully.");
    }

    if let Ok(migration3_sql) = fs::read_to_string("migrations/003_update_logger_vitals.sql") {
        sqlx::query(&migration3_sql).execute(&pool).await?;
        tracing::info!("Applied migrations/003_update_logger_vitals.sql successfully.");
    }

    if let Ok(migration4_sql) = fs::read_to_string("migrations/004_clinical_audit_fields.sql") {
        let _ = sqlx::query(&migration4_sql).execute(&pool).await;
        tracing::info!("Applied migrations/004_clinical_audit_fields.sql successfully.");
    }

    Ok(pool)
}
