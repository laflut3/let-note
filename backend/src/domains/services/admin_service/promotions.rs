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

  let is_in_promo = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM etu_promo
    WHERE id_promo = $1 AND id_etu = $2
    "#,
  )
  .bind(promo_id)
  .bind(etu_id)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_schema_error("unable to validate delegate scope"))?
    > 0;

  if !is_in_promo {
    return Err(ApiError::bad_request(
      "student must already belong to the promotion before role change",
    ));
  }

  let is_already_delegue = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM delegue_promo
    WHERE id_promo = $1 AND id_etu = $2
    "#,
  )
  .bind(promo_id)
  .bind(etu_id)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_schema_error("unable to validate delegate scope"))?
    > 0;

  if !is_already_delegue {
    let delegue_count = sqlx::query_scalar::<_, i64>(
      r#"
      SELECT COUNT(*)
      FROM delegue_promo
      WHERE id_promo = $1
      "#,
    )
    .bind(promo_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(map_schema_error("unable to validate delegate scope"))?;

    if delegue_count >= 2 {
      return Err(ApiError::bad_request(
        "a promotion can have at most 2 delegates",
      ));
    }
  }

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
    SELECT
      e.id,
      e.nom,
      e.prenom,
      e.email,
      EXISTS (
        SELECT 1
        FROM delegue_promo dp
        WHERE dp.id_promo = ep.id_promo AND dp.id_etu = ep.id_etu
      ) AS is_delegue
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
  let already_in_promo = sqlx::query_scalar::<_, i64>(
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
  .map_err(map_schema_error("unable to add student to promotion"))?
    > 0;

  if already_in_promo {
    return Err(ApiError::bad_request(
      "student already belongs to the promotion",
    ));
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

pub async fn remove_student_from_promotion(
  db: &PgPool,
  promo_id: Uuid,
  etu_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let mut tx = db
    .begin()
    .await
    .map_err(|_| ApiError::internal("unable to remove student from promotion"))?;

  let is_in_promo = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM etu_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_schema_error("unable to remove student from promotion"))?
    > 0;

  if !is_in_promo {
    return Err(ApiError::bad_request("student is not in this promotion"));
  }

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

  let is_delegue = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM delegue_promo
    WHERE id_etu = $1 AND id_promo = $2
    "#,
  )
  .bind(etu_id)
  .bind(promo_id)
  .fetch_one(&mut *tx)
  .await
  .map_err(map_schema_error("unable to update delegate scope"))?
    > 0;

  if !is_delegue {
    return Err(ApiError::bad_request(
      "student is not delegate in this promotion",
    ));
  }

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
