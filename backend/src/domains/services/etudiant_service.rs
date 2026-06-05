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
  services::auth_service,
};
use crate::infrastructure::s3;

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

  auth_service::create_email_verification(db, created.id, &created.email).await?;

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

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct MyProfilePayload {
  pub id: Uuid,
  pub numero_etudiant: Option<String>,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
  pub photo_url: Option<String>,
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

pub async fn get_my_profile_by_id(db: &PgPool, etu_id: Uuid) -> Result<MyProfilePayload, ApiError> {
  sqlx::query_as::<_, MyProfilePayload>(
    r#"
    SELECT
      id,
      numero_etudiant,
      nom,
      prenom,
      email,
      date_naissance,
      CASE
        WHEN photo_s3_key IS NOT NULL AND photo_s3_bucket IS NOT NULL THEN '/api/etudiant/me/photo'
        ELSE NULL
      END AS photo_url
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
  let email = current.email;
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

pub async fn update_my_profile_by_id(
  db: &PgPool,
  etu_id: Uuid,
  payload: UpdateMyProfileInput,
) -> Result<MyProfilePayload, ApiError> {
  let _ = update_etudiant_by_id(db, etu_id, payload).await?;
  get_my_profile_by_id(db, etu_id).await
}

pub async fn upload_profile_photo(
  db: &PgPool,
  etu_id: Uuid,
  file_name: &str,
  content_type: Option<&str>,
  bytes: Vec<u8>,
) -> Result<MyProfilePayload, ApiError> {
  if bytes.is_empty() {
    return Err(ApiError::bad_request("file is required"));
  }
  if bytes.len() > 8 * 1024 * 1024 {
    return Err(ApiError::bad_request("photo is too large (max 8MB)"));
  }

  let detected_content_type = detect_profile_photo_content_type(&bytes)
    .ok_or_else(|| ApiError::bad_request("photo must be a jpeg, png, webp or gif image"))?;

  if let Some(provided) = content_type.map(|value| {
    value
      .split(';')
      .next()
      .unwrap_or("")
      .trim()
      .to_ascii_lowercase()
  }) && !provided.is_empty()
    && provided != detected_content_type
  {
    return Err(ApiError::bad_request(
      "photo content type does not match the uploaded file",
    ));
  }

  let cfg = s3::read_s3_config().map_err(|_| ApiError::internal("unable to read S3 config"))?;
  let safe_name = sanitize_file_name(file_name);
  let key = format!("profiles/{}/{}", etu_id, safe_name);

  s3::upload_bytes(&key, bytes, Some(detected_content_type))
    .await
    .map_err(|_| ApiError::internal("unable to upload profile photo"))?;

  sqlx::query(
    r#"
    UPDATE etudiant
    SET photo_s3_bucket = $2, photo_s3_key = $3, photo_content_type = $4
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .bind(cfg.bucket)
  .bind(key)
  .bind(Some(detected_content_type.to_string()))
  .execute(db)
  .await
  .map_err(|_| ApiError::internal("unable to save profile photo"))?;

  get_my_profile_by_id(db, etu_id).await
}

pub async fn get_profile_photo_blob(
  db: &PgPool,
  etu_id: Uuid,
) -> Result<(Vec<u8>, String), ApiError> {
  let photo = sqlx::query_as::<_, (Option<String>, Option<String>, Option<String>)>(
    r#"
    SELECT photo_s3_bucket, photo_s3_key, photo_content_type
    FROM etudiant
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .fetch_optional(db)
  .await
  .map_err(|_| ApiError::internal("unable to load profile photo"))?
  .ok_or_else(|| ApiError::bad_request("student not found"))?;

  let bucket = photo
    .0
    .ok_or_else(|| ApiError::bad_request("profile photo not found"))?;
  let key = photo
    .1
    .ok_or_else(|| ApiError::bad_request("profile photo not found"))?;

  let (bytes, downloaded_ct) = s3::download_bytes(&bucket, &key)
    .await
    .map_err(|_| ApiError::internal("unable to load profile photo"))?;

  let content_type = photo
    .2
    .or(downloaded_ct)
    .unwrap_or_else(|| "application/octet-stream".to_string());
  Ok((bytes, content_type))
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

fn sanitize_file_name(name: &str) -> String {
  let candidate = name.trim();
  if candidate.is_empty() {
    return "photo.bin".to_string();
  }
  candidate
    .chars()
    .map(|c| {
      if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' {
        c
      } else {
        '_'
      }
    })
    .collect()
}

fn detect_profile_photo_content_type(bytes: &[u8]) -> Option<&'static str> {
  if bytes.len() >= 3 && bytes[0..3] == [0xFF, 0xD8, 0xFF] {
    return Some("image/jpeg");
  }

  if bytes.len() >= 8 && bytes[0..8] == [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A] {
    return Some("image/png");
  }

  if bytes.len() >= 12 && bytes[0..4] == *b"RIFF" && bytes[8..12] == *b"WEBP" {
    return Some("image/webp");
  }

  if bytes.len() >= 6 && (bytes[0..6] == *b"GIF87a" || bytes[0..6] == *b"GIF89a") {
    return Some("image/gif");
  }

  None
}
