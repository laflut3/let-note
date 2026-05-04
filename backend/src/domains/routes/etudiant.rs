use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::post};
use sqlx::PgPool;

use crate::domains::entities::etudiant::{CreateEtudiant, GetEtudiant};

pub fn etudiant_routes() -> Router<PgPool> {
  Router::new().route("/etudiant", post(create_etudiant))
}

async fn create_etudiant(
  State(db): State<PgPool>,
  Json(etudiant): Json<CreateEtudiant>,
) -> impl IntoResponse {
  match sqlx::query_as::<_, GetEtudiant>(
    r#"
    INSERT INTO etudiant (nom, prenom, email, date_naissance, mot_de_passe)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, nom, prenom, email, date_naissance
    "#,
  )
  .bind(&etudiant.nom)
  .bind(&etudiant.prenom)
  .bind(&etudiant.email)
  .bind(etudiant.date_naissance)
  .bind(&etudiant.mot_de_passe)
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
