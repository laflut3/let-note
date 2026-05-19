use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{
  entities::{etudiant::GetEtudiant, professeur::CreateProfesseur, promotion::CreatePromotion},
  error::ApiError,
};

#[derive(Debug, Clone, serde::Serialize)]
pub struct CreatedPromotion {
  pub id: Uuid,
  pub nom: String,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub referent_prof_id: Uuid,
  pub user_count: usize,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminPromotionSummary {
  pub id: Uuid,
  pub nom: String,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub etudiant_count: i64,
  pub delegue_count: i64,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminProfesseur {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DelegateAssignment {
  pub promo_id: Uuid,
  pub etu_id: Uuid,
}

pub async fn list_etudiants(db: &PgPool) -> Result<Vec<GetEtudiant>, ApiError> {
  sqlx::query_as::<_, GetEtudiant>(
    r#"
    SELECT id, numero_etudiant, nom, prenom, email, date_naissance
    FROM etudiant
    ORDER BY nom, prenom, email
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list students at this time"))
}

pub async fn list_professeurs(db: &PgPool) -> Result<Vec<AdminProfesseur>, ApiError> {
  sqlx::query_as::<_, AdminProfesseur>(
    r#"
    SELECT id, nom, prenom, email
    FROM professeur
    ORDER BY nom, prenom, email
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list professors at this time"))
}

pub async fn create_professeur(
  db: &PgPool,
  payload: CreateProfesseur,
) -> Result<AdminProfesseur, ApiError> {
  let prenom = payload.prenom.trim();
  let nom = payload.nom.trim();
  let email = payload.email.trim().to_lowercase();

  if prenom.is_empty() || nom.is_empty() || email.is_empty() {
    return Err(ApiError::bad_request("prenom, nom and email are required"));
  }

  sqlx::query_as::<_, AdminProfesseur>(
    r#"
    INSERT INTO professeur (prenom, nom, email, date_naissance)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email)
    DO UPDATE SET prenom = EXCLUDED.prenom, nom = EXCLUDED.nom
    RETURNING id, nom, prenom, email
    "#,
  )
  .bind(prenom)
  .bind(nom)
  .bind(email)
  .bind(payload.date_naissance)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to create professor"))
}

pub async fn list_promotions(db: &PgPool) -> Result<Vec<AdminPromotionSummary>, ApiError> {
  sqlx::query_as::<_, AdminPromotionSummary>(
    r#"
    SELECT
      p.id,
      p.nom,
      p.image_url,
      p.ical_url,
      p.annee_arrivee,
      p.annee_depart,
      p.referent_prof_id,
      pr.nom AS referent_prof_nom,
      pr.prenom AS referent_prof_prenom,
      COUNT(DISTINCT ep.id_etu)::BIGINT AS etudiant_count,
      COUNT(DISTINCT dp.id_etu)::BIGINT AS delegue_count
    FROM promotion p
    LEFT JOIN etu_promo ep ON ep.id_promo = p.id
    LEFT JOIN delegue_promo dp ON dp.id_promo = p.id
    LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
    GROUP BY p.id, pr.id
    ORDER BY p.annee_arrivee DESC, p.nom
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list promotions at this time"))
}

pub async fn create_promotion(
  db: &PgPool,
  payload: CreatePromotion,
) -> Result<CreatedPromotion, ApiError> {
  let promo_name = payload.nom.trim().to_string();
  if promo_name.is_empty() {
    return Err(ApiError::bad_request("promotion name is required"));
  }
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

  let (annee_debut, annee_fin) = years_bounds(payload.annee_arrivee, payload.annee_depart)?;

  let referent_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM professeur
    WHERE id = $1
    "#,
  )
  .bind(payload.referent_prof_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate professor"))?
    > 0;

  if !referent_exists {
    return Err(ApiError::bad_request("referent professor does not exist"));
  }

  let ical_url = payload
    .ical_url
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty());

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create promotion at this time"))?;

  let created = sqlx::query_as::<
    _,
    (Uuid, String, String, Option<String>, i32, i32, Uuid),
  >(
    r#"
    INSERT INTO promotion
      (nom, image_url, ical_url, annee_arrivee, annee_depart, annee_debut, annee_fin, referent_prof_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, nom, image_url, ical_url, annee_arrivee, annee_depart, referent_prof_id
    "#,
  )
  .bind(&promo_name)
  .bind(payload.image_url.trim())
  .bind(ical_url)
  .bind(payload.annee_arrivee)
  .bind(payload.annee_depart)
  .bind(annee_debut)
  .bind(annee_fin)
  .bind(payload.referent_prof_id)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_schema_error("unable to create promotion at this time"))?;

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
    nom: created.1,
    image_url: created.2,
    ical_url: created.3,
    annee_arrivee: created.4,
    annee_depart: created.5,
    referent_prof_id: created.6,
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
  .map_err(map_schema_error("unable to update delegate scope"))?;

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
  .map_err(map_schema_error("unable to update delegate scope"))?;

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
  .map_err(map_schema_error("unable to update delegate scope"))?;

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
  .map_err(map_schema_error("unable to update delegate scope"))?
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

fn years_bounds(annee_arrivee: i32, annee_depart: i32) -> Result<(NaiveDate, NaiveDate), ApiError> {
  if !(1900..=3000).contains(&annee_arrivee) || !(1900..=3000).contains(&annee_depart) {
    return Err(ApiError::bad_request("invalid years"));
  }
  if annee_arrivee > annee_depart {
    return Err(ApiError::bad_request(
      "arrival year must be less than or equal to departure year",
    ));
  }

  let start = NaiveDate::from_ymd_opt(annee_arrivee, 1, 1)
    .ok_or_else(|| ApiError::bad_request("invalid arrival year"))?;
  let end = NaiveDate::from_ymd_opt(annee_depart, 12, 31)
    .ok_or_else(|| ApiError::bad_request("invalid departure year"))?;

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

fn map_schema_error(message: &'static str) -> impl Fn(sqlx::Error) -> ApiError {
  move |error| match error {
    sqlx::Error::Database(db_err)
      if matches!(db_err.code().as_deref(), Some("42P01") | Some("42703")) =>
    {
      ApiError::internal("database schema is outdated")
    }
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23503") => {
      ApiError::bad_request("invalid foreign key reference")
    }
    _ => ApiError::internal(message),
  }
}
