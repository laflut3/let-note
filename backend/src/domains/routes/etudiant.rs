use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::post};
use sqlx::PgPool;

use crate::domains::{entities::etudiant::CreateEtudiant, services::etudiant_service};

pub fn etudiant_routes() -> Router<PgPool> {
  Router::new().route("/etudiant", post(create_etudiant))
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
