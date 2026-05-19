use axum::{
  Json, Router,
  extract::State,
  http::StatusCode,
  response::IntoResponse,
  routing::{get, post},
};
use serde::Serialize;
use sqlx::PgPool;

use crate::domains::{entities::promotion::CreatePromotion, middleware, services::admin_service};

#[derive(Serialize)]
struct AdminStatus {
  message: &'static str,
}

pub fn admin_routes() -> Router<PgPool> {
  Router::new()
    .route("/status", middleware::right_admin(get(admin_status)))
    .route(
      "/promotions",
      middleware::right_admin(post(create_promotion)),
    )
    .route("/users", middleware::right_admin(get(list_users)))
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

async fn create_promotion(
  State(db): State<PgPool>,
  Json(payload): Json<CreatePromotion>,
) -> impl IntoResponse {
  match admin_service::create_promotion(&db, payload).await {
    Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_users(State(db): State<PgPool>) -> impl IntoResponse {
  match admin_service::list_etudiants(&db).await {
    Ok(users) => (StatusCode::OK, Json(users)).into_response(),
    Err(error) => error.into_response(),
  }
}
