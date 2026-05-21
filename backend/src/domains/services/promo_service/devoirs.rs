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
