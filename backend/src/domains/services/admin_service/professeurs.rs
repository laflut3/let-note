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
