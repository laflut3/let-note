use axum::{
  Json, Router,
  http::{HeaderMap, StatusCode},
  response::IntoResponse,
  routing::post,
};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};

use crate::domains::entities::auth::{Claims, LoginInfo, LoginResponse};

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

  let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".to_string());

  let now = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|d| d.as_secs() as usize)
    .unwrap_or(0);

  let claims = Claims {
    sub: login_info.email,
    exp: now + 3600,
  };

  match encode(
    &Header::default(),
    &claims,
    &EncodingKey::from_secret(secret.as_bytes()),
  ) {
    Ok(token) => (StatusCode::OK, Json(LoginResponse { token })).into_response(),
    Err(err) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      format!("failed to generate token: {err}"),
    )
      .into_response(),
  }
}

async fn logout(headers: HeaderMap) -> impl IntoResponse {
  let Some(value) = headers.get("authorization") else {
    return StatusCode::UNAUTHORIZED;
  };

  let Ok(value) = value.to_str() else {
    return StatusCode::UNAUTHORIZED;
  };

  let Some(token) = value.strip_prefix("Bearer ") else {
    return StatusCode::UNAUTHORIZED;
  };

  let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".to_string());
  match decode::<Claims>(
    token,
    &DecodingKey::from_secret(secret.as_bytes()),
    &Validation::default(),
  ) {
    Ok(_) => StatusCode::NO_CONTENT,
    Err(_) => StatusCode::UNAUTHORIZED,
  }
}
