use chrono::{Datelike, NaiveDate, Utc};
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
  pub referent_prof_id: Option<Uuid>,
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
  pub delegues: Vec<String>,
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

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminMatiereSummary {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub promotion_count: i64,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromotionStudent {
  pub id: Uuid,
  pub numero_etudiant: Option<String>,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminStudentDetailsRow {
  pub id: Uuid,
  pub numero_etudiant: Option<String>,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
  pub roles: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminStudentPromoInfo {
  pub promo_id: Uuid,
  pub promo_nom: String,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub is_delegue: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AdminStudentDetails {
  pub id: Uuid,
  pub numero_etudiant: Option<String>,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
  pub roles: Vec<String>,
  pub promotions: Vec<AdminStudentPromoInfo>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateStudentInput {
  pub numero_etudiant: Option<String>,
  pub prenom: Option<String>,
  pub nom: Option<String>,
  pub email: Option<String>,
  pub date_naissance: Option<NaiveDate>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdatePromotionInput {
  pub nom: Option<String>,
  pub image_url: Option<String>,
  pub ical_url: Option<String>,
  pub annee_arrivee: Option<i32>,
  pub annee_depart: Option<i32>,
  pub referent_prof_id: Option<Uuid>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateProfesseurInput {
  pub prenom: Option<String>,
  pub nom: Option<String>,
  pub email: Option<String>,
  pub date_naissance: Option<NaiveDate>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateMatiereInput {
  pub nom_matiere: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereInput {
  pub code_matiere: String,
  pub nom_matiere: String,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct MatiereResourceItem {
  pub id: Uuid,
  pub id_mat: String,
  pub id_promo: Option<Uuid>,
  pub type_metier: String,
  pub title: String,
  pub description: Option<String>,
  pub s3_bucket: String,
  pub s3_key: String,
  pub url: Option<String>,
  pub content_type: Option<String>,
  pub size_bytes: Option<i64>,
  pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereResourceInput {
  pub id_promo: Option<Uuid>,
  pub type_metier: String,
  pub title: String,
  pub description: Option<String>,
  pub s3_bucket: String,
  pub s3_key: String,
  pub url: Option<String>,
  pub content_type: Option<String>,
  pub size_bytes: Option<i64>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct LinkMatiereAllPromotionsInput {
  pub nom_matiere: Option<String>,
  pub ue_id: Uuid,
  pub coef_ue: Option<f32>,
  pub referent_prof_id: Uuid,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct LinkMatierePromotionInput {
  pub promo_id: Uuid,
  pub nom_matiere: Option<String>,
  pub ue_id: Uuid,
  pub coef_ue: Option<f32>,
  pub referent_prof_id: Uuid,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MutationAck {
  pub message: &'static str,
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
      COUNT(DISTINCT dp.id_etu)::BIGINT AS delegue_count,
      COALESCE(
        ARRAY_AGG(DISTINCT CONCAT(e.prenom, ' ', e.nom))
        FILTER (WHERE e.id IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS delegues
    FROM promotion p
    LEFT JOIN etu_promo ep ON ep.id_promo = p.id
    LEFT JOIN delegue_promo dp ON dp.id_promo = p.id
    LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
    LEFT JOIN etudiant e ON e.id = dp.id_etu
    GROUP BY p.id, pr.id
    ORDER BY p.annee_arrivee DESC, p.nom
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list promotions at this time"))
}

pub async fn list_students_details(db: &PgPool) -> Result<Vec<AdminStudentDetails>, ApiError> {
  let rows = sqlx::query_as::<_, AdminStudentDetailsRow>(
    r#"
    SELECT
      e.id,
      e.numero_etudiant,
      e.nom,
      e.prenom,
      e.email,
      e.date_naissance,
      COALESCE(ARRAY_AGG(DISTINCT r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY[]::TEXT[]) AS roles
    FROM etudiant e
    LEFT JOIN role_etu re ON re.id_etu = e.id
    LEFT JOIN role r ON r.id = re.id_role
    GROUP BY e.id
    ORDER BY e.nom, e.prenom, e.email
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list student details"))?;

  let mut out = Vec::with_capacity(rows.len());
  for row in rows {
    let promotions = sqlx::query_as::<_, AdminStudentPromoInfo>(
      r#"
      SELECT
        p.id AS promo_id,
        p.nom AS promo_nom,
        p.annee_arrivee,
        p.annee_depart,
        EXISTS (
          SELECT 1
          FROM delegue_promo dp
          WHERE dp.id_etu = $1 AND dp.id_promo = p.id
        ) AS is_delegue
      FROM etu_promo ep
      JOIN promotion p ON p.id = ep.id_promo
      WHERE ep.id_etu = $1
      ORDER BY p.annee_arrivee DESC, p.nom
      "#,
    )
    .bind(row.id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list student promotion details"))?;

    out.push(AdminStudentDetails {
      id: row.id,
      numero_etudiant: row.numero_etudiant,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      date_naissance: row.date_naissance,
      roles: row.roles,
      promotions,
    });
  }

  Ok(out)
}

pub async fn update_student(
  db: &PgPool,
  etu_id: Uuid,
  payload: UpdateStudentInput,
) -> Result<MutationAck, ApiError> {
  let current = sqlx::query_as::<_, (Option<String>, String, String, String, NaiveDate)>(
    r#"
    SELECT numero_etudiant, prenom, nom, email, date_naissance
    FROM etudiant
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update student"))?
  .ok_or_else(|| ApiError::bad_request("student not found"))?;

  let numero_etudiant = payload
    .numero_etudiant
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .map(str::to_string)
    .or(current.0);
  if let Some(ref numero) = numero_etudiant
    && (numero.len() != 8 || !numero.chars().all(|char| char.is_ascii_digit()))
  {
    return Err(ApiError::bad_request(
      "student number must contain exactly 8 digits",
    ));
  }

  let prenom = payload
    .prenom
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .unwrap_or(&current.1)
    .to_string();
  let nom = payload
    .nom
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .unwrap_or(&current.2)
    .to_string();
  let email = payload
    .email
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .unwrap_or(&current.3)
    .to_lowercase();
  let date_naissance = payload.date_naissance.unwrap_or(current.4);

  sqlx::query(
    r#"
    UPDATE etudiant
    SET numero_etudiant = $2, prenom = $3, nom = $4, email = $5, date_naissance = $6
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .bind(numero_etudiant)
  .bind(prenom)
  .bind(nom)
  .bind(email)
  .bind(date_naissance)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update student"))?;

  Ok(MutationAck {
    message: "student updated",
  })
}

pub async fn list_matieres(db: &PgPool) -> Result<Vec<AdminMatiereSummary>, ApiError> {
  sqlx::query_as::<_, AdminMatiereSummary>(
    r#"
    SELECT
      m.code_matiere,
      m.nom_matiere,
      COUNT(DISTINCT mp.id_promo)::BIGINT AS promotion_count
    FROM matiere m
    LEFT JOIN mat_promo mp ON mp.id_mat = m.code_matiere
    GROUP BY m.code_matiere, m.nom_matiere
    ORDER BY m.nom_matiere, m.code_matiere
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list subjects at this time"))
}

pub async fn create_matiere(
  db: &PgPool,
  payload: CreateMatiereInput,
) -> Result<MutationAck, ApiError> {
  let code = payload.code_matiere.trim().to_uppercase();
  let nom = payload.nom_matiere.trim().to_string();

  if code.is_empty() || nom.is_empty() {
    return Err(ApiError::bad_request(
      "code_matiere and nom_matiere are required",
    ));
  }

  let year = Utc::now().year();
  let annee = NaiveDate::from_ymd_opt(year, 1, 1)
    .ok_or_else(|| ApiError::internal("unable to compute subject year"))?;

  sqlx::query(
    r#"
    INSERT INTO matiere (code_matiere, nom_matiere, annee)
    VALUES ($1, $2, $3)
    "#,
  )
  .bind(code)
  .bind(nom)
  .bind(annee)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to create subject"))?;

  Ok(MutationAck {
    message: "subject created",
  })
}

pub async fn list_matiere_resources(
  db: &PgPool,
  code_matiere: &str,
) -> Result<Vec<MatiereResourceItem>, ApiError> {
  sqlx::query_as::<_, MatiereResourceItem>(
    r#"
    SELECT id, id_mat, id_promo, type_metier::text AS type_metier, title, description,
           s3_bucket, s3_key, url, content_type, size_bytes, created_at
    FROM matiere_resource
    WHERE id_mat = $1
    ORDER BY type_metier, created_at DESC
    "#,
  )
  .bind(code_matiere.trim().to_uppercase())
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list subject resources"))
}

pub async fn create_matiere_resource(
  db: &PgPool,
  code_matiere: &str,
  payload: CreateMatiereResourceInput,
  created_by: Uuid,
) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  if code.is_empty() || payload.type_metier.trim().is_empty() || payload.title.trim().is_empty() {
    return Err(ApiError::bad_request(
      "id_mat, type_metier and title are required",
    ));
  }
  if payload.s3_bucket.trim().is_empty() || payload.s3_key.trim().is_empty() {
    return Err(ApiError::bad_request("s3_bucket and s3_key are required"));
  }

  sqlx::query(
    r#"
    INSERT INTO matiere_resource
      (id_mat, id_promo, type_metier, title, description, s3_bucket, s3_key, url, content_type, size_bytes, created_by)
    VALUES ($1, $2, $3::resource_type_metier, $4, $5, $6, $7, $8, $9, $10, $11)
    "#,
  )
  .bind(code)
  .bind(payload.id_promo)
  .bind(payload.type_metier.trim().to_lowercase())
  .bind(payload.title.trim())
  .bind(payload.description.map(|v| v.trim().to_string()))
  .bind(payload.s3_bucket.trim())
  .bind(payload.s3_key.trim())
  .bind(payload.url.map(|v| v.trim().to_string()))
  .bind(payload.content_type.map(|v| v.trim().to_string()))
  .bind(payload.size_bytes)
  .bind(created_by)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to create subject resource"))?;

  Ok(MutationAck {
    message: "subject resource created",
  })
}

pub async fn delete_matiere_resource(
  db: &PgPool,
  resource_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let result = sqlx::query("DELETE FROM matiere_resource WHERE id = $1")
    .bind(resource_id)
    .execute(db)
    .await
    .map_err(map_schema_error("unable to delete subject resource"))?;

  if result.rows_affected() == 0 {
    return Err(ApiError::bad_request("subject resource not found"));
  }

  Ok(MutationAck {
    message: "subject resource deleted",
  })
}

pub async fn link_matiere_to_all_promotions(
  db: &PgPool,
  code_matiere: &str,
  payload: LinkMatiereAllPromotionsInput,
) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  if code.is_empty() {
    return Err(ApiError::bad_request("code_matiere is required"));
  }
  if payload.coef_ue.unwrap_or(1.0) <= 0.0 {
    return Err(ApiError::bad_request("coef_ue must be positive"));
  }

  let prof_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM professeur WHERE id = $1")
    .bind(payload.referent_prof_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate professor"))?
    > 0;
  if !prof_exists {
    return Err(ApiError::bad_request("referent professor does not exist"));
  }

  let ue_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM ue WHERE id = $1")
    .bind(payload.ue_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate UE"))?
    > 0;
  if !ue_exists {
    return Err(ApiError::bad_request("UE does not exist"));
  }

  let promo_ids = sqlx::query_scalar::<_, Uuid>("SELECT id FROM promotion")
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list promotions"))?;
  if promo_ids.is_empty() {
    return Err(ApiError::bad_request("no promotion found"));
  }

  let nom = payload
    .nom_matiere
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&code)
    .to_string();

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to link subject to promotions"))?;

  let annee = NaiveDate::from_ymd_opt(Utc::now().year(), 1, 1)
    .ok_or_else(|| ApiError::internal("unable to compute subject year"))?;

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
  .map_err(map_schema_error("unable to upsert subject"))?;

  sqlx::query(
    r#"
    INSERT INTO matiere_ue (id_matiere, id_ue, coef_ue)
    VALUES ($1, $2, $3)
    ON CONFLICT (id_matiere, id_ue)
    DO UPDATE SET coef_ue = EXCLUDED.coef_ue
    "#,
  )
  .bind(&code)
  .bind(payload.ue_id)
  .bind(payload.coef_ue.unwrap_or(1.0))
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link subject to UE"))?;

  for promo_id in promo_ids {
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
    .map_err(map_schema_error("unable to link subject to promotion"))?;

    sqlx::query(
      r#"
      INSERT INTO prof_promo (id_prof, id_promo)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      "#,
    )
    .bind(payload.referent_prof_id)
    .bind(promo_id)
    .execute(&mut *tx)
    .await
    .map_err(map_schema_error("unable to link professor to promotion"))?;

    sqlx::query(
      r#"
      INSERT INTO referent_matiere_promo (id_mat, id_promo, id_prof)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_mat, id_promo)
      DO UPDATE SET id_prof = EXCLUDED.id_prof
      "#,
    )
    .bind(&code)
    .bind(promo_id)
    .bind(payload.referent_prof_id)
    .execute(&mut *tx)
    .await
    .map_err(map_schema_error("unable to set subject referent"))?;
  }

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize subject link"))?;

  Ok(MutationAck {
    message: "subject linked to all promotions",
  })
}

pub async fn link_matiere_to_promotion(
  db: &PgPool,
  code_matiere: &str,
  payload: LinkMatierePromotionInput,
) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  if code.is_empty() {
    return Err(ApiError::bad_request("code_matiere is required"));
  }
  if payload.coef_ue.unwrap_or(1.0) <= 0.0 {
    return Err(ApiError::bad_request("coef_ue must be positive"));
  }

  let promo_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM promotion WHERE id = $1")
    .bind(payload.promo_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate promotion"))?
    > 0;
  if !promo_exists {
    return Err(ApiError::bad_request("promotion not found"));
  }

  let prof_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM professeur WHERE id = $1")
    .bind(payload.referent_prof_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate professor"))?
    > 0;
  if !prof_exists {
    return Err(ApiError::bad_request("referent professor does not exist"));
  }

  let ue_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM ue WHERE id = $1")
    .bind(payload.ue_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate UE"))?
    > 0;
  if !ue_exists {
    return Err(ApiError::bad_request("UE does not exist"));
  }

  let nom = payload
    .nom_matiere
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&code)
    .to_string();
  let annee = NaiveDate::from_ymd_opt(Utc::now().year(), 1, 1)
    .ok_or_else(|| ApiError::internal("unable to compute subject year"))?;

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to link subject to promotion"))?;

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
  .map_err(map_schema_error("unable to upsert subject"))?;

  sqlx::query(
    r#"
    INSERT INTO matiere_ue (id_matiere, id_ue, coef_ue)
    VALUES ($1, $2, $3)
    ON CONFLICT (id_matiere, id_ue)
    DO UPDATE SET coef_ue = EXCLUDED.coef_ue
    "#,
  )
  .bind(&code)
  .bind(payload.ue_id)
  .bind(payload.coef_ue.unwrap_or(1.0))
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link subject to UE"))?;

  sqlx::query(
    r#"
    INSERT INTO mat_promo (id_mat, id_promo)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(&code)
  .bind(payload.promo_id)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link subject to promotion"))?;

  sqlx::query(
    r#"
    INSERT INTO prof_promo (id_prof, id_promo)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(payload.referent_prof_id)
  .bind(payload.promo_id)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link professor to promotion"))?;

  sqlx::query(
    r#"
    INSERT INTO referent_matiere_promo (id_mat, id_promo, id_prof)
    VALUES ($1, $2, $3)
    ON CONFLICT (id_mat, id_promo)
    DO UPDATE SET id_prof = EXCLUDED.id_prof
    "#,
  )
  .bind(&code)
  .bind(payload.promo_id)
  .bind(payload.referent_prof_id)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to set subject referent"))?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize subject link"))?;

  Ok(MutationAck {
    message: "subject linked to promotion",
  })
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

  if let Some(referent_prof_id) = payload.referent_prof_id {
    let referent_exists = sqlx::query_scalar::<_, i64>(
      r#"
      SELECT COUNT(*)
      FROM professeur
      WHERE id = $1
      "#,
    )
    .bind(referent_prof_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate professor"))?
      > 0;

    if !referent_exists {
      return Err(ApiError::bad_request("referent professor does not exist"));
    }
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
    (Uuid, String, String, Option<String>, i32, i32, Option<Uuid>),
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

pub async fn list_promotion_students(
  db: &PgPool,
  promo_id: Uuid,
) -> Result<Vec<PromotionStudent>, ApiError> {
  sqlx::query_as::<_, PromotionStudent>(
    r#"
    SELECT e.id, e.numero_etudiant, e.nom, e.prenom, e.email
    FROM etu_promo ep
    JOIN etudiant e ON e.id = ep.id_etu
    WHERE ep.id_promo = $1
    ORDER BY e.nom, e.prenom, e.email
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list promotion students"))
}

pub async fn add_student_to_promotion(
  db: &PgPool,
  promo_id: Uuid,
  etu_id: Uuid,
) -> Result<MutationAck, ApiError> {
  sqlx::query(
    r#"
    INSERT INTO etu_promo (id_etu, id_promo)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to add student to promotion"))?;

  Ok(MutationAck {
    message: "student added to promotion",
  })
}

pub async fn remove_student_from_promotion(
  db: &PgPool,
  promo_id: Uuid,
  etu_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to remove student from promotion"))?;

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

  sqlx::query(
    r#"
    DELETE FROM etu_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to remove student from promotion"))?;

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
    .map_err(|_| ApiError::internal("unable to finalize student removal"))?;

  Ok(MutationAck {
    message: "student removed from promotion",
  })
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

pub async fn update_promotion(
  db: &PgPool,
  promo_id: Uuid,
  payload: UpdatePromotionInput,
) -> Result<MutationAck, ApiError> {
  let current = sqlx::query_as::<_, (String, String, Option<String>, i32, i32, Option<Uuid>)>(
    r#"
    SELECT nom, image_url, ical_url, annee_arrivee, annee_depart, referent_prof_id
    FROM promotion
    WHERE id = $1
    "#,
  )
  .bind(promo_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update promotion"))?
  .ok_or_else(|| ApiError::bad_request("promotion not found"))?;

  let nom = payload
    .nom
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&current.0)
    .to_string();
  let image_url = payload
    .image_url
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&current.1)
    .to_string();
  let ical_url = payload
    .ical_url
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .or(current.2);
  let annee_arrivee = payload.annee_arrivee.unwrap_or(current.3);
  let annee_depart = payload.annee_depart.unwrap_or(current.4);
  let referent_prof_id = payload.referent_prof_id.or(current.5);

  let (annee_debut, annee_fin) = years_bounds(annee_arrivee, annee_depart)?;

  if let Some(referent_id) = referent_prof_id {
    let referent_exists = sqlx::query_scalar::<_, i64>(
      r#"
      SELECT COUNT(*)
      FROM professeur
      WHERE id = $1
      "#,
    )
    .bind(referent_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate professor"))?
      > 0;

    if !referent_exists {
      return Err(ApiError::bad_request("referent professor does not exist"));
    }
  }

  sqlx::query(
    r#"
    UPDATE promotion
    SET
      nom = $2,
      image_url = $3,
      ical_url = $4,
      annee_arrivee = $5,
      annee_depart = $6,
      annee_debut = $7,
      annee_fin = $8,
      referent_prof_id = $9
    WHERE id = $1
    "#,
  )
  .bind(promo_id)
  .bind(nom)
  .bind(image_url)
  .bind(ical_url)
  .bind(annee_arrivee)
  .bind(annee_depart)
  .bind(annee_debut)
  .bind(annee_fin)
  .bind(referent_prof_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update promotion"))?;

  Ok(MutationAck {
    message: "promotion updated",
  })
}

pub async fn delete_promotion(db: &PgPool, promo_id: Uuid) -> Result<MutationAck, ApiError> {
  let result = sqlx::query(
    r#"
    DELETE FROM promotion
    WHERE id = $1
    "#,
  )
  .bind(promo_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to delete promotion"))?;

  if result.rows_affected() == 0 {
    return Err(ApiError::bad_request("promotion not found"));
  }

  Ok(MutationAck {
    message: "promotion deleted",
  })
}

pub async fn update_professeur(
  db: &PgPool,
  prof_id: Uuid,
  payload: UpdateProfesseurInput,
) -> Result<MutationAck, ApiError> {
  let current = sqlx::query_as::<_, (String, String, String, NaiveDate)>(
    r#"
    SELECT prenom, nom, email, date_naissance
    FROM professeur
    WHERE id = $1
    "#,
  )
  .bind(prof_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update professor"))?
  .ok_or_else(|| ApiError::bad_request("professor not found"))?;

  let prenom = payload
    .prenom
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&current.0)
    .to_string();
  let nom = payload
    .nom
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&current.1)
    .to_string();
  let email = payload
    .email
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&current.2)
    .to_lowercase();
  let date_naissance = payload.date_naissance.unwrap_or(current.3);

  sqlx::query(
    r#"
    UPDATE professeur
    SET prenom = $2, nom = $3, email = $4, date_naissance = $5
    WHERE id = $1
    "#,
  )
  .bind(prof_id)
  .bind(prenom)
  .bind(nom)
  .bind(email)
  .bind(date_naissance)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update professor"))?;

  Ok(MutationAck {
    message: "professor updated",
  })
}

pub async fn delete_professeur(db: &PgPool, prof_id: Uuid) -> Result<MutationAck, ApiError> {
  let result = sqlx::query(
    r#"
    DELETE FROM professeur
    WHERE id = $1
    "#,
  )
  .bind(prof_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to delete professor"))?;

  if result.rows_affected() == 0 {
    return Err(ApiError::bad_request("professor not found"));
  }

  Ok(MutationAck {
    message: "professor deleted",
  })
}

pub async fn update_matiere(
  db: &PgPool,
  code_matiere: &str,
  payload: UpdateMatiereInput,
) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  if code.is_empty() {
    return Err(ApiError::bad_request("subject code is required"));
  }

  let current = sqlx::query_scalar::<_, String>(
    r#"
    SELECT nom_matiere
    FROM matiere
    WHERE code_matiere = $1
    "#,
  )
  .bind(&code)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update subject"))?
  .ok_or_else(|| ApiError::bad_request("subject not found"))?;

  let nom_matiere = payload
    .nom_matiere
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&current)
    .to_string();

  sqlx::query(
    r#"
    UPDATE matiere
    SET nom_matiere = $2
    WHERE code_matiere = $1
    "#,
  )
  .bind(code)
  .bind(nom_matiere)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update subject"))?;

  Ok(MutationAck {
    message: "subject updated",
  })
}

pub async fn delete_matiere(db: &PgPool, code_matiere: &str) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  if code.is_empty() {
    return Err(ApiError::bad_request("subject code is required"));
  }

  let result = sqlx::query(
    r#"
    DELETE FROM matiere
    WHERE code_matiere = $1
    "#,
  )
  .bind(code)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to delete subject"))?;

  if result.rows_affected() == 0 {
    return Err(ApiError::bad_request("subject not found"));
  }

  Ok(MutationAck {
    message: "subject deleted",
  })
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
