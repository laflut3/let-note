use axum::{
  Json, Router,
  extract::State,
  http::StatusCode,
  response::IntoResponse,
  routing::{get, post},
};
use sqlx::PgPool;

use crate::domains::entities::etudiant::{CreateEtudiant, GetEtudiant};

pub fn etudiant_routes() -> Router<PgPool> {
  Router::new()
    .route("/etudiant", get(get_all_etudiants))
    .route("/etudiant", post(create_etudiant))
}

async fn get_all_etudiants(State(db): State<PgPool>) -> impl IntoResponse {
  match sqlx::query_as::<_, GetEtudiant>(
    r#"
    SELECT id, nom, prenom, email, date_naissance
    FROM etudiant
    ORDER BY id
    "#,
  )
  .fetch_all(&db)
  .await
  {
    Ok(etudiants) => (StatusCode::OK, Json(etudiants)).into_response(),
    Err(err) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      format!("Database error while fetching etudiants: {err}"),
    )
      .into_response(),
  }
}

async fn create_etudiant(
  State(db): State<PgPool>,
  Json(etudiant): Json<CreateEtudiant>,
) -> impl IntoResponse {
  match sqlx::query_as::<_, GetEtudiant>(
    r#"
    INSERT INTO etudiant (nom, prenom, email, date_naissance)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nom, prenom, email, date_naissance
    "#,
  )
  .bind(&etudiant.nom)
  .bind(&etudiant.prenom)
  .bind(&etudiant.email)
  .bind(etudiant.date_naissance)
  .fetch_one(&db)
  .await
  {
    Ok(created_etudiant) => (StatusCode::CREATED, Json(created_etudiant)).into_response(),
    Err(err) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      format!("Database error while creating etudiant: {err}"),
    )
      .into_response(),
  }
}
