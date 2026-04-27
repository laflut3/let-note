use axum::{Json, Router, http::StatusCode, routing::get};
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
  status: &'static str,
}

pub fn create_router() -> Router {
  Router::new()
    .route("/_health", get(health_check))
    .route("/api/health", get(health_json))
    .fallback(fallback)
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
