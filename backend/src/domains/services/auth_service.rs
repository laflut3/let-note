use argon2::{
  Argon2, PasswordHash, PasswordVerifier,
  password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use tokio::time::{Duration, sleep};
use uuid::Uuid;

use crate::domains::{
  entities::auth::{
    ChangePasswordInput, Claims, ForgotPasswordInput, LoginInfo, ResetPasswordInput,
  },
  error::ApiError,
  services::email_service,
};

const SESSION_TTL_SECONDS: usize = 3600;
const INVALID_CREDENTIALS_DELAY_MS: u64 = 200;
const MAX_LOGIN_ATTEMPTS: i32 = 5;
const LOGIN_LOCK_HOURS: i64 = 48;
const EMAIL_VERIFICATION_TTL_HOURS: i64 = 24;
const PASSWORD_RESET_TTL_HOURS: i64 = 1;

#[derive(sqlx::FromRow)]
struct LoginRow {
  id: Uuid,
  mot_de_passe: String,
  email_verified: bool,
  failed_login_attempts: i32,
  locked_until: Option<DateTime<Utc>>,
}

pub struct AuthenticatedUser {
  pub token: String,
}

pub struct AuthUserContext {
  pub user_id: Uuid,
  pub roles: Vec<String>,
}

pub struct PreparedEmailVerification {
  pub token: String,
  pub token_hash: String,
  pub expires_at: DateTime<Utc>,
}

pub async fn authenticate_user(
  db: &PgPool,
  input: LoginInfo,
) -> Result<AuthenticatedUser, ApiError> {
  let (email, password) = normalize_credentials(input)?;
  let row = fetch_login_row(db, &email).await?;

  if row.locked_until.is_some_and(|until| until > Utc::now()) {
    return Err(ApiError::unauthorized(
      "account locked; wait 48h or reset password",
    ));
  }

  if !verify_password(&password, &row.mot_de_passe) {
    register_failed_login(db, row.id, row.failed_login_attempts).await?;
    return Err(invalid_credentials().await);
  }

  if !row.email_verified {
    return Err(ApiError::forbidden("email verification required"));
  }

  reset_login_security(db, row.id).await?;

  let token = build_token(&email)?;
  Ok(AuthenticatedUser { token })
}

pub async fn verify_email_token(db: &PgPool, token: &str) -> Result<(), ApiError> {
  let token_hash = hash_token(token)?;
  let result = sqlx::query(
    r#"
    UPDATE etudiant
    SET email_verified = TRUE,
        email_verification_token_hash = NULL,
        email_verification_expires_at = NULL,
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE email_verification_token_hash = $1
      AND email_verification_expires_at > NOW()
    "#,
  )
  .bind(token_hash)
  .execute(db)
  .await
  .map_err(|_| ApiError::internal("unable to verify email"))?;

  if result.rows_affected() == 0 {
    return Err(ApiError::bad_request(
      "invalid or expired verification token",
    ));
  }

  Ok(())
}

pub async fn request_password_reset(
  db: &PgPool,
  input: ForgotPasswordInput,
) -> Result<(), ApiError> {
  let email = input.email.trim().to_lowercase();
  if email.is_empty() {
    return Err(ApiError::bad_request("email is required"));
  }

  let Some(user_id) = sqlx::query_scalar::<_, Uuid>("SELECT id FROM etudiant WHERE email = $1")
    .bind(&email)
    .fetch_optional(db)
    .await
    .map_err(|_| ApiError::internal("authentication service unavailable"))?
  else {
    let _ = invalid_credentials().await;
    return Ok(());
  };

  let token = new_public_token();
  let token_hash = hash_token(&token)?;
  sqlx::query(
    r#"
    UPDATE etudiant
    SET password_reset_token_hash = $2,
        password_reset_expires_at = $3,
        password_reset_requested_at = NOW()
    WHERE id = $1
    "#,
  )
  .bind(user_id)
  .bind(token_hash)
  .bind(Utc::now() + ChronoDuration::hours(PASSWORD_RESET_TTL_HOURS))
  .execute(db)
  .await
  .map_err(|_| ApiError::internal("unable to prepare password reset"))?;

  email_service::send_password_reset_email(&email, &token).await?;
  Ok(())
}

pub async fn reset_password(db: &PgPool, input: ResetPasswordInput) -> Result<(), ApiError> {
  if !input.understood {
    return Err(ApiError::bad_request("confirmation is required"));
  }
  validate_new_password(&input.password, &input.confirm_password)?;

  let token_hash = hash_token(&input.token)?;
  let password_hash = hash_password(&input.password)
    .map_err(|_| ApiError::internal("unable to secure password at this time"))?;

  let result = sqlx::query(
    r#"
    UPDATE etudiant
    SET mot_de_passe = $2,
        email_verified = TRUE,
        password_reset_token_hash = NULL,
        password_reset_expires_at = NULL,
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE password_reset_token_hash = $1
      AND password_reset_expires_at > NOW()
    "#,
  )
  .bind(token_hash)
  .bind(password_hash)
  .execute(db)
  .await
  .map_err(|_| ApiError::internal("unable to reset password"))?;

  if result.rows_affected() == 0 {
    return Err(ApiError::bad_request("invalid or expired reset token"));
  }

  Ok(())
}

pub async fn change_password(
  db: &PgPool,
  user_id: Uuid,
  input: ChangePasswordInput,
) -> Result<(), ApiError> {
  validate_new_password(&input.new_password, &input.confirm_password)?;

  let current_hash = sqlx::query_scalar::<_, String>(
    r#"
    SELECT mot_de_passe
    FROM etudiant
    WHERE id = $1
    "#,
  )
  .bind(user_id)
  .fetch_optional(db)
  .await
  .map_err(|_| ApiError::internal("unable to load account"))?
  .ok_or_else(|| ApiError::unauthorized("invalid credentials"))?;

  if !verify_password(&input.current_password, &current_hash) {
    return Err(ApiError::unauthorized("invalid current password"));
  }

  let password_hash = hash_password(&input.new_password)
    .map_err(|_| ApiError::internal("unable to secure password at this time"))?;

  sqlx::query("UPDATE etudiant SET mot_de_passe = $2 WHERE id = $1")
    .bind(user_id)
    .bind(password_hash)
    .execute(db)
    .await
    .map_err(|_| ApiError::internal("unable to change password"))?;

  Ok(())
}

pub async fn create_email_verification(
  db: &PgPool,
  user_id: Uuid,
  email: &str,
) -> Result<(), ApiError> {
  let verification = prepare_email_verification()?;
  sqlx::query(
    r#"
    UPDATE etudiant
    SET email_verified = FALSE,
        email_verification_token_hash = $2,
        email_verification_expires_at = $3
    WHERE id = $1
    "#,
  )
  .bind(user_id)
  .bind(&verification.token_hash)
  .bind(verification.expires_at)
  .execute(db)
  .await
  .map_err(|_| ApiError::internal("unable to prepare email verification"))?;

  email_service::send_verification_email(email, &verification.token).await
}

pub fn prepare_email_verification() -> Result<PreparedEmailVerification, ApiError> {
  let token = new_public_token();
  let token_hash = hash_token(&token)?;
  Ok(PreparedEmailVerification {
    token,
    token_hash,
    expires_at: Utc::now() + ChronoDuration::hours(EMAIL_VERIFICATION_TTL_HOURS),
  })
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

pub async fn fetch_roles_by_email(db: &PgPool, email: &str) -> Result<Vec<String>, ApiError> {
  sqlx::query_scalar::<_, String>(
    r#"
    SELECT r.role
    FROM etudiant e
    JOIN role_etu re ON re.id_etu = e.id
    JOIN role r ON r.id = re.id_role
    WHERE e.email = $1
    ORDER BY r.role
    "#,
  )
  .bind(email)
  .fetch_all(db)
  .await
  .map_err(|_| ApiError::internal("authentication service unavailable"))
}

pub async fn fetch_user_context_by_email(
  db: &PgPool,
  email: &str,
) -> Result<AuthUserContext, ApiError> {
  let user_id = sqlx::query_scalar::<_, Uuid>(
    r#"
    SELECT id
    FROM etudiant
    WHERE email = $1
    "#,
  )
  .bind(email)
  .fetch_optional(db)
  .await
  .map_err(|_| ApiError::internal("authentication service unavailable"))?
  .ok_or_else(|| ApiError::unauthorized("invalid credentials"))?;

  let roles = sqlx::query_scalar::<_, String>(
    r#"
    SELECT r.role
    FROM role_etu re
    JOIN role r ON r.id = re.id_role
    WHERE re.id_etu = $1
    ORDER BY r.role
    "#,
  )
  .bind(user_id)
  .fetch_all(db)
  .await
  .map_err(|_| ApiError::internal("authentication service unavailable"))?;

  Ok(AuthUserContext { user_id, roles })
}

fn normalize_credentials(input: LoginInfo) -> Result<(String, String), ApiError> {
  let email = input.email.trim().to_lowercase();
  let password = input.password;

  if email.is_empty() || password.trim().is_empty() {
    return Err(ApiError::bad_request("email and password are required"));
  }

  Ok((email, password))
}

async fn fetch_login_row(db: &PgPool, email: &str) -> Result<LoginRow, ApiError> {
  match sqlx::query_as::<_, LoginRow>(
    r#"
    SELECT id, mot_de_passe, email_verified, failed_login_attempts, locked_until
    FROM etudiant
    WHERE email = $1
    "#,
  )
  .bind(email)
  .fetch_optional(db)
  .await
  {
    Ok(Some(row)) => Ok(row),
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

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
  let salt = SaltString::generate(&mut OsRng);
  Argon2::default()
    .hash_password(password.as_bytes(), &salt)
    .map(|hash| hash.to_string())
}

fn validate_new_password(password: &str, confirm_password: &str) -> Result<(), ApiError> {
  if password.len() < 8 {
    return Err(ApiError::bad_request(
      "password must be at least 8 characters",
    ));
  }
  if password != confirm_password {
    return Err(ApiError::bad_request(
      "password confirmation does not match",
    ));
  }
  Ok(())
}

fn new_public_token() -> String {
  format!(
    "{}{}{}{}",
    Uuid::new_v4().simple(),
    Uuid::new_v4().simple(),
    Uuid::new_v4().simple(),
    Uuid::new_v4().simple()
  )
}

fn hash_token(token: &str) -> Result<String, ApiError> {
  let token = token.trim();
  if token.is_empty() {
    return Err(ApiError::bad_request("token is required"));
  }
  let digest = Sha256::digest(token.as_bytes());
  Ok(digest.iter().map(|byte| format!("{byte:02x}")).collect())
}

async fn register_failed_login(
  db: &PgPool,
  user_id: Uuid,
  current_attempts: i32,
) -> Result<(), ApiError> {
  let next_attempts = current_attempts.saturating_add(1);
  let locked_until = (next_attempts >= MAX_LOGIN_ATTEMPTS)
    .then(|| Utc::now() + ChronoDuration::hours(LOGIN_LOCK_HOURS));

  sqlx::query(
    r#"
    UPDATE etudiant
    SET failed_login_attempts = $2,
        locked_until = $3
    WHERE id = $1
    "#,
  )
  .bind(user_id)
  .bind(next_attempts)
  .bind(locked_until)
  .execute(db)
  .await
  .map_err(|_| ApiError::internal("authentication service unavailable"))?;

  Ok(())
}

async fn reset_login_security(db: &PgPool, user_id: Uuid) -> Result<(), ApiError> {
  sqlx::query(
    r#"
    UPDATE etudiant
    SET failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = $1
    "#,
  )
  .bind(user_id)
  .execute(db)
  .await
  .map_err(|_| ApiError::internal("authentication service unavailable"))?;

  Ok(())
}

fn jwt_secret() -> Result<String, ApiError> {
  std::env::var("JWT_SECRET").map_err(|_| ApiError::internal("authentication service unavailable"))
}

async fn invalid_credentials() -> ApiError {
  sleep(Duration::from_millis(INVALID_CREDENTIALS_DELAY_MS)).await;
  ApiError::unauthorized("invalid credentials")
}
