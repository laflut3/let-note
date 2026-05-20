use axum::{
  Json, Router,
  extract::State,
  http::{HeaderMap, StatusCode},
  response::IntoResponse,
  routing::{get, post, put},
};
use sqlx::PgPool;

use crate::domains::{entities::etudiant::CreateEtudiant, middleware, services::etudiant_service};

pub fn etudiant_routes() -> Router<PgPool> {
  Router::new()
    .route("/etudiant", post(create_etudiant))
    .route("/etudiant/me", get(get_my_profile))
    .route("/etudiant/me", put(update_my_profile))
}

async fn create_etudiant(
  State(db): State<PgPool>,
  Json(etudiant): Json<CreateEtudiant>,
) -> impl IntoResponse {
  match etudiant_service::create_etudiant(&db, etudiant).await {
    Ok(created_etudiant) => (StatusCode::CREATED, Json(created_etudiant)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn get_my_profile(State(db): State<PgPool>, headers: HeaderMap) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match etudiant_service::get_etudiant_by_id(&db, auth.user_id).await {
    Ok(profile) => (StatusCode::OK, Json(profile)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_my_profile(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Json(payload): Json<etudiant_service::UpdateMyProfileInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match etudiant_service::update_etudiant_by_id(&db, auth.user_id, payload).await {
    Ok(profile) => (StatusCode::OK, Json(profile)).into_response(),
    Err(error) => error.into_response(),
  }
}
