use axum::{
  extract::Request,
  http::HeaderMap,
  middleware::{Next, from_fn},
  response::Response,
  routing::MethodRouter,
};
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

pub fn right_admin<S>(route: MethodRouter<S>) -> MethodRouter<S>
where
  S: Clone + Send + Sync + 'static,
{
  route.route_layer(from_fn(require_admin))
}
