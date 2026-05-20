use argon2::{
  Argon2,
  password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{
  entities::etudiant::{CreateEtudiant, GetEtudiant},
  error::ApiError,
};

pub async fn create_etudiant(
  db: &PgPool,
  etudiant: CreateEtudiant,
) -> Result<GetEtudiant, ApiError> {
  let numero = etudiant.numero_etudiant.trim().to_string();
  if numero.len() != 8 || !numero.chars().all(|char| char.is_ascii_digit()) {
    return Err(ApiError::bad_request(
      "student number must contain exactly 8 digits",
    ));
  }

  if etudiant.mot_de_passe.trim().len() < 8 {
    return Err(ApiError::bad_request(
      "password must be at least 8 characters",
    ));
  }

  let password_hash = hash_password(&etudiant.mot_de_passe)
    .map_err(|_| ApiError::internal("unable to secure password at this time"))?;

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create account at this time"))?;

  let created = sqlx::query_as::<_, GetEtudiant>(
    r#"
    INSERT INTO etudiant (numero_etudiant, nom, prenom, email, date_naissance, mot_de_passe)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, numero_etudiant, nom, prenom, email, date_naissance
    "#,
  )
  .bind(numero)
  .bind(&etudiant.nom)
  .bind(&etudiant.prenom)
  .bind(etudiant.email.trim().to_lowercase())
  .bind(etudiant.date_naissance)
  .bind(password_hash)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_create_error)?;

  sqlx::query(
    r#"
    INSERT INTO role_etu (id_role, id_etu)
    SELECT r.id, $1
    FROM role r
    WHERE r.role = 'eleve'
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(created.id)
  .execute(&mut *tx)
  .await
  .map_err(|_| ApiError::internal("unable to assign default role"))?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize account creation"))?;

  Ok(created)
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateMyProfileInput {
  pub numero_etudiant: Option<String>,
  pub nom: Option<String>,
  pub prenom: Option<String>,
  pub email: Option<String>,
  pub date_naissance: Option<NaiveDate>,
}

pub async fn get_etudiant_by_id(db: &PgPool, etu_id: Uuid) -> Result<GetEtudiant, ApiError> {
  sqlx::query_as::<_, GetEtudiant>(
    r#"
    SELECT id, numero_etudiant, nom, prenom, email, date_naissance
    FROM etudiant
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .fetch_optional(db)
  .await
  .map_err(|_| ApiError::internal("unable to load profile"))?
  .ok_or_else(|| ApiError::bad_request("student not found"))
}

pub async fn update_etudiant_by_id(
  db: &PgPool,
  etu_id: Uuid,
  payload: UpdateMyProfileInput,
) -> Result<GetEtudiant, ApiError> {
  let current = get_etudiant_by_id(db, etu_id).await?;

  let numero_etudiant = payload
    .numero_etudiant
    .map(|value| value.trim().to_string());
  let numero_etudiant =
    numero_etudiant.unwrap_or_else(|| current.numero_etudiant.unwrap_or_default());
  let numero_etudiant = if numero_etudiant.is_empty() {
    None
  } else {
    Some(numero_etudiant)
  };

  if let Some(numero) = &numero_etudiant
    && (numero.len() != 8 || !numero.chars().all(|char| char.is_ascii_digit()))
  {
    return Err(ApiError::bad_request(
      "student number must contain exactly 8 digits",
    ));
  }

  let nom = payload
    .nom
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .unwrap_or(current.nom);
  let prenom = payload
    .prenom
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .unwrap_or(current.prenom);
  let email = payload
    .email
    .map(|value| value.trim().to_lowercase())
    .filter(|value| !value.is_empty())
    .unwrap_or(current.email);
  let date_naissance = payload.date_naissance.unwrap_or(current.date_naissance);

  sqlx::query_as::<_, GetEtudiant>(
    r#"
    UPDATE etudiant
    SET numero_etudiant = $2, nom = $3, prenom = $4, email = $5, date_naissance = $6
    WHERE id = $1
    RETURNING id, numero_etudiant, nom, prenom, email, date_naissance
    "#,
  )
  .bind(etu_id)
  .bind(numero_etudiant)
  .bind(nom)
  .bind(prenom)
  .bind(email)
  .bind(date_naissance)
  .fetch_one(db)
  .await
  .map_err(map_create_error)
}

fn map_create_error(error: sqlx::Error) -> ApiError {
  match error {
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23505") => {
      if db_err
        .constraint()
        .map(|value| value.contains("numero_etudiant"))
        .unwrap_or(false)
      {
        return ApiError::conflict("student number already exists");
      }
      ApiError::conflict("email already exists")
    }
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23514") => {
      ApiError::bad_request("student number must contain exactly 8 digits")
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
