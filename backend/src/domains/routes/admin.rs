use axum::{
  Json, Router,
  extract::State,
  http::{HeaderMap, StatusCode},
  response::IntoResponse,
  routing::get,
};
use serde::Serialize;
use sqlx::PgPool;

use crate::domains::middleware;

#[derive(Serialize)]
struct AdminStatus {
  message: &'static str,
}

pub fn admin_routes() -> Router<PgPool> {
  Router::new().route("/status", get(admin_status))
}

async fn admin_status(State(db): State<PgPool>, headers: HeaderMap) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  if let Err(error) = auth.require_role("admin") {
    return error.into_response();
  }

  (
    StatusCode::OK,
    Json(AdminStatus {
      message: "admin access granted",
    }),
  )
    .into_response()
}
