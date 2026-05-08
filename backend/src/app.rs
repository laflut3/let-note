use axum::{
  Json, Router,
  http::{Method, StatusCode, header},
  routing::get,
};
use serde::Serialize;
use sqlx::PgPool;
use tower_http::cors::CorsLayer;

use crate::domains::routes::{admin::admin_routes, auth::auth_routes, etudiant::etudiant_routes};

#[derive(Serialize)]
struct HealthResponse {
  status: &'static str,
}

pub fn create_router() -> Router<PgPool> {
  let cors = CorsLayer::new()
    .allow_origin([
      "http://localhost:5173".parse().expect("invalid origin"),
      "http://127.0.0.1:5173".parse().expect("invalid origin"),
    ])
    .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
    .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
    .allow_credentials(true);

  Router::<PgPool>::new()
    .route("/_health", get(health_check))
    .route("/api/health", get(health_json))
    .nest("/api/auth", auth_routes())
    .nest("/api/admin", admin_routes())
    .nest("/api", etudiant_routes())
    .fallback(fallback)
    .layer(cors)
}

async fn health_check() -> StatusCode {
  StatusCode::NO_CONTENT
}

async fn health_json() -> (StatusCode, Json<HealthResponse>) {
  (StatusCode::OK, Json(HealthResponse { status: "ok" }))
}

async fn fallback() -> (StatusCode, String) {
  (StatusCode::NOT_FOUND, "Not Found".to_string())
}
