use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct LoginInfo {
  pub email: String,
  pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct EmailTokenInput {
  pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordInput {
  pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordInput {
  pub token: String,
  pub password: String,
  pub confirm_password: String,
  pub understood: bool,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordInput {
  pub current_password: String,
  pub new_password: String,
  pub confirm_password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthMessage {
  pub message: String,
}

#[derive(Debug, Serialize)]
pub struct AuthUser {
  pub email: String,
  pub roles: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
  pub sub: String,
  pub exp: usize,
}
