pub async fn add_matiere_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  payload: CreateMatiereInput,
) -> Result<MutationAck, ApiError> {
  let code = payload.code_matiere.trim().to_uppercase();
  let nom = payload.nom_matiere.trim().to_string();

  if code.is_empty() || nom.is_empty() {
    return Err(ApiError::bad_request(
      "code_matiere and nom_matiere are required",
    ));
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
