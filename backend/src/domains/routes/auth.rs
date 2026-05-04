use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::{
  Json, Router,
  extract::State,
  http::{HeaderMap, HeaderValue, StatusCode, header},
  response::IntoResponse,
  routing::{get, post},
};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use sqlx::PgPool;

use crate::domains::entities::auth::{AuthMessage, AuthUser, Claims, LoginInfo};

const AUTH_COOKIE_NAME: &str = "let_note_auth";

pub fn auth_routes() -> Router<PgPool> {
  Router::new()
    .route("/login", post(login))
    .route("/logout", post(logout))
    .route("/me", get(me))
}

async fn login(State(db): State<PgPool>, Json(login_info): Json<LoginInfo>) -> impl IntoResponse {
  if login_info.email.trim().is_empty() || login_info.password.trim().is_empty() {
    return (
      StatusCode::BAD_REQUEST,
      Json(AuthMessage {
        message: "email and password are required".to_string(),
      }),
    )
      .into_response();
  }

  let row = sqlx::query_as::<_, (String,)>("SELECT mot_de_passe FROM etudiant WHERE email = $1")
    .bind(login_info.email.trim().to_lowercase())
    .fetch_optional(&db)
    .await;

  let stored_hash = match row {
    Ok(Some((hash,))) => hash,
    Ok(None) => {
      return (
        StatusCode::UNAUTHORIZED,
        Json(AuthMessage {
          message: "invalid credentials".to_string(),
        }),
      )
        .into_response();
    }
    Err(_) => {
      return (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(AuthMessage {
          message: "authentication service unavailable".to_string(),
        }),
      )
        .into_response();
    }
  };

  if !verify_password(&login_info.password, &stored_hash) {
    return (
      StatusCode::UNAUTHORIZED,
      Json(AuthMessage {
        message: "invalid credentials".to_string(),
      }),
    )
      .into_response();
  }

  let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
  let now = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|d| d.as_secs() as usize)
    .unwrap_or(0);

  let claims = Claims {
    sub: login_info.email.trim().to_lowercase(),
    exp: now + 3600,
  };

  match encode(
    &Header::default(),
    &claims,
    &EncodingKey::from_secret(secret.as_bytes()),
  ) {
    Ok(token) => {
      let cookie = build_auth_cookie(&token, false);
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
    Err(_) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(AuthMessage {
        message: "failed to create session".to_string(),
      }),
    )
      .into_response(),
  }
}

async fn logout() -> impl IntoResponse {
  let mut response = StatusCode::NO_CONTENT.into_response();
  let cookie = build_auth_cookie("", true);

  if let Ok(value) = HeaderValue::from_str(&cookie) {
    response.headers_mut().append(header::SET_COOKIE, value);
  }

  response
}

async fn me(headers: HeaderMap) -> impl IntoResponse {
  let Some(token) = extract_cookie_token(&headers) else {
    return StatusCode::UNAUTHORIZED.into_response();
  };

  let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
  match decode::<Claims>(
    &token,
    &DecodingKey::from_secret(secret.as_bytes()),
    &Validation::default(),
  ) {
    Ok(data) => (
      StatusCode::OK,
      Json(AuthUser {
        email: data.claims.sub,
      }),
    )
      .into_response(),
    Err(_) => StatusCode::UNAUTHORIZED.into_response(),
  }
}

fn build_auth_cookie(token: &str, expire_immediately: bool) -> String {
  let mut cookie = format!("{AUTH_COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax");

  if std::env::var("COOKIE_SECURE")
    .ok()
    .as_deref()
    .unwrap_or("false")
    == "true"
  {
    cookie.push_str("; Secure");
  }

  if expire_immediately {
    cookie.push_str("; Max-Age=0");
  } else {
    cookie.push_str("; Max-Age=3600");
  }

  cookie
}

fn extract_cookie_token(headers: &HeaderMap) -> Option<String> {
  let cookies = headers.get(header::COOKIE)?.to_str().ok()?;

  cookies
    .split(';')
    .map(str::trim)
    .find_map(|part| part.strip_prefix(&format!("{AUTH_COOKIE_NAME}=")))
    .map(str::to_string)
}

fn verify_password(password: &str, hash: &str) -> bool {
  let parsed = match PasswordHash::new(hash) {
    Ok(value) => value,
    Err(_) => return false,
  };

  Argon2::default()
    .verify_password(password.as_bytes(), &parsed)
    .is_ok()
}
