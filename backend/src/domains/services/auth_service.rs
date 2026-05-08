use argon2::{Argon2, PasswordHash, PasswordVerifier};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use sqlx::PgPool;
use tokio::time::{Duration, sleep};

use crate::domains::{
  entities::auth::{Claims, LoginInfo},
  error::ApiError,
};

const SESSION_TTL_SECONDS: usize = 3600;
const INVALID_CREDENTIALS_DELAY_MS: u64 = 200;

#[derive(sqlx::FromRow)]
struct LoginRow {
  mot_de_passe: String,
}

pub struct AuthenticatedUser {
  pub email: String,
  pub token: String,
}

pub async fn authenticate_user(
  db: &PgPool,
  input: LoginInfo,
) -> Result<AuthenticatedUser, ApiError> {
  let (email, password) = normalize_credentials(input)?;
  let stored_hash = fetch_password_hash(db, &email).await?;

  if !verify_password(&password, &stored_hash) {
    return Err(invalid_credentials().await);
  }

  let token = build_token(&email)?;
  Ok(AuthenticatedUser { email, token })
}

pub fn parse_token(token: &str) -> Result<Claims, ApiError> {
  let secret = jwt_secret()?;
  decode::<Claims>(
    token,
    &DecodingKey::from_secret(secret.as_bytes()),
    &Validation::default(),
  )
  .map(|data| data.claims)
  .map_err(|_| ApiError::unauthorized("invalid credentials"))
}

fn normalize_credentials(input: LoginInfo) -> Result<(String, String), ApiError> {
  let email = input.email.trim().to_lowercase();
  let password = input.password;

  if email.is_empty() || password.trim().is_empty() {
    return Err(ApiError::bad_request("email and password are required"));
  }

  Ok((email, password))
}

async fn fetch_password_hash(db: &PgPool, email: &str) -> Result<String, ApiError> {
  match sqlx::query_as::<_, LoginRow>("SELECT mot_de_passe FROM etudiant WHERE email = $1")
    .bind(email)
    .fetch_optional(db)
    .await
  {
    Ok(Some(row)) => Ok(row.mot_de_passe),
    Ok(None) => Err(invalid_credentials().await),
    Err(_) => Err(ApiError::internal("authentication service unavailable")),
  }
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

fn build_token(email: &str) -> Result<String, ApiError> {
  let secret = jwt_secret()?;
  let now = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|d| d.as_secs() as usize)
    .unwrap_or(0);

  let claims = Claims {
    sub: email.to_string(),
    exp: now + SESSION_TTL_SECONDS,
  };

  encode(
    &Header::default(),
    &claims,
    &EncodingKey::from_secret(secret.as_bytes()),
  )
  .map_err(|_| ApiError::internal("failed to create session"))
}

fn jwt_secret() -> Result<String, ApiError> {
  std::env::var("JWT_SECRET").map_err(|_| ApiError::internal("authentication service unavailable"))
}

async fn invalid_credentials() -> ApiError {
  sleep(Duration::from_millis(INVALID_CREDENTIALS_DELAY_MS)).await;
  ApiError::unauthorized("invalid credentials")
}
