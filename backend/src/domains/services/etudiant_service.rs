use argon2::{
  Argon2,
  password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use sqlx::PgPool;

use crate::domains::{
  entities::etudiant::{CreateEtudiant, GetEtudiant},
  error::ApiError,
};

pub async fn create_etudiant(
  db: &PgPool,
  etudiant: CreateEtudiant,
) -> Result<GetEtudiant, ApiError> {
  if etudiant.mot_de_passe.trim().len() < 8 {
    return Err(ApiError::bad_request(
      "password must be at least 8 characters",
    ));
  }

  let password_hash = hash_password(&etudiant.mot_de_passe)
    .map_err(|_| ApiError::internal("unable to secure password at this time"))?;

  sqlx::query_as::<_, GetEtudiant>(
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
  .fetch_one(db)
  .await
  .map_err(map_create_error)
}

fn map_create_error(error: sqlx::Error) -> ApiError {
  match error {
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23505") => {
      ApiError::conflict("email already exists")
    }
    _ => ApiError::internal("unable to create account at this time"),
  }
}

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
  let salt = SaltString::generate(&mut OsRng);
  Argon2::default()
    .hash_password(password.as_bytes(), &salt)
    .map(|hash| hash.to_string())
}
