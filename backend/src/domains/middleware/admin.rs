use axum::{
  extract::{Path, Request, State},
  http::HeaderMap,
  middleware::{Next, from_fn_with_state},
  response::Response,
  routing::MethodRouter,
};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::domains::{error::ApiError, middleware::auth::extract_auth_context};

pub async fn require_admin(
  State(db): State<PgPool>,
  headers: HeaderMap,
  request: Request,
  next: Next,
) -> Result<Response, ApiError> {
  let auth = extract_auth_context(&headers, &db).await?;
  auth.require_role("admin")?;
  Ok(next.run(request).await)
}

pub fn right_admin(route: MethodRouter<PgPool>, db: PgPool) -> MethodRouter<PgPool> {
  route.route_layer(from_fn_with_state(db, require_admin))
}

pub async fn require_admin_or_delegue_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(params): Path<HashMap<String, String>>,
  request: Request,
  next: Next,
) -> Result<Response, ApiError> {
  let auth = extract_auth_context(&headers, &db).await?;
  if auth.roles.iter().any(|role| role == "admin") {
    return Ok(next.run(request).await);
  }

  let raw_promo_id = params
    .get("promo_id")
    .ok_or_else(|| ApiError::bad_request("missing promo_id in route"))?;
  let promo_id =
    Uuid::parse_str(raw_promo_id).map_err(|_| ApiError::bad_request("invalid promo id"))?;

  let has_scope = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM delegue_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(auth.user_id)
  .bind(promo_id)
  .fetch_one(&db)
  .await
  .map_err(|_| ApiError::internal("unable to validate permissions"))?
    > 0;

  if has_scope {
    return Ok(next.run(request).await);
  }

  Err(ApiError::forbidden(
    "insufficient permissions for this promotion",
  ))
}

pub fn right_admin_or_delegue_for_promo(
  route: MethodRouter<PgPool>,
  db: PgPool,
) -> MethodRouter<PgPool> {
  route.route_layer(from_fn_with_state(db, require_admin_or_delegue_for_promo))
}

pub async fn require_delegue_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(params): Path<HashMap<String, String>>,
  request: Request,
  next: Next,
) -> Result<Response, ApiError> {
  let auth = extract_auth_context(&headers, &db).await?;

  let raw_promo_id = params
    .get("promo_id")
    .ok_or_else(|| ApiError::bad_request("missing promo_id in route"))?;
  let promo_id =
    Uuid::parse_str(raw_promo_id).map_err(|_| ApiError::bad_request("invalid promo id"))?;

  let has_scope = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM delegue_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(auth.user_id)
  .bind(promo_id)
  .fetch_one(&db)
  .await
  .map_err(|_| ApiError::internal("unable to validate permissions"))?
    > 0;

  if has_scope {
    return Ok(next.run(request).await);
  }

  Err(ApiError::forbidden(
    "insufficient permissions for this promotion",
  ))
}

pub fn right_delegue_for_promo(route: MethodRouter<PgPool>, db: PgPool) -> MethodRouter<PgPool> {
  route.route_layer(from_fn_with_state(db, require_delegue_for_promo))
}
