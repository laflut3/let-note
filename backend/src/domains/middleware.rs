use axum::{
  extract::State,
  http::{HeaderMap, header},
};
use sqlx::PgPool;

use crate::domains::{error::ApiError, services::auth_service};

const AUTH_COOKIE_NAME: &str = "let_note_auth";

#[derive(Debug, Clone)]
pub struct AuthContext {
  pub email: String,
  pub roles: Vec<String>,
}

impl AuthContext {
  pub fn require_role(&self, role: &str) -> Result<(), ApiError> {
    if self.roles.iter().any(|r| r == role) {
      return Ok(());
    }
    Err(ApiError::unauthorized("insufficient permissions"))
  }
}

pub async fn extract_auth_context(
  headers: &HeaderMap,
  db: &PgPool,
) -> Result<AuthContext, ApiError> {
  let token =
    extract_cookie_token(headers).ok_or_else(|| ApiError::unauthorized("missing session"))?;
  let claims = auth_service::parse_token(&token)?;
  let roles = auth_service::fetch_roles_by_email(db, &claims.sub).await?;

  if roles.is_empty() {
    return Err(ApiError::unauthorized("account has no role"));
  }

  Ok(AuthContext {
    email: claims.sub,
    roles,
  })
}

pub async fn require_auth(
  State(db): State<PgPool>,
  headers: HeaderMap,
) -> Result<AuthContext, ApiError> {
  extract_auth_context(&headers, &db).await
}

fn extract_cookie_token(headers: &HeaderMap) -> Option<String> {
  let cookies = headers.get(header::COOKIE)?.to_str().ok()?;

  cookies
    .split(';')
    .map(str::trim)
    .find_map(|part| part.strip_prefix(&format!("{AUTH_COOKIE_NAME}=")))
    .map(str::to_string)
}
