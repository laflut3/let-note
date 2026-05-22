use axum::{
  Json, Router,
  extract::State,
  http::{HeaderMap, HeaderValue, StatusCode, header},
  response::IntoResponse,
  routing::{get, post},
};
use sqlx::PgPool;

use crate::domains::{
  entities::auth::{AuthMessage, AuthUser, LoginInfo},
  middleware,
  services::auth_service,
};

const AUTH_COOKIE_NAME: &str = "let_note_auth";
const SESSION_TTL_SECONDS: usize = 3600;

pub fn auth_routes() -> Router<PgPool> {
  Router::new()
    .route("/login", post(login))
    .route("/logout", post(logout))
    .route("/me", get(me))
}

async fn login(State(db): State<PgPool>, Json(login_info): Json<LoginInfo>) -> impl IntoResponse {
  let auth = match auth_service::authenticate_user(&db, login_info).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  let cookie = build_auth_cookie(&auth.token, false);
  let mut response = (
    StatusCode::OK,
    Json(AuthMessage {
      message: "login successful".to_string(),
    }),
  )
    .into_response();

  if let Ok(value) = HeaderValue::from_str(&cookie) {
    response.headers_mut().append(header::SET_COOKIE, value);
  }

  response
}

async fn logout() -> impl IntoResponse {
  let mut response = StatusCode::NO_CONTENT.into_response();
  let cookie = build_auth_cookie("", true);

  if let Ok(value) = HeaderValue::from_str(&cookie) {
    response.headers_mut().append(header::SET_COOKIE, value);
  }

  response
}

async fn me(State(db): State<PgPool>, headers: HeaderMap) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  (
    StatusCode::OK,
    Json(AuthUser {
      email: auth.email,
      roles: auth.roles,
    }),
  )
    .into_response()
}

fn build_auth_cookie(token: &str, expire_immediately: bool) -> String {
  let mut cookie = format!("{AUTH_COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Strict");

  if std::env::var("COOKIE_SECURE")
    .ok()
    .as_deref()
    .unwrap_or("true")
    != "false"
  {
    cookie.push_str("; Secure");
  }

  if expire_immediately {
    cookie.push_str("; Max-Age=0");
  } else {
    cookie.push_str(&format!("; Max-Age={SESSION_TTL_SECONDS}"));
  }

  cookie
}
