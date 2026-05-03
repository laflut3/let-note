use axum::{
  Json, Router,
  http::StatusCode,
  response::IntoResponse,
  routing::post,
};
use uuid::Uuid;

use crate::domains::entities::auth::{LoginInfo, LoginResponse};

pub fn auth_routes() -> Router {
  Router::new()
    .route("/login", post(login))
    .route("/logout", post(logout))
}

async fn login(Json(login_info): Json<LoginInfo>) -> impl IntoResponse {
  if login_info.email.trim().is_empty() || login_info.password.trim().is_empty() {
    return (
      StatusCode::BAD_REQUEST,
      "email and password are required".to_string(),
    )
      .into_response();
  }

  // Placeholder token generation until real auth storage/JWT is added.
  let token = format!("dev-{}", Uuid::new_v4());
  (StatusCode::OK, Json(LoginResponse { token })).into_response()
}

async fn logout() -> impl IntoResponse {
  StatusCode::NO_CONTENT
}
