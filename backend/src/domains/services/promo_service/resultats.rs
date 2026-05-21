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

pub async fn delete_resultat(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
  resultat_id: Uuid,
) -> Result<MutationAck, ApiError> {
  let row = sqlx::query_as::<_, (Uuid, Uuid)>(
    r#"
    SELECT id_etu, id_promo
    FROM note_resultat
    WHERE id = $1
    "#,
  )
  .bind(resultat_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to delete result"))?
  .ok_or_else(|| ApiError::bad_request("result not found"))?;

  if row.1 != promo_id {
    return Err(ApiError::bad_request(
      "result does not belong to this promotion",
    ));
  }

  let can_manage = can_manage_promo(db, auth, promo_id).await?;
  if !can_manage && row.0 != auth.user_id {
    return Err(ApiError::forbidden(
      "you can only delete results for your own account",
    ));
  }

  sqlx::query("DELETE FROM note_resultat WHERE id = $1")
    .bind(resultat_id)
    .execute(db)
    .await
    .map_err(map_schema_error("unable to delete result"))?;

  Ok(MutationAck {
    message: "result deleted",
  })
}
