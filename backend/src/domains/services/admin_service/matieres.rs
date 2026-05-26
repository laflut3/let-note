pub async fn list_matieres(db: &PgPool) -> Result<Vec<AdminMatiereSummary>, ApiError> {
  sqlx::query_as::<_, AdminMatiereSummary>(
    r#"
    SELECT
      m.code_matiere,
      m.nom_matiere,
      COUNT(DISTINCT mp.id_promo)::BIGINT AS promotion_count,
      COALESCE(
        ARRAY_AGG(DISTINCT mp.id_promo) FILTER (WHERE mp.id_promo IS NOT NULL),
        ARRAY[]::uuid[]
      ) AS linked_promo_ids,
      COALESCE(
        ARRAY_AGG(
          DISTINCT CASE
            WHEN p.id IS NULL THEN NULL
            WHEN u.id IS NULL THEN FORMAT('%s (%s-%s)', p.nom, p.annee_arrivee, p.annee_depart)
            ELSE FORMAT(
              '%s (%s-%s) - %s semestre %s',
              p.nom,
              p.annee_arrivee,
              p.annee_depart,
              u.nom_ue,
              u.semestre
            )
          END
        ) FILTER (WHERE p.id IS NOT NULL),
        ARRAY[]::text[]
      ) AS linked_promotions
    FROM matiere m
    LEFT JOIN mat_promo mp ON mp.id_mat = m.code_matiere
    LEFT JOIN promotion p ON p.id = mp.id_promo
    LEFT JOIN matiere_ue mu ON mu.id_promo = mp.id_promo AND mu.id_matiere = m.code_matiere
    LEFT JOIN ue u ON u.id = mu.id_ue
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
    ON CONFLICT (code_matiere)
    DO UPDATE SET nom_matiere = EXCLUDED.nom_matiere
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

pub async fn create_matiere_resource_from_upload(
  db: &PgPool,
  code_matiere: &str,
  payload: CreateMatiereResourceUploadInput,
  created_by: Uuid,
) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  if code.is_empty() || payload.type_metier.trim().is_empty() || payload.title.trim().is_empty() {
    return Err(ApiError::bad_request(
      "id_mat, type_metier and title are required",
    ));
  }
  if payload.bytes.is_empty() {
    return Err(ApiError::bad_request("file is required"));
  }

  let content_type = normalize_resource_content_type(payload.content_type.as_deref())?;

  let s3_config =
    s3::read_s3_config().map_err(|_| ApiError::internal("unable to read S3 config"))?;
  let resource_id = Uuid::new_v4();
  let object_key = format!(
    "matieres/{}/{}/{}_{}",
    code,
    payload.type_metier.trim().to_lowercase(),
    resource_id,
    sanitize_file_name(&payload.file_name)
  );

  let content_size = i64::try_from(payload.bytes.len()).unwrap_or(i64::MAX);
  s3::upload_bytes(&object_key, payload.bytes, content_type.as_deref())
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
  .bind(payload.id_promo)
  .bind(payload.type_metier.trim().to_lowercase())
  .bind(payload.title.trim())
  .bind(payload.description.map(|v| v.trim().to_string()))
  .bind(s3_config.bucket)
  .bind(object_key)
  .bind(content_type)
  .bind(content_size)
  .bind(created_by)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to create subject resource"))?;

  Ok(MutationAck {
    message: "subject resource created",
  })
}

fn normalize_resource_content_type(content_type: Option<&str>) -> Result<Option<String>, ApiError> {
  let Some(raw_content_type) = content_type else {
    return Ok(None);
  };

  let media_type = raw_content_type
    .split(';')
    .next()
    .unwrap_or("")
    .trim()
    .to_ascii_lowercase();

  if media_type.is_empty() {
    return Ok(None);
  }

  if is_active_resource_content_type(&media_type) {
    return Err(ApiError::bad_request(
      "file content type is not allowed for course resources",
    ));
  }

  Ok(Some(media_type))
}

fn is_active_resource_content_type(media_type: &str) -> bool {
  matches!(
    media_type,
    "text/html"
      | "application/xhtml+xml"
      | "image/svg+xml"
      | "application/xml"
      | "text/xml"
      | "application/javascript"
      | "application/x-javascript"
      | "text/javascript"
      | "text/ecmascript"
      | "application/ecmascript"
  ) || media_type.ends_with("+xml")
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

  let provided_nom = payload
    .nom_matiere
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(str::to_string);

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
    DO UPDATE SET nom_matiere = COALESCE($4, matiere.nom_matiere)
    "#,
  )
  .bind(&code)
  .bind(provided_nom.as_deref().unwrap_or(&code))
  .bind(annee)
  .bind(provided_nom.as_deref())
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to upsert subject"))?;

  for promo_id in promo_ids {
    let already_linked_to_other_ue = sqlx::query_scalar::<_, bool>(
      r#"
      SELECT EXISTS (
        SELECT 1
        FROM matiere_ue
        WHERE id_promo = $1
          AND id_matiere = $2
          AND id_ue <> $3
      )
      "#,
    )
    .bind(promo_id)
    .bind(&code)
    .bind(payload.ue_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(map_schema_error("unable to validate existing subject links"))?;
    if already_linked_to_other_ue {
      return Err(ApiError::conflict(
        "subject is already linked to another UE for this promotion",
      ));
    }

    sqlx::query(
      r#"
      INSERT INTO promo_ue (id_promo, id_ue)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      "#,
    )
    .bind(promo_id)
    .bind(payload.ue_id)
    .execute(&mut *tx)
    .await
    .map_err(map_schema_error("unable to link UE to promotion"))?;

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
      INSERT INTO matiere_ue (id_promo, id_ue, id_matiere, coef_ue)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_promo, id_matiere)
      DO UPDATE SET id_ue = EXCLUDED.id_ue, coef_ue = EXCLUDED.coef_ue
      "#,
    )
    .bind(promo_id)
    .bind(payload.ue_id)
    .bind(&code)
    .bind(payload.coef_ue.unwrap_or(1.0))
    .execute(&mut *tx)
    .await
    .map_err(map_schema_error("unable to link subject to UE"))?;

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

  let already_linked_to_other_ue = sqlx::query_scalar::<_, bool>(
    r#"
    SELECT EXISTS (
      SELECT 1
      FROM matiere_ue
      WHERE id_promo = $1
        AND id_matiere = $2
        AND id_ue <> $3
    )
    "#,
  )
  .bind(payload.promo_id)
  .bind(&code)
  .bind(payload.ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate existing subject links"))?;
  if already_linked_to_other_ue {
    return Err(ApiError::conflict(
      "subject is already linked to another UE for this promotion",
    ));
  }

  let provided_nom = payload
    .nom_matiere
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .map(str::to_string);
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
    DO UPDATE SET nom_matiere = COALESCE($4, matiere.nom_matiere)
    "#,
  )
  .bind(&code)
  .bind(provided_nom.as_deref().unwrap_or(&code))
  .bind(annee)
  .bind(provided_nom.as_deref())
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to upsert subject"))?;

  sqlx::query(
    r#"
    INSERT INTO promo_ue (id_promo, id_ue)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(payload.promo_id)
  .bind(payload.ue_id)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link UE to promotion"))?;

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
    INSERT INTO matiere_ue (id_promo, id_ue, id_matiere, coef_ue)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id_promo, id_matiere)
    DO UPDATE SET id_ue = EXCLUDED.id_ue, coef_ue = EXCLUDED.coef_ue
    "#,
  )
  .bind(payload.promo_id)
  .bind(payload.ue_id)
  .bind(&code)
  .bind(payload.coef_ue.unwrap_or(1.0))
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to link subject to UE"))?;

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

pub async fn unlink_matiere_from_promotion(
  db: &PgPool,
  code_matiere: &str,
  promo_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let code = code_matiere.trim().to_uppercase();
  if code.is_empty() {
    return Err(ApiError::bad_request("code_matiere is required"));
  }

  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to unlink subject from promotion"))?;

  let removed = sqlx::query(
    r#"
    DELETE FROM matiere_ue
    WHERE id_promo = $1 AND id_matiere = $2
    "#,
  )
  .bind(promo_id)
  .bind(&code)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to unlink subject from UE"))?;

  if removed.rows_affected() == 0 {
    return Err(ApiError::bad_request(
      "subject is not linked to this promotion",
    ));
  }

  sqlx::query(
    r#"
    DELETE FROM referent_matiere_promo
    WHERE id_promo = $1 AND id_mat = $2
    "#,
  )
  .bind(promo_id)
  .bind(&code)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to clear subject referent"))?;

  sqlx::query(
    r#"
    DELETE FROM mat_promo
    WHERE id_promo = $1 AND id_mat = $2
    "#,
  )
  .bind(promo_id)
  .bind(&code)
  .execute(&mut *tx)
  .await
  .map_err(map_schema_error("unable to unlink subject from promotion"))?;

  tx.commit()
    .await
    .map_err(|_| ApiError::internal("unable to finalize subject unlink"))?;

  Ok(MutationAck {
    message: "subject unlinked from promotion",
  })
}
