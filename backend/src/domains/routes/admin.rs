use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::get};
use serde::Serialize;
use sqlx::PgPool;

use crate::domains::middleware;

#[derive(Serialize)]
struct AdminStatus {
  message: &'static str,
}

pub fn admin_routes() -> Router<PgPool> {
  Router::new().route("/status", middleware::right_admin(get(admin_status)))
}

async fn admin_status(State(_db): State<PgPool>) -> impl IntoResponse {
  (
    StatusCode::OK,
    Json(AdminStatus {
      message: "admin access granted",
    }),
  )
    .into_response()
}
