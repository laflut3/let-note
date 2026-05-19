use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::Serialize;

#[derive(Debug, Clone)]
pub struct ApiError {
  status: StatusCode,
  message: &'static str,
}

#[derive(Serialize)]
struct ErrorBody {
  message: &'static str,
}

impl ApiError {
  pub const fn new(status: StatusCode, message: &'static str) -> Self {
    Self { status, message }
  }

  pub const fn bad_request(message: &'static str) -> Self {
    Self::new(StatusCode::BAD_REQUEST, message)
  }

  pub const fn unauthorized(message: &'static str) -> Self {
    Self::new(StatusCode::UNAUTHORIZED, message)
  }

  pub const fn forbidden(message: &'static str) -> Self {
    Self::new(StatusCode::FORBIDDEN, message)
  }

  pub const fn conflict(message: &'static str) -> Self {
    Self::new(StatusCode::CONFLICT, message)
  }

  pub const fn internal(message: &'static str) -> Self {
    Self::new(StatusCode::INTERNAL_SERVER_ERROR, message)
  }
}

impl IntoResponse for ApiError {
  fn into_response(self) -> axum::response::Response {
    (
      self.status,
      Json(ErrorBody {
        message: self.message,
      }),
    )
      .into_response()
  }
}
