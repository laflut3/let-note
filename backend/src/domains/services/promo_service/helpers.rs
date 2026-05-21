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
