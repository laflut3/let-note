use argon2::{
  Argon2,
  password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
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
  if etudiant.mot_de_passe.trim().len() < 8 {
    return (
      StatusCode::BAD_REQUEST,
      "password must be at least 8 characters",
    )
      .into_response();
  }

  let password_hash = match hash_password(&etudiant.mot_de_passe) {
    Ok(hash) => hash,
    Err(_) => {
      return (
        StatusCode::INTERNAL_SERVER_ERROR,
        "unable to secure password at this time",
      )
        .into_response();
    }
  };

  match sqlx::query_as::<_, GetEtudiant>(
    r#"
    INSERT INTO etudiant (nom, prenom, email, date_naissance, mot_de_passe)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, nom, prenom, email, date_naissance
    "#,
  )
  .bind(&etudiant.nom)
  .bind(&etudiant.prenom)
  .bind(etudiant.email.trim().to_lowercase())
  .bind(etudiant.date_naissance)
  .bind(password_hash)
  .fetch_one(&db)
  .await
  {
    Ok(created_etudiant) => (StatusCode::CREATED, Json(created_etudiant)).into_response(),
    Err(sqlx::Error::Database(db_err)) if db_err.code().as_deref() == Some("23505") => {
      (StatusCode::CONFLICT, "email already exists").into_response()
    }
    Err(_) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      "unable to create account at this time",
    )
      .into_response(),
  }
}

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
  let salt = SaltString::generate(&mut OsRng);
  Argon2::default()
    .hash_password(password.as_bytes(), &salt)
    .map(|hash| hash.to_string())
}
