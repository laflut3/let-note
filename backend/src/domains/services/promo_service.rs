use chrono::{NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{error::ApiError, middleware::AuthContext};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateUeInput {
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct UePayload {
  pub id: Uuid,
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereInput {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub ue_id: Uuid,
  pub coef_ue: Option<f32>,
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

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct MatiereDashboardItem {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub ue_id: Option<Uuid>,
  pub ue_semestre: Option<i32>,
  pub coef_ue: Option<f32>,
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
  pub updated_at: chrono::DateTime<chrono::Utc>,
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
        p.nom,
        p.image_url,
        p.ical_url,
        p.annee_arrivee,
        p.annee_depart,
        p.referent_prof_id,
        pr.nom AS referent_prof_nom,
        pr.prenom AS referent_prof_prenom,
        pr.email AS referent_prof_email,
        TRUE AS can_manage
      FROM promotion p
      LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
      ORDER BY p.annee_arrivee DESC, p.nom
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

  let matieres = sqlx::query_as::<_, MatiereDashboardItem>(
    r#"
    SELECT
      m.code_matiere,
      m.nom_matiere,
      mu.id_ue AS ue_id,
      u.semestre AS ue_semestre,
      mu.coef_ue,
      rmp.id_prof AS referent_prof_id,
      p.nom AS referent_prof_nom,
      p.prenom AS referent_prof_prenom,
      p.email AS referent_prof_email
    FROM mat_promo mp
    JOIN matiere m ON m.code_matiere = mp.id_mat
    LEFT JOIN matiere_ue mu ON mu.id_matiere = m.code_matiere
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
      JOIN mat_promo mp ON mp.id_mat = nr.id_mat AND mp.id_promo = $1
      JOIN matiere m ON m.code_matiere = nr.id_mat
      JOIN etudiant e ON e.id = nr.id_etu
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
      JOIN mat_promo mp ON mp.id_mat = nr.id_mat AND mp.id_promo = $1
      JOIN matiere m ON m.code_matiere = nr.id_mat
      JOIN etudiant e ON e.id = nr.id_etu
      WHERE nr.id_etu = $2
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
    resultats,
  })
}

pub async fn list_ues_for_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<Vec<UePayload>, ApiError> {
  let _promotion = get_accessible_promotion(db, auth, promo_id).await?;

  sqlx::query_as::<_, UePayload>(
    r#"
    SELECT id, semestre
    FROM ue
    ORDER BY semestre, id
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE"))
}

pub async fn create_ue_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  payload: CreateUeInput,
) -> Result<UePayload, ApiError> {
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  ensure_promotion_exists(db, promo_id).await?;

  sqlx::query_as::<_, (Uuid, i32)>(
    r#"
    INSERT INTO ue (semestre)
    VALUES ($1)
    RETURNING id, semestre
    "#,
  )
  .bind(payload.semestre)
  .fetch_one(db)
  .await
  .map(|row| UePayload {
    id: row.0,
    semestre: row.1,
  })
  .map_err(map_schema_error("unable to create UE"))
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

  let ue_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM ue
    WHERE id = $1
    "#,
  )
  .bind(payload.ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate UE"))?
    > 0;

  if !ue_exists {
    return Err(ApiError::bad_request("UE does not exist"));
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
    INSERT INTO matiere_ue (id_matiere, id_ue, coef_ue)
    VALUES ($1, $2, $3)
    ON CONFLICT (id_matiere, id_ue)
    DO UPDATE SET coef_ue = EXCLUDED.coef_ue
    "#,
  )
  .bind(&code)
  .bind(payload.ue_id)
  .bind(coef)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link subject to UE"))?;

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
    INSERT INTO note_resultat (id_mat, id_etu, libelle, session, note, coef, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    "#,
  )
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
  let row = sqlx::query_as::<_, (Uuid, String)>(
    r#"
    SELECT nr.id_etu, nr.id_mat
    FROM note_resultat nr
    WHERE nr.id = $1
    "#,
  )
  .bind(resultat_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update result"))?
  .ok_or_else(|| ApiError::bad_request("result not found"))?;

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
        TRUE AS can_manage
      FROM promotion p
      LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
      WHERE p.id = $1
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
  if auth.roles.iter().any(|r| r == "admin") {
    return Ok(true);
  }

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
