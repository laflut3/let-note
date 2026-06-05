use axum::{
  Json, Router,
  extract::State,
  http::{HeaderMap, HeaderValue, StatusCode, header},
  response::IntoResponse,
  routing::{get, post},
};
use sqlx::PgPool;

use crate::domains::{
  entities::auth::{
    AuthMessage, AuthUser, ChangePasswordInput, EmailTokenInput, ForgotPasswordInput, LoginInfo,
    ResetPasswordInput,
  },
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
    .route("/verify-email", post(verify_email))
    .route("/forgot-password", post(forgot_password))
    .route("/reset-password", post(reset_password))
    .route("/change-password", post(change_password))
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

async fn verify_email(
  State(db): State<PgPool>,
  Json(input): Json<EmailTokenInput>,
) -> impl IntoResponse {
  match auth_service::verify_email_token(&db, &input.token).await {
    Ok(()) => (
      StatusCode::OK,
      Json(AuthMessage {
        message: "email verified".to_string(),
      }),
    )
      .into_response(),
    Err(error) => error.into_response(),
  }
}

async fn forgot_password(
  State(db): State<PgPool>,
  Json(input): Json<ForgotPasswordInput>,
) -> impl IntoResponse {
  match auth_service::request_password_reset(&db, input).await {
    Ok(()) => (
      StatusCode::OK,
      Json(AuthMessage {
        message: "password reset email sent if the account exists".to_string(),
      }),
    )
      .into_response(),
    Err(error) => error.into_response(),
  }
}

async fn reset_password(
  State(db): State<PgPool>,
  Json(input): Json<ResetPasswordInput>,
) -> impl IntoResponse {
  match auth_service::reset_password(&db, input).await {
    Ok(()) => (
      StatusCode::OK,
      Json(AuthMessage {
        message: "password updated".to_string(),
      }),
    )
      .into_response(),
    Err(error) => error.into_response(),
  }
}

async fn change_password(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Json(input): Json<ChangePasswordInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match auth_service::change_password(&db, auth.user_id, input).await {
    Ok(()) => (
      StatusCode::OK,
      Json(AuthMessage {
        message: "password changed".to_string(),
      }),
    )
      .into_response(),
    Err(error) => error.into_response(),
  }
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
