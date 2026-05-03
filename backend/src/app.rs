use axum::{
  Json, Router,
  http::{Method, StatusCode},
  routing::get,
};
use serde::Serialize;
use tower_http::cors::{Any, CorsLayer};

use crate::domains::routes::auth::auth_routes;

#[derive(Serialize)]
struct HealthResponse {
  status: &'static str,
}

pub fn create_router() -> Router {
  let cors = CorsLayer::new()
    .allow_origin([
      "http://localhost:5173".parse().expect("invalid origin"),
      "http://127.0.0.1:5173".parse().expect("invalid origin"),
    ])
    .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
    .allow_headers(Any);

  Router::new()
    .route("/_health", get(health_check))
    .route("/api/health", get(health_json))
    .nest("/api/auth", auth_routes())
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
