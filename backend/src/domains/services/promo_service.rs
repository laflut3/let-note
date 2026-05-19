use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{error::ApiError, middleware::AuthContext};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereInput {
  pub code_matiere: String,
  pub nom_matiere: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateProfesseurInput {
  pub prenom: String,
  pub nom: String,
  pub email: String,
  pub date_naissance: Option<NaiveDate>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateIcalInput {
  pub ical_url: String,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromotionScope {
  pub id: Uuid,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_debut: NaiveDate,
  pub annee_fin: NaiveDate,
  pub can_manage: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DashboardPayload {
  pub promotion: PromotionScope,
  pub matieres: Vec<MatiereDashboardItem>,
  pub professeurs: Vec<ProfesseurDashboardItem>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct MatiereDashboardItem {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub referent_prof_email: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct ProfesseurDashboardItem {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MutationAck {
  pub message: &'static str,
}

pub async fn list_accessible_promotions(
  db: &PgPool,
  auth: &AuthContext,
) -> Result<Vec<PromotionScope>, ApiError> {
  if auth.roles.iter().any(|r| r == "admin") {
    return sqlx::query_as::<_, PromotionScope>(
      r#"
      SELECT
        p.id,
        p.image_url,
        p.ical_url,
        p.annee_debut,
        p.annee_fin,
        TRUE AS can_manage
      FROM promotion p
      ORDER BY p.annee_debut DESC, p.id
      "#,
    )
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list promotions"));
  }

  sqlx::query_as::<_, PromotionScope>(
    r#"
    SELECT
      p.id,
      p.image_url,
      p.ical_url,
      p.annee_debut,
      p.annee_fin,
      EXISTS (
        SELECT 1
        FROM delegue_promo dp
        WHERE dp.id_promo = p.id AND dp.id_etu = $1
      ) AS can_manage
    FROM promotion p
    JOIN etu_promo ep ON ep.id_promo = p.id
    WHERE ep.id_etu = $1
    ORDER BY p.annee_debut DESC, p.id
    "#,
  )
  .bind(auth.user_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list promotions"))
}

pub async fn get_promotion_dashboard(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<DashboardPayload, ApiError> {
  let promotion = get_accessible_promotion(db, auth, promo_id).await?;

  let matieres = sqlx::query_as::<_, MatiereDashboardItem>(
    r#"
    SELECT
      m.code_matiere,
      m.nom_matiere,
      rmp.id_prof AS referent_prof_id,
      p.nom AS referent_prof_nom,
      p.prenom AS referent_prof_prenom,
      p.email AS referent_prof_email
    FROM mat_promo mp
    JOIN matiere m ON m.code_matiere = mp.id_mat
    LEFT JOIN referent_matiere_promo rmp
      ON rmp.id_mat = mp.id_mat AND rmp.id_promo = mp.id_promo
    LEFT JOIN professeur p ON p.id = rmp.id_prof
    WHERE mp.id_promo = $1
    ORDER BY m.nom_matiere, m.code_matiere
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load dashboard"))?;

  let professeurs = sqlx::query_as::<_, ProfesseurDashboardItem>(
    r#"
    SELECT p.id, p.nom, p.prenom, p.email
    FROM prof_promo pp
    JOIN professeur p ON p.id = pp.id_prof
    WHERE pp.id_promo = $1
    ORDER BY p.nom, p.prenom, p.email
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load dashboard"))?;

  Ok(DashboardPayload {
    promotion,
    matieres,
    professeurs,
  })
}

pub async fn add_matiere_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  payload: CreateMatiereInput,
) -> Result<MutationAck, ApiError> {
  let code = payload.code_matiere.trim().to_lowercase();
  let nom = payload.nom_matiere.trim().to_string();

  if code.is_empty() || nom.is_empty() {
    return Err(ApiError::bad_request(
      "code_matiere and nom_matiere are required",
    ));
  }

  let annee = sqlx::query_scalar::<_, NaiveDate>(
    r#"
    SELECT annee_debut
    FROM promotion
    WHERE id = $1
    "#,
  )
  .bind(promo_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to create matiere"))?
  .ok_or_else(|| ApiError::bad_request("promotion not found"))?;

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create matiere"))?;

  sqlx::query(
    r#"
    INSERT INTO matiere (code_matiere, nom_matiere, annee)
    VALUES ($1, $2, $3)
    ON CONFLICT (code_matiere)
    DO UPDATE SET nom_matiere = EXCLUDED.nom_matiere
    "#,
  )
  .bind(&code)
  .bind(&nom)
  .bind(annee)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to create matiere"))?;

  sqlx::query(
    r#"
    INSERT INTO mat_promo (id_mat, id_promo)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(&code)
  .bind(promo_id)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to attach matiere to promotion"))?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize matiere creation"))?;

  Ok(MutationAck {
    message: "matiere added to promotion",
  })
}

pub async fn add_professeur_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  payload: CreateProfesseurInput,
) -> Result<MutationAck, ApiError> {
  let prenom = payload.prenom.trim().to_string();
  let nom = payload.nom.trim().to_string();
  let email = payload.email.trim().to_lowercase();
  let date_naissance = payload
    .date_naissance
    .unwrap_or_else(|| chrono::Utc::now().date_naive());

  if prenom.is_empty() || nom.is_empty() || email.is_empty() {
    return Err(ApiError::bad_request("prenom, nom and email are required"));
  }

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create professeur"))?;

  let prof_id = sqlx::query_scalar::<_, Uuid>(
    r#"
    INSERT INTO professeur (prenom, nom, email, date_naissance)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email)
    DO UPDATE SET prenom = EXCLUDED.prenom, nom = EXCLUDED.nom
    RETURNING id
    "#,
  )
  .bind(prenom)
  .bind(nom)
  .bind(email)
  .bind(date_naissance)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_schema_error("unable to create professeur"))?;

  sqlx::query(
    r#"
    INSERT INTO prof_promo (id_prof, id_promo)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(prof_id)
  .bind(promo_id)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to attach professeur to promotion"))?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize professeur creation"))?;

  Ok(MutationAck {
    message: "professeur added to promotion",
  })
}

pub async fn set_referent_for_matiere(
  db: &PgPool,
  promo_id: Uuid,
  matiere_id: String,
  prof_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let matiere_code = matiere_id.trim().to_lowercase();
  if matiere_code.is_empty() {
    return Err(ApiError::bad_request("matiere id is required"));
  }

  let matiere_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM mat_promo
    WHERE id_mat = $1 AND id_promo = $2
    "#,
  )
  .bind(&matiere_code)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to update referent"))?
    > 0;

  if !matiere_exists {
    return Err(ApiError::bad_request(
      "matiere is not attached to this promotion",
    ));
  }

  let prof_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM prof_promo
    WHERE id_prof = $1 AND id_promo = $2
    "#,
  )
  .bind(prof_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to update referent"))?
    > 0;

  if !prof_exists {
    return Err(ApiError::bad_request(
      "professeur is not attached to this promotion",
    ));
  }

  sqlx::query(
    r#"
    INSERT INTO referent_matiere_promo (id_mat, id_promo, id_prof)
    VALUES ($1, $2, $3)
    ON CONFLICT (id_mat, id_promo)
    DO UPDATE SET id_prof = EXCLUDED.id_prof
    "#,
  )
  .bind(matiere_code)
  .bind(promo_id)
  .bind(prof_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to set matiere referent"))?;

  Ok(MutationAck {
    message: "referent updated",
  })
}

pub async fn update_promotion_ical_url(
  db: &PgPool,
  promo_id: Uuid,
  payload: UpdateIcalInput,
) -> Result<MutationAck, ApiError> {
  let ical = payload.ical_url.trim();
  if ical.is_empty() {
    return Err(ApiError::bad_request("ical_url is required"));
  }

  let result = sqlx::query(
    r#"
    UPDATE promotion
    SET ical_url = $2
    WHERE id = $1
    "#,
  )
  .bind(promo_id)
  .bind(ical)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update iCal URL"))?;

  if result.rows_affected() == 0 {
    return Err(ApiError::bad_request("promotion not found"));
  }

  Ok(MutationAck {
    message: "iCal URL updated",
  })
}

async fn get_accessible_promotion(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<PromotionScope, ApiError> {
  if auth.roles.iter().any(|r| r == "admin") {
    return sqlx::query_as::<_, PromotionScope>(
      r#"
      SELECT
        id,
        image_url,
        ical_url,
        annee_debut,
        annee_fin,
        TRUE AS can_manage
      FROM promotion
      WHERE id = $1
      "#,
    )
    .bind(promo_id)
    .fetch_optional(db)
    .await
    .map_err(map_schema_error("unable to load promotion"))?
    .ok_or_else(|| ApiError::forbidden("promotion is not accessible"));
  }

  sqlx::query_as::<_, PromotionScope>(
    r#"
    SELECT
      p.id,
      p.image_url,
      p.ical_url,
      p.annee_debut,
      p.annee_fin,
      EXISTS (
        SELECT 1
        FROM delegue_promo dp
        WHERE dp.id_promo = p.id AND dp.id_etu = $1
      ) AS can_manage
    FROM promotion p
    JOIN etu_promo ep ON ep.id_promo = p.id
    WHERE p.id = $2 AND ep.id_etu = $1
    "#,
  )
  .bind(auth.user_id)
  .bind(promo_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to load promotion"))?
  .ok_or_else(|| ApiError::forbidden("promotion is not accessible"))
}

fn map_schema_error(message: &'static str) -> impl Fn(sqlx::Error) -> ApiError {
  move |error| match error {
    sqlx::Error::Database(db_err)
      if matches!(db_err.code().as_deref(), Some("42P01") | Some("42703")) =>
    {
      ApiError::internal("database schema is outdated for promotion management")
    }
    _ => ApiError::internal(message),
  }
}
