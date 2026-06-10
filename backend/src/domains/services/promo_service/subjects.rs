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

pub async fn create_matiere_resource_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  code_matiere: &str,
  payload: CreatePromoMatiereResourceUploadInput,
  created_by: Uuid,
) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  let type_metier = payload.type_metier.trim().to_lowercase();
  let title = payload.title.trim();

  if code.is_empty() || type_metier.is_empty() || title.is_empty() {
    return Err(ApiError::bad_request(
      "id_mat, type_metier and title are required",
    ));
  }
  if payload.bytes.is_empty() {
    return Err(ApiError::bad_request("file is required"));
  }

  ensure_subject_in_promo(db, &code, promo_id).await?;

  let s3_config =
    s3::read_s3_config().map_err(|_| ApiError::internal("unable to read S3 config"))?;
  let resource_id = Uuid::new_v4();
  let object_key = format!(
    "matieres/{}/{}/{}_{}",
    code,
    type_metier,
    resource_id,
    sanitize_file_name(&payload.file_name)
  );
  let content_size = i64::try_from(payload.bytes.len()).unwrap_or(i64::MAX);

  s3::upload_bytes(&object_key, payload.bytes, payload.content_type.as_deref())
    .await
    .map_err(|_| ApiError::internal("unable to upload file to S3"))?;

  sqlx::query(
    r#"
    INSERT INTO matiere_resource
      (id, id_mat, id_promo, type_metier, title, description, s3_bucket, s3_key, url, content_type, size_bytes, created_by)
    VALUES ($1, $2, $3, $4::resource_type_metier, $5, $6, $7, $8, NULL, $9, $10, $11)
    "#,
  )
  .bind(resource_id)
  .bind(code)
  .bind(promo_id)
  .bind(type_metier)
  .bind(title)
  .bind(payload.description.map(|value| value.trim().to_string()))
  .bind(s3_config.bucket)
  .bind(object_key)
  .bind(payload.content_type.map(|value| value.trim().to_string()))
  .bind(content_size)
  .bind(created_by)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to create subject resource"))?;

  Ok(MutationAck {
    message: "subject resource created",
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

pub async fn list_students_for_promo_management(
  db: &PgPool,
  promo_id: Uuid,
) -> Result<Vec<PromoStudentManagementItem>, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;

  sqlx::query_as::<_, PromoStudentManagementItem>(
    r#"
    SELECT
      e.id,
      e.nom,
      e.prenom,
      e.email,
      EXISTS (
        SELECT 1
        FROM etu_promo ep
        WHERE ep.id_etu = e.id AND ep.id_promo = $1
      ) AS is_in_promo,
      EXISTS (
        SELECT 1
        FROM delegue_promo dp
        WHERE dp.id_etu = e.id AND dp.id_promo = $1
      ) AS is_delegue
    FROM etudiant e
    ORDER BY e.nom, e.prenom, e.email
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list students"))
}

pub async fn add_student_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  etu_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;

  let student_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM etudiant
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate student"))?
    > 0;

  if !student_exists {
    return Err(ApiError::bad_request("student not found"));
  }

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

pub async fn remove_student_from_promo(
  db: &PgPool,
  promo_id: Uuid,
  etu_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let deleted = sqlx::query(
    r#"
    DELETE FROM etu_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to remove student from promotion"))?
  .rows_affected();

  if deleted == 0 {
    return Err(ApiError::bad_request("student is not attached to this promotion"));
  }

  Ok(MutationAck {
    message: "student removed from promotion",
  })
}
