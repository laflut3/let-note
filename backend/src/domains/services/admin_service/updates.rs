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
