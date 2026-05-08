use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct LoginInfo {
  pub email: String,
  pub password: String,
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
