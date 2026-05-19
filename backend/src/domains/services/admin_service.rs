use chrono::{Datelike, NaiveDate};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{
  entities::{etudiant::GetEtudiant, promotion::CreatePromotion},
  error::ApiError,
};

#[derive(Debug, Clone, serde::Serialize)]
pub struct CreatedPromotion {
  pub id: Uuid,
  pub image_url: String,
  pub annee: i32,
  pub user_count: usize,
}

pub async fn list_etudiants(db: &PgPool) -> Result<Vec<GetEtudiant>, ApiError> {
  sqlx::query_as::<_, GetEtudiant>(
    r#"
    SELECT id, nom, prenom, email, date_naissance
    FROM etudiant
    ORDER BY nom, prenom, email
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(|_| ApiError::internal("unable to list students at this time"))
}

pub async fn create_promotion(
  db: &PgPool,
  payload: CreatePromotion,
) -> Result<CreatedPromotion, ApiError> {
  if payload.image_url.trim().is_empty() {
    return Err(ApiError::bad_request("promotion image is required"));
  }

  let mut etudiant_ids = payload.etudiant_ids;
  if etudiant_ids.is_empty() {
    return Err(ApiError::bad_request(
      "at least one student must be assigned",
    ));
  }

  etudiant_ids.sort_unstable();
  etudiant_ids.dedup();

  let (annee_debut, annee_fin) = year_bounds(payload.annee)?;

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create promotion at this time"))?;

  let created = sqlx::query_as::<_, (Uuid, NaiveDate, NaiveDate, String)>(
    r#"
    INSERT INTO promotion (annee_debut, annee_fin, image_url)
    VALUES ($1, $2, $3)
    RETURNING id, annee_debut, annee_fin, image_url
    "#,
  )
  .bind(annee_debut)
  .bind(annee_fin)
  .bind(payload.image_url.trim())
  .fetch_one(&mut *tx)
  .await
  .map_err(|_| ApiError::internal("unable to create promotion at this time"))?;

  sqlx::query(
    r#"
    INSERT INTO etu_promo (id_etu, id_promo)
    SELECT id_etu, $2
    FROM UNNEST($1::uuid[]) AS id_etu
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(&etudiant_ids)
  .bind(created.0)
  .execute(&mut *tx)
  .await
  .map_err(map_student_assignment_error)?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize promotion creation"))?;

  Ok(CreatedPromotion {
    id: created.0,
    image_url: created.3,
    annee: created.1.year(),
    user_count: etudiant_ids.len(),
  })
}

fn year_bounds(year: i32) -> Result<(NaiveDate, NaiveDate), ApiError> {
  if !(1900..=3000).contains(&year) {
    return Err(ApiError::bad_request("invalid year"));
  }

  let start =
    NaiveDate::from_ymd_opt(year, 1, 1).ok_or_else(|| ApiError::bad_request("invalid year"))?;
  let end =
    NaiveDate::from_ymd_opt(year, 12, 31).ok_or_else(|| ApiError::bad_request("invalid year"))?;

  Ok((start, end))
}

fn map_student_assignment_error(error: sqlx::Error) -> ApiError {
  match error {
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23503") => {
      ApiError::bad_request("one or more students do not exist")
    }
    _ => ApiError::internal("unable to assign students to promotion"),
  }
}
