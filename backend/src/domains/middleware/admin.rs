use axum::{extract::Request, http::HeaderMap, middleware::Next, response::Response};
use sqlx::PgPool;

use crate::domains::{error::ApiError, middleware::auth::extract_auth_context};

pub async fn require_admin(
  headers: HeaderMap,
  request: Request,
  next: Next,
) -> Result<Response, ApiError> {
  let db = request
    .extensions()
    .get::<PgPool>()
    .ok_or_else(|| ApiError::internal("application state unavailable"))?;

  let auth = extract_auth_context(&headers, db).await?;
  auth.require_role("admin")?;
  Ok(next.run(request).await)
}
