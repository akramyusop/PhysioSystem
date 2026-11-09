use axum::{routing::get, Router};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

mod db;
mod models;
mod mod_auth;
mod mod_prescription;
mod mod_library;
mod mod_game;
mod mod_logger;
mod mod_analytics;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:physio.db?mode=rwc".to_string());
    tracing::info!("Connecting to SQLite database at {}", db_url);
    let pool = db::init_db(&db_url).await?;

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Combine all 6 modular routers
    let app = Router::new()
        .route("/api/health", get(|| async { "PhysioSystem Backend API is running!" }))
        .nest("/api/auth", mod_auth::router())
        .nest("/api/prescription", mod_prescription::router())
        .nest("/api/library", mod_library::router())
        .nest("/api/game", mod_game::router())
        .nest("/api/logger", mod_logger::router())
        .nest("/api/analytics", mod_analytics::router())
        .layer(cors)
        .with_state(pool);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    tracing::info!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
