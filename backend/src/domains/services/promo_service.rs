use chrono::{DateTime, NaiveDate, Utc};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::domains::{error::ApiError, middleware::AuthContext};
use crate::infrastructure::s3;

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateUeInput {
  pub nom_ue: String,
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateUeInput {
  pub nom_ue: Option<String>,
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct UePayload {
  pub id: Uuid,
  pub nom_ue: String,
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct UeCatalogItem {
  pub id: Uuid,
  pub nom_ue: String,
  pub semestre: i32,
  pub linked_to_promo: bool,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct UePromotionLinkPayload {
  pub id: Uuid,
  pub nom: String,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub linked: bool,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereInput {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub ue_id: Uuid,
  pub coef_ue: Option<f32>,
  pub referent_prof_id: Uuid,
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

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateResultatInput {
  pub etudiant_id: Option<Uuid>,
  pub libelle: String,
  pub session: Option<i32>,
  pub note: f32,
  pub coef: Option<f32>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateResultatInput {
  pub libelle: Option<String>,
  pub session: Option<i32>,
  pub note: Option<f32>,
  pub coef: Option<f32>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateDevoirInput {
  pub id_mat: String,
  pub titre: String,
  pub description: Option<String>,
  pub date_rendu: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateDevoirInput {
  pub id_mat: Option<String>,
  pub titre: Option<String>,
  pub description: Option<String>,
  pub date_rendu: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromotionScope {
  pub id: Uuid,
  pub nom: String,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub referent_prof_email: Option<String>,
  pub can_manage: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DashboardPayload {
  pub promotion: PromotionScope,
  pub etudiants: Vec<PromoStudent>,
  pub matieres: Vec<MatiereDashboardItem>,
  pub professeurs: Vec<ProfesseurDashboardItem>,
  pub devoirs: Vec<DevoirPayload>,
  pub resultats: Vec<ResultatDashboardItem>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromoStudent {
  pub id: Uuid,
  pub numero_etudiant: Option<String>,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MatiereDashboardItem {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub ue_id: Option<Uuid>,
  pub ue_nom: Option<String>,
  pub ue_semestre: Option<i32>,
  pub coef_ue: Option<f32>,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub referent_prof_email: Option<String>,
  pub resources: Vec<MatiereResourceDashboardItem>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct MatiereDashboardRow {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub ue_id: Option<Uuid>,
  pub ue_nom: Option<String>,
  pub ue_semestre: Option<i32>,
  pub coef_ue: Option<f32>,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub referent_prof_email: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct MatiereResourceDashboardItem {
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
  pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct DevoirPayload {
  pub id: Uuid,
  pub id_promo: Uuid,
  pub id_mat: String,
  pub nom_matiere: String,
  pub titre: String,
  pub description: Option<String>,
  pub date_rendu: Option<DateTime<Utc>>,
  pub created_at: DateTime<Utc>,
  pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct ProfesseurDashboardItem {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct ResultatDashboardItem {
  pub id: Uuid,
  pub id_mat: String,
  pub nom_matiere: String,
  pub id_etu: Uuid,
  pub etu_numero: Option<String>,
  pub etu_nom: String,
  pub etu_prenom: String,
  pub libelle: String,
  pub session: Option<i32>,
  pub note: f32,
  pub coef: f32,
  pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MutationAck {
  pub message: &'static str,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct ResourceFileRow {
  id_promo: Option<Uuid>,
  s3_bucket: String,
  s3_key: String,
  content_type: Option<String>,
  title: String,
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
        p.nom,
        p.image_url,
        p.ical_url,
        p.annee_arrivee,
        p.annee_depart,
        p.referent_prof_id,
        pr.nom AS referent_prof_nom,
        pr.prenom AS referent_prof_prenom,
        pr.email AS referent_prof_email,
        EXISTS (
          SELECT 1
          FROM delegue_promo dp
          WHERE dp.id_promo = p.id AND dp.id_etu = $1
        ) AS can_manage
      FROM promotion p
      LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
      ORDER BY p.annee_arrivee DESC, p.nom
      "#,
    )
    .bind(auth.user_id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list promotions"));
  }

  sqlx::query_as::<_, PromotionScope>(
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
      pr.email AS referent_prof_email,
      EXISTS (
        SELECT 1
        FROM delegue_promo dp
        WHERE dp.id_promo = p.id AND dp.id_etu = $1
      ) AS can_manage
    FROM promotion p
    JOIN etu_promo ep ON ep.id_promo = p.id
    LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
    WHERE ep.id_etu = $1
    ORDER BY p.annee_arrivee DESC, p.nom
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

  let etudiants = sqlx::query_as::<_, PromoStudent>(
    r#"
    SELECT e.id, e.numero_etudiant, e.nom, e.prenom, e.email
    FROM etu_promo ep
    JOIN etudiant e ON e.id = ep.id_etu
    WHERE ep.id_promo = $1
    ORDER BY e.nom, e.prenom
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load students"))?;

  let matieres_rows = sqlx::query_as::<_, MatiereDashboardRow>(
    r#"
    SELECT
      m.code_matiere,
      m.nom_matiere,
      mu.id_ue AS ue_id,
      u.nom_ue AS ue_nom,
      u.semestre AS ue_semestre,
      mu.coef_ue,
      rmp.id_prof AS referent_prof_id,
      p.nom AS referent_prof_nom,
      p.prenom AS referent_prof_prenom,
      p.email AS referent_prof_email
    FROM mat_promo mp
    JOIN matiere m ON m.code_matiere = mp.id_mat
    LEFT JOIN matiere_ue mu ON mu.id_matiere = m.code_matiere AND mu.id_promo = mp.id_promo
    LEFT JOIN ue u ON u.id = mu.id_ue
    LEFT JOIN referent_matiere_promo rmp ON rmp.id_mat = mp.id_mat AND rmp.id_promo = mp.id_promo
    LEFT JOIN professeur p ON p.id = rmp.id_prof
    WHERE mp.id_promo = $1
    ORDER BY m.nom_matiere, m.code_matiere
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load subjects"))?;

  let mut matieres = matieres_rows
    .into_iter()
    .map(|row| MatiereDashboardItem {
      code_matiere: row.code_matiere,
      nom_matiere: row.nom_matiere,
      ue_id: row.ue_id,
      ue_nom: row.ue_nom,
      ue_semestre: row.ue_semestre,
      coef_ue: row.coef_ue,
      referent_prof_id: row.referent_prof_id,
      referent_prof_nom: row.referent_prof_nom,
      referent_prof_prenom: row.referent_prof_prenom,
      referent_prof_email: row.referent_prof_email,
      resources: Vec::new(),
    })
    .collect::<Vec<_>>();

  let resources = sqlx::query_as::<_, MatiereResourceDashboardItem>(
    r#"
    SELECT id, id_mat, id_promo, type_metier::text AS type_metier, title, description,
           s3_bucket, s3_key, url, content_type, size_bytes, created_at
    FROM matiere_resource
    WHERE id_promo = $1 OR id_promo IS NULL
    ORDER BY created_at DESC
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load subject resources"))?;

  let mut resources_by_mat: HashMap<String, Vec<MatiereResourceDashboardItem>> = HashMap::new();
  for resource in resources {
    resources_by_mat
      .entry(resource.id_mat.clone())
      .or_default()
      .push(resource);
  }

  for matiere in &mut matieres {
    matiere.resources = resources_by_mat
      .remove(&matiere.code_matiere)
      .unwrap_or_default();
  }

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
  .map_err(map_schema_error("unable to load professors"))?;

  let devoirs = list_devoirs_for_promo(db, auth, promo_id).await?;

  let resultats = if promotion.can_manage {
    sqlx::query_as::<_, ResultatDashboardItem>(
      r#"
      SELECT
        nr.id,
        nr.id_mat,
        m.nom_matiere,
        nr.id_etu,
        e.numero_etudiant AS etu_numero,
        e.nom AS etu_nom,
        e.prenom AS etu_prenom,
        nr.libelle,
        nr.session,
        nr.note,
        nr.coef,
        nr.updated_at
      FROM note_resultat nr
      JOIN matiere m ON m.code_matiere = nr.id_mat
      JOIN etudiant e ON e.id = nr.id_etu
      WHERE nr.id_promo = $1
      ORDER BY m.nom_matiere, e.nom, e.prenom, nr.updated_at DESC
      "#,
    )
    .bind(promo_id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to load results"))?
  } else {
    sqlx::query_as::<_, ResultatDashboardItem>(
      r#"
      SELECT
        nr.id,
        nr.id_mat,
        m.nom_matiere,
        nr.id_etu,
        e.numero_etudiant AS etu_numero,
        e.nom AS etu_nom,
        e.prenom AS etu_prenom,
        nr.libelle,
        nr.session,
        nr.note,
        nr.coef,
        nr.updated_at
      FROM note_resultat nr
      JOIN matiere m ON m.code_matiere = nr.id_mat
      JOIN etudiant e ON e.id = nr.id_etu
      WHERE nr.id_promo = $1 AND nr.id_etu = $2
      ORDER BY m.nom_matiere, nr.updated_at DESC
      "#,
    )
    .bind(promo_id)
    .bind(auth.user_id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to load results"))?
  };

  Ok(DashboardPayload {
    promotion,
    etudiants,
    matieres,
    professeurs,
    devoirs,
    resultats,
  })
}

pub async fn get_resource_file_for_user(
  db: &PgPool,
  auth: &AuthContext,
  resource_id: Uuid,
) -> Result<(Vec<u8>, String, String), ApiError> {
  let resource = sqlx::query_as::<_, ResourceFileRow>(
    r#"
    SELECT id_promo, s3_bucket, s3_key, content_type, title
    FROM matiere_resource
    WHERE id = $1
    "#,
  )
  .bind(resource_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to load resource"))?
  .ok_or_else(|| ApiError::bad_request("resource not found"))?;

  let allowed = if auth.roles.iter().any(|r| r == "admin") {
    true
  } else if let Some(promo_id) = resource.id_promo {
    let count = sqlx::query_scalar::<_, i64>(
      r#"
      SELECT COUNT(*)
      FROM etu_promo
      WHERE id_etu = $1 AND id_promo = $2
      "#,
    )
    .bind(auth.user_id)
    .bind(promo_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate permissions"))?;
    count > 0
  } else {
    false
  };

  if !allowed {
    return Err(ApiError::forbidden("you cannot access this resource"));
  }

  let (bytes, downloaded_ct) = s3::download_bytes(&resource.s3_bucket, &resource.s3_key)
    .await
    .map_err(|_| ApiError::internal("unable to read resource file"))?;
  let content_type = resource
    .content_type
    .or(downloaded_ct)
    .unwrap_or_else(|| "application/octet-stream".to_string());
  Ok((bytes, content_type, resource.title))
}

pub async fn list_ues_for_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<Vec<UePayload>, ApiError> {
  let _promotion = get_accessible_promotion(db, auth, promo_id).await?;

  sqlx::query_as::<_, UePayload>(
    r#"
    SELECT u.id, u.nom_ue, u.semestre
    FROM promo_ue pu
    JOIN ue u ON u.id = pu.id_ue
    WHERE pu.id_promo = $1
    ORDER BY semestre, id
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE"))
}

async fn ensure_can_manage_ue_catalog(db: &PgPool, auth: &AuthContext) -> Result<(), ApiError> {
  if auth.roles.iter().any(|role| role == "admin") {
    return Ok(());
  }

  let is_delegue = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM delegue_promo
    WHERE id_etu = $1
    "#,
  )
  .bind(auth.user_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate UE permissions"))?
    > 0;

  if is_delegue {
    return Ok(());
  }

  Err(ApiError::forbidden(
    "insufficient permissions for UE catalog",
  ))
}

pub async fn list_ues(db: &PgPool, auth: &AuthContext) -> Result<Vec<UePayload>, ApiError> {
  ensure_can_manage_ue_catalog(db, auth).await?;

  sqlx::query_as::<_, UePayload>(
    r#"
    SELECT id, nom_ue, semestre
    FROM ue
    ORDER BY semestre, nom_ue
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE catalog"))
}

pub async fn create_ue(
  db: &PgPool,
  auth: &AuthContext,
  payload: CreateUeInput,
) -> Result<UePayload, ApiError> {
  ensure_can_manage_ue_catalog(db, auth).await?;

  let nom_ue = payload.nom_ue.trim().to_string();
  if nom_ue.is_empty() {
    return Err(ApiError::bad_request("nom_ue is required"));
  }
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  sqlx::query_as::<_, UePayload>(
    r#"
    INSERT INTO ue (nom_ue, semestre)
    VALUES ($1, $2)
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(nom_ue)
  .bind(payload.semestre)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to create UE"))
}

pub async fn create_ue_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  payload: CreateUeInput,
) -> Result<UePayload, ApiError> {
  let nom_ue = payload.nom_ue.trim().to_string();
  if nom_ue.is_empty() {
    return Err(ApiError::bad_request("nom_ue is required"));
  }
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  ensure_promotion_exists(db, promo_id).await?;

  let created = sqlx::query_as::<_, (Uuid, String, i32)>(
    r#"
    INSERT INTO ue (nom_ue, semestre)
    VALUES ($1, $2)
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(&nom_ue)
  .bind(payload.semestre)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to create UE"))?;

  sqlx::query(
    r#"
    INSERT INTO promo_ue (id_promo, id_ue)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(promo_id)
  .bind(created.0)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to attach UE to promotion"))?;

  Ok(UePayload {
    id: created.0,
    nom_ue: created.1,
    semestre: created.2,
  })
}

pub async fn update_ue(
  db: &PgPool,
  auth: &AuthContext,
  ue_id: Uuid,
  payload: UpdateUeInput,
) -> Result<UePayload, ApiError> {
  ensure_can_manage_ue_catalog(db, auth).await?;

  let nom_ue = payload
    .nom_ue
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty());
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  sqlx::query_as::<_, UePayload>(
    r#"
    UPDATE ue
    SET nom_ue = COALESCE($2, nom_ue),
        semestre = $3
    WHERE id = $1
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(ue_id)
  .bind(nom_ue)
  .bind(payload.semestre)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update UE"))?
  .ok_or_else(|| ApiError::bad_request("UE not found"))
}

pub async fn delete_ue(
  db: &PgPool,
  auth: &AuthContext,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_can_manage_ue_catalog(db, auth).await?;

  let used = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM matiere_ue
    WHERE id_ue = $1
    "#,
  )
  .bind(ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to delete UE"))?;

  if used > 0 {
    return Err(ApiError::bad_request(
      "remove subject links from this UE before deleting it",
    ));
  }

  let deleted = sqlx::query(
    r#"
    DELETE FROM ue
    WHERE id = $1
    "#,
  )
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to delete UE"))?
  .rows_affected();

  if deleted == 0 {
    return Err(ApiError::bad_request("UE not found"));
  }

  Ok(MutationAck {
    message: "UE deleted",
  })
}

pub async fn list_ue_promotions(
  db: &PgPool,
  auth: &AuthContext,
  ue_id: Uuid,
) -> Result<Vec<UePromotionLinkPayload>, ApiError> {
  ensure_can_manage_ue_catalog(db, auth).await?;

  let ue_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM ue
    WHERE id = $1
    "#,
  )
  .bind(ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to list UE promotions"))?
    > 0;

  if !ue_exists {
    return Err(ApiError::bad_request("UE not found"));
  }

  if auth.roles.iter().any(|role| role == "admin") {
    return sqlx::query_as::<_, UePromotionLinkPayload>(
      r#"
      SELECT
        p.id,
        p.nom,
        p.annee_arrivee,
        p.annee_depart,
        EXISTS(
          SELECT 1
          FROM promo_ue pu
          WHERE pu.id_promo = p.id AND pu.id_ue = $1
        ) AS linked
      FROM promotion p
      ORDER BY p.annee_arrivee DESC, p.nom
      "#,
    )
    .bind(ue_id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list UE promotions"));
  }

  sqlx::query_as::<_, UePromotionLinkPayload>(
    r#"
    SELECT
      p.id,
      p.nom,
      p.annee_arrivee,
      p.annee_depart,
      EXISTS(
        SELECT 1
        FROM promo_ue pu
        WHERE pu.id_promo = p.id AND pu.id_ue = $2
      ) AS linked
    FROM promotion p
    JOIN delegue_promo dp ON dp.id_promo = p.id AND dp.id_etu = $1
    ORDER BY p.annee_arrivee DESC, p.nom
    "#,
  )
  .bind(auth.user_id)
  .bind(ue_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE promotions"))
}

pub async fn list_ue_catalog_for_promo(
  db: &PgPool,
  promo_id: Uuid,
) -> Result<Vec<UeCatalogItem>, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;

  sqlx::query_as::<_, UeCatalogItem>(
    r#"
    SELECT
      u.id,
      u.nom_ue,
      u.semestre,
      EXISTS(
        SELECT 1
        FROM promo_ue pu
        WHERE pu.id_ue = u.id AND pu.id_promo = $1
      ) AS linked_to_promo
    FROM ue u
    ORDER BY u.semestre, u.id
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE catalog"))
}

pub async fn attach_ue_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;

  let ue_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM ue
    WHERE id = $1
    "#,
  )
  .bind(ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to attach UE"))?
    > 0;

  if !ue_exists {
    return Err(ApiError::bad_request("UE not found"));
  }

  sqlx::query(
    r#"
    INSERT INTO promo_ue (id_promo, id_ue)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(promo_id)
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to attach UE"))?;

  Ok(MutationAck {
    message: "UE attached to promotion",
  })
}

pub async fn update_ue_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
  payload: UpdateUeInput,
) -> Result<UePayload, ApiError> {
  let nom_ue = payload
    .nom_ue
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty());
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  ensure_promotion_exists(db, promo_id).await?;
  ensure_ue_attached_to_promo(db, promo_id, ue_id).await?;

  sqlx::query_as::<_, UePayload>(
    r#"
    UPDATE ue
    SET nom_ue = COALESCE($2, nom_ue),
        semestre = $3
    WHERE id = $1
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(ue_id)
  .bind(nom_ue)
  .bind(payload.semestre)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update UE"))?
  .ok_or_else(|| ApiError::bad_request("UE not found"))
}

pub async fn delete_ue_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;
  ensure_ue_attached_to_promo(db, promo_id, ue_id).await?;

  let used_in_target = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM matiere_ue
    WHERE id_ue = $1 AND id_promo = $2
    "#,
  )
  .bind(ue_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to delete UE"))?;

  if used_in_target > 0 {
    return Err(ApiError::bad_request(
      "remove subject links from this UE before deleting it",
    ));
  }

  sqlx::query(
    r#"
    DELETE FROM promo_ue
    WHERE id_promo = $1 AND id_ue = $2
    "#,
  )
  .bind(promo_id)
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to detach UE"))?;

  Ok(MutationAck {
    message: "UE detached from promotion",
  })
}

pub async fn detach_ue_from_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;
  ensure_ue_attached_to_promo(db, promo_id, ue_id).await?;

  let used_in_target = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM matiere_ue
    WHERE id_ue = $1 AND id_promo = $2
    "#,
  )
  .bind(ue_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to detach UE"))?;

  if used_in_target > 0 {
    return Err(ApiError::bad_request(
      "remove subject links from this UE before detaching it",
    ));
  }

  sqlx::query(
    r#"
    DELETE FROM promo_ue
    WHERE id_promo = $1 AND id_ue = $2
    "#,
  )
  .bind(promo_id)
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to detach UE"))?;

  Ok(MutationAck {
    message: "UE detached from promotion",
  })
}

async fn ensure_ue_attached_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<(), ApiError> {
  let attached = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM promo_ue pu
    WHERE pu.id_ue = $1 AND pu.id_promo = $2
    "#,
  )
  .bind(ue_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate UE"))?
    > 0;

  if !attached {
    return Err(ApiError::bad_request(
      "UE is not attached to this promotion",
    ));
  }
  Ok(())
}

pub async fn add_matiere_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  payload: CreateMatiereInput,
) -> Result<MutationAck, ApiError> {
  let code = payload.code_matiere.trim().to_uppercase();
  let nom = payload.nom_matiere.trim().to_string();
  let coef = payload.coef_ue.unwrap_or(1.0);

  if code.is_empty() || nom.is_empty() {
    return Err(ApiError::bad_request(
      "code_matiere and nom_matiere are required",
    ));
  }
  if coef <= 0.0 {
    return Err(ApiError::bad_request("coef_ue must be positive"));
  }

  let annee_arrivee = sqlx::query_scalar::<_, i32>(
    r#"
    SELECT annee_arrivee
    FROM promotion
    WHERE id = $1
    "#,
  )
  .bind(promo_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to create subject"))?
  .ok_or_else(|| ApiError::bad_request("promotion not found"))?;

  let ue_exists_for_promo = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM promo_ue
    WHERE id_ue = $1 AND id_promo = $2
    "#,
  )
  .bind(payload.ue_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate UE"))?
    > 0;

  if !ue_exists_for_promo {
    return Err(ApiError::bad_request("UE is not linked to this promotion"));
  }

  let prof_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM prof_promo
    WHERE id_prof = $1 AND id_promo = $2
    "#,
  )
  .bind(payload.referent_prof_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate professor"))?
    > 0;

  if !prof_exists {
    return Err(ApiError::bad_request(
      "referent professor must be attached to this promotion",
    ));
  }

  let matiere_year = NaiveDate::from_ymd_opt(annee_arrivee, 1, 1)
    .ok_or_else(|| ApiError::bad_request("invalid promotion arrival year"))?;

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create subject"))?;

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
  .bind(matiere_year)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to create subject"))?;

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
  .map_err(map_schema_error("unable to attach subject"))?;

  sqlx::query(
    r#"
    INSERT INTO matiere_ue (id_promo, id_ue, id_matiere, coef_ue)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id_promo, id_matiere)
    DO UPDATE SET id_ue = EXCLUDED.id_ue, coef_ue = EXCLUDED.coef_ue
    "#,
  )
  .bind(promo_id)
  .bind(payload.ue_id)
  .bind(&code)
  .bind(coef)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link subject to UE"))?;

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

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize subject creation"))?;

  Ok(MutationAck {
    message: "subject added to promotion",
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
    .unwrap_or_else(|| Utc::now().date_naive());

  if prenom.is_empty() || nom.is_empty() || email.is_empty() {
    return Err(ApiError::bad_request("prenom, nom and email are required"));
  }

  ensure_promotion_exists(db, promo_id).await?;

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to create professor"))?;

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
  .map_err(map_schema_error("unable to create professor"))?;

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
  .map_err(map_schema_error("unable to attach professor"))?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize professor creation"))?;

  Ok(MutationAck {
    message: "professor added to promotion",
  })
}

pub async fn set_referent_for_matiere(
  db: &PgPool,
  promo_id: Uuid,
  matiere_id: String,
  prof_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let matiere_code = matiere_id.trim().to_uppercase();
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
      "subject is not attached to this promotion",
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
      "professor is not attached to this promotion",
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
  .map_err(map_schema_error("unable to set subject referent"))?;

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

pub async fn list_devoirs_for_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<Vec<DevoirPayload>, ApiError> {
  let _promotion = get_accessible_promotion(db, auth, promo_id).await?;

  sqlx::query_as::<_, DevoirPayload>(
    r#"
    SELECT
      d.id,
      d.id_promo,
      d.id_mat,
      m.nom_matiere,
      d.titre,
      d.description,
      d.date_rendu,
      d.created_at,
      d.updated_at
    FROM devoir d
    JOIN matiere m ON m.code_matiere = d.id_mat
    WHERE d.id_promo = $1
    ORDER BY d.date_rendu NULLS LAST, d.created_at DESC
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list homework"))
}

pub async fn create_devoir_for_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
  payload: CreateDevoirInput,
) -> Result<MutationAck, ApiError> {
  let code = payload.id_mat.trim().to_uppercase();
  let titre = payload.titre.trim().to_string();
  if code.is_empty() || titre.is_empty() {
    return Err(ApiError::bad_request("id_mat and titre are required"));
  }

  ensure_subject_in_promo(db, &code, promo_id).await?;

  sqlx::query(
    r#"
    INSERT INTO devoir (id_promo, id_mat, titre, description, date_rendu, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $6)
    "#,
  )
  .bind(promo_id)
  .bind(code)
  .bind(titre)
  .bind(payload.description)
  .bind(payload.date_rendu)
  .bind(auth.user_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to create homework"))?;

  Ok(MutationAck {
    message: "homework created",
  })
}

pub async fn update_devoir_for_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
  devoir_id: Uuid,
  payload: UpdateDevoirInput,
) -> Result<MutationAck, ApiError> {
  let current = sqlx::query_as::<_, (String, String, Option<String>, Option<DateTime<Utc>>)>(
    r#"
    SELECT id_mat, titre, description, date_rendu
    FROM devoir
    WHERE id = $1 AND id_promo = $2
    "#,
  )
  .bind(devoir_id)
  .bind(promo_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update homework"))?
  .ok_or_else(|| ApiError::bad_request("homework not found"))?;

  let code = payload
    .id_mat
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(str::to_uppercase)
    .unwrap_or(current.0);
  let titre = payload
    .titre
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or(&current.1)
    .to_string();
  let description = payload.description.or(current.2);
  let date_rendu = payload.date_rendu.or(current.3);

  ensure_subject_in_promo(db, &code, promo_id).await?;

  sqlx::query(
    r#"
    UPDATE devoir
    SET id_mat = $2,
        titre = $3,
        description = $4,
        date_rendu = $5,
        updated_by = $6,
        updated_at = NOW()
    WHERE id = $1 AND id_promo = $7
    "#,
  )
  .bind(devoir_id)
  .bind(code)
  .bind(titre)
  .bind(description)
  .bind(date_rendu)
  .bind(auth.user_id)
  .bind(promo_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update homework"))?;

  Ok(MutationAck {
    message: "homework updated",
  })
}

pub async fn delete_devoir_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  devoir_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let deleted = sqlx::query(
    r#"
    DELETE FROM devoir
    WHERE id = $1 AND id_promo = $2
    "#,
  )
  .bind(devoir_id)
  .bind(promo_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to delete homework"))?
  .rows_affected();

  if deleted == 0 {
    return Err(ApiError::bad_request("homework not found"));
  }

  Ok(MutationAck {
    message: "homework deleted",
  })
}

pub async fn fetch_promotion_ical(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<String, ApiError> {
  let promotion = get_accessible_promotion(db, auth, promo_id).await?;
  let ical_url = promotion
    .ical_url
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .ok_or_else(|| ApiError::bad_request("promotion does not have an iCal URL"))?;

  let response = reqwest::get(&ical_url)
    .await
    .map_err(|_| ApiError::internal("unable to fetch remote iCal"))?;

  if !response.status().is_success() {
    return Err(ApiError::bad_request("unable to fetch remote iCal"));
  }

  response
    .text()
    .await
    .map_err(|_| ApiError::internal("unable to read remote iCal response"))
}

pub async fn create_resultat_for_matiere(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
  matiere_id: String,
  payload: CreateResultatInput,
) -> Result<MutationAck, ApiError> {
  let can_manage = can_manage_promo(db, auth, promo_id).await?;

  let target_student = match (can_manage, payload.etudiant_id) {
    (true, Some(id)) => id,
    (true, None) => {
      return Err(ApiError::bad_request(
        "etudiant_id is required for this action",
      ));
    }
    (false, Some(id)) if id == auth.user_id => auth.user_id,
    (false, Some(_)) => {
      return Err(ApiError::forbidden(
        "you can only create results for your own account",
      ));
    }
    (false, None) => auth.user_id,
  };

  let code = matiere_id.trim().to_uppercase();
  if code.is_empty() || payload.libelle.trim().is_empty() {
    return Err(ApiError::bad_request("matiere_id and libelle are required"));
  }

  ensure_student_in_promo(db, target_student, promo_id).await?;
  ensure_subject_in_promo(db, &code, promo_id).await?;

  let coef = payload.coef.unwrap_or(1.0);
  if coef <= 0.0 {
    return Err(ApiError::bad_request("coef must be positive"));
  }

  sqlx::query(
    r#"
    INSERT INTO note_resultat
      (id_promo, id_mat, id_etu, libelle, session, note, coef, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    "#,
  )
  .bind(promo_id)
  .bind(code)
  .bind(target_student)
  .bind(payload.libelle.trim())
  .bind(payload.session)
  .bind(payload.note)
  .bind(coef)
  .bind(auth.user_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to create result"))?;

  Ok(MutationAck {
    message: "result created",
  })
}

pub async fn update_resultat(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
  resultat_id: Uuid,
  payload: UpdateResultatInput,
) -> Result<MutationAck, ApiError> {
  let row = sqlx::query_as::<_, (Uuid, String, Uuid)>(
    r#"
    SELECT nr.id_etu, nr.id_mat, nr.id_promo
    FROM note_resultat nr
    WHERE nr.id = $1
    "#,
  )
  .bind(resultat_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update result"))?
  .ok_or_else(|| ApiError::bad_request("result not found"))?;

  if row.2 != promo_id {
    return Err(ApiError::bad_request(
      "result does not belong to this promotion",
    ));
  }

  ensure_student_in_promo(db, row.0, promo_id).await?;
  ensure_subject_in_promo(db, &row.1, promo_id).await?;

  let can_manage = can_manage_promo(db, auth, promo_id).await?;
  if !can_manage && row.0 != auth.user_id {
    return Err(ApiError::forbidden(
      "you can only update results for your own account",
    ));
  }

  let current = sqlx::query_as::<_, (String, Option<i32>, f32, f32)>(
    r#"
    SELECT libelle, session, note, coef
    FROM note_resultat
    WHERE id = $1
    "#,
  )
  .bind(resultat_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to update result"))?;

  let libelle = payload
    .libelle
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .unwrap_or(&current.0)
    .to_string();
  let session = payload.session.or(current.1);
  let note = payload.note.unwrap_or(current.2);
  let coef = payload.coef.unwrap_or(current.3);

  if coef <= 0.0 {
    return Err(ApiError::bad_request("coef must be positive"));
  }

  sqlx::query(
    r#"
    UPDATE note_resultat
    SET libelle = $2, session = $3, note = $4, coef = $5, updated_by = $6, updated_at = NOW()
    WHERE id = $1
    "#,
  )
  .bind(resultat_id)
  .bind(libelle)
  .bind(session)
  .bind(note)
  .bind(coef)
  .bind(auth.user_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update result"))?;

  Ok(MutationAck {
    message: "result updated",
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
        p.id,
        p.nom,
        p.image_url,
        p.ical_url,
        p.annee_arrivee,
        p.annee_depart,
        p.referent_prof_id,
        pr.nom AS referent_prof_nom,
        pr.prenom AS referent_prof_prenom,
        pr.email AS referent_prof_email,
        EXISTS (
          SELECT 1
          FROM delegue_promo dp
          WHERE dp.id_promo = p.id AND dp.id_etu = $1
        ) AS can_manage
      FROM promotion p
      LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
      WHERE p.id = $2
      "#,
    )
    .bind(auth.user_id)
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
      p.nom,
      p.image_url,
      p.ical_url,
      p.annee_arrivee,
      p.annee_depart,
      p.referent_prof_id,
      pr.nom AS referent_prof_nom,
      pr.prenom AS referent_prof_prenom,
      pr.email AS referent_prof_email,
      EXISTS (
        SELECT 1
        FROM delegue_promo dp
        WHERE dp.id_promo = p.id AND dp.id_etu = $1
      ) AS can_manage
    FROM promotion p
    JOIN etu_promo ep ON ep.id_promo = p.id
    LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
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

async fn can_manage_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<bool, ApiError> {
  let has_scope = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM delegue_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(auth.user_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate permissions"))?
    > 0;

  Ok(has_scope)
}

async fn ensure_promotion_exists(db: &PgPool, promo_id: Uuid) -> Result<(), ApiError> {
  let exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM promotion WHERE id = $1")
    .bind(promo_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate promotion"))?
    > 0;

  if !exists {
    return Err(ApiError::bad_request("promotion not found"));
  }

  Ok(())
}

async fn ensure_student_in_promo(
  db: &PgPool,
  etu_id: Uuid,
  promo_id: Uuid,
) -> Result<(), ApiError> {
  let in_promo = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM etu_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate student"))?
    > 0;

  if !in_promo {
    return Err(ApiError::bad_request(
      "student is not attached to this promotion",
    ));
  }

  Ok(())
}

async fn ensure_subject_in_promo(
  db: &PgPool,
  mat_code: &str,
  promo_id: Uuid,
) -> Result<(), ApiError> {
  let in_promo = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM mat_promo
    WHERE id_mat = $1 AND id_promo = $2
    "#,
  )
  .bind(mat_code)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate subject"))?
    > 0;

  if !in_promo {
    return Err(ApiError::bad_request(
      "subject is not attached to this promotion",
    ));
  }

  Ok(())
}

fn map_schema_error(message: &'static str) -> impl Fn(sqlx::Error) -> ApiError {
  move |error| match error {
    sqlx::Error::Database(db_err)
      if matches!(db_err.code().as_deref(), Some("42P01") | Some("42703")) =>
    {
      ApiError::internal("database schema is outdated for promotion management")
    }
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23503") => {
      ApiError::bad_request("invalid foreign key reference")
    }
    _ => ApiError::internal(message),
  }
}
