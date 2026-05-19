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
  pub ical_url: Option<String>,
  pub annee: i32,
  pub user_count: usize,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminPromotionSummary {
  pub id: Uuid,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee: i32,
  pub etudiant_count: i64,
  pub delegue_count: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DelegateAssignment {
  pub promo_id: Uuid,
  pub etu_id: Uuid,
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

pub async fn list_promotions(db: &PgPool) -> Result<Vec<AdminPromotionSummary>, ApiError> {
  sqlx::query_as::<_, AdminPromotionSummary>(
    r#"
    SELECT
      p.id,
      p.image_url,
      p.ical_url,
      EXTRACT(YEAR FROM p.annee_debut)::INT AS annee,
      COUNT(DISTINCT ep.id_etu)::BIGINT AS etudiant_count,
      COUNT(DISTINCT dp.id_etu)::BIGINT AS delegue_count
    FROM promotion p
    LEFT JOIN etu_promo ep ON ep.id_promo = p.id
    LEFT JOIN delegue_promo dp ON dp.id_promo = p.id
    GROUP BY p.id, p.image_url, p.ical_url, p.annee_debut
    ORDER BY p.annee_debut DESC, p.id
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_list_promotions_error)
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
  let ical_url = payload
    .ical_url
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty());

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create promotion at this time"))?;

  let created = sqlx::query_as::<_, (Uuid, NaiveDate, NaiveDate, String, Option<String>)>(
    r#"
    INSERT INTO promotion (annee_debut, annee_fin, image_url, ical_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, annee_debut, annee_fin, image_url, ical_url
    "#,
  )
  .bind(annee_debut)
  .bind(annee_fin)
  .bind(payload.image_url.trim())
  .bind(ical_url)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_create_promotion_error)?;

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
    ical_url: created.4,
    annee: created.1.year(),
    user_count: etudiant_ids.len(),
  })
}

pub async fn assign_delegue(
  db: &PgPool,
  promo_id: Uuid,
  etu_id: Uuid,
  assigned_by: Uuid,
) -> Result<DelegateAssignment, ApiError> {
  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to assign delegate at this time"))?;

  sqlx::query(
    r#"
    INSERT INTO etu_promo (id_etu, id_promo)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .execute(&mut *tx)
  .await
  .map_err(map_delegue_schema_error)?;

  sqlx::query(
    r#"
    INSERT INTO delegue_promo (id_etu, id_promo, assigned_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (id_etu, id_promo)
    DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .bind(assigned_by)
  .execute(&mut *tx)
  .await
  .map_err(map_delegue_schema_error)?;

  sqlx::query(
    r#"
    INSERT INTO role_etu (id_role, id_etu)
    SELECT id, $1
    FROM role
    WHERE role = 'delegue'
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(etu_id)
  .execute(&mut *tx)
  .await
  .map_err(|_| ApiError::internal("unable to set delegate role"))?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize delegate assignment"))?;

  Ok(DelegateAssignment { promo_id, etu_id })
}

pub async fn remove_delegue(db: &PgPool, promo_id: Uuid, etu_id: Uuid) -> Result<(), ApiError> {
  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to remove delegate at this time"))?;

  sqlx::query(
    r#"
    DELETE FROM delegue_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .execute(&mut *tx)
  .await
  .map_err(map_delegue_schema_error)?;

  let has_other_assignments = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM delegue_promo
    WHERE id_etu = $1
    "#,
  )
  .bind(etu_id)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_delegue_schema_error)?
    > 0;

  if !has_other_assignments {
    sqlx::query(
      r#"
      DELETE FROM role_etu
      WHERE id_etu = $1
        AND id_role IN (SELECT id FROM role WHERE role = 'delegue')
      "#,
    )
    .bind(etu_id)
    .execute(&mut *tx)
    .await
    .map_err(|_| ApiError::internal("unable to unset delegate role"))?;
  }

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize delegate removal"))?;

  Ok(())
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

fn map_create_promotion_error(error: sqlx::Error) -> ApiError {
  match error {
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("42703") => {
      ApiError::internal("database schema is outdated: missing promotion column")
    }
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("42P01") => {
      ApiError::internal("database schema is outdated: missing promotion table")
    }
    _ => ApiError::internal("unable to create promotion at this time"),
  }
}

fn map_delegue_schema_error(error: sqlx::Error) -> ApiError {
  match error {
    sqlx::Error::Database(db_err)
      if matches!(db_err.code().as_deref(), Some("42P01") | Some("42703")) =>
    {
      ApiError::internal("database schema is outdated for delegate scope")
    }
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23503") => {
      ApiError::bad_request("invalid student or promotion")
    }
    _ => ApiError::internal("unable to update delegate scope"),
  }
}

fn map_list_promotions_error(error: sqlx::Error) -> ApiError {
  match error {
    sqlx::Error::Database(db_err)
      if matches!(db_err.code().as_deref(), Some("42P01") | Some("42703")) =>
    {
      ApiError::internal("database schema is outdated for promotions")
    }
    _ => ApiError::internal("unable to list promotions at this time"),
  }
}
