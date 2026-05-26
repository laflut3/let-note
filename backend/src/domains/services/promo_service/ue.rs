pub async fn list_ues_for_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<Vec<UePayload>, ApiError> {
  let _promotion = get_accessible_promotion(db, auth, promo_id).await?;

  sqlx::query_as::<_, UePayload>(
    r#"
    SELECT u.id, u.nom_ue, u.semestre
    FROM promo_ue pu
    JOIN ue u ON u.id = pu.id_ue
    WHERE pu.id_promo = $1
    ORDER BY semestre, id
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE"))
}

fn ensure_can_manage_ue_catalog(auth: &AuthContext) -> Result<(), ApiError> {
  if auth.roles.iter().any(|role| role == "admin") {
    return Ok(());
  }

  Err(ApiError::forbidden(
    "admin role required to manage UE catalog",
  ))
}

pub async fn list_ues(db: &PgPool, auth: &AuthContext) -> Result<Vec<UePayload>, ApiError> {
  ensure_can_manage_ue_catalog(auth)?;

  sqlx::query_as::<_, UePayload>(
    r#"
    SELECT id, nom_ue, semestre
    FROM ue
    ORDER BY semestre, nom_ue
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE catalog"))
}

pub async fn create_ue(
  db: &PgPool,
  auth: &AuthContext,
  payload: CreateUeInput,
) -> Result<UePayload, ApiError> {
  ensure_can_manage_ue_catalog(auth)?;

  let nom_ue = payload.nom_ue.trim().to_string();
  if nom_ue.is_empty() {
    return Err(ApiError::bad_request("nom_ue is required"));
  }
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  sqlx::query_as::<_, UePayload>(
    r#"
    INSERT INTO ue (nom_ue, semestre)
    VALUES ($1, $2)
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(nom_ue)
  .bind(payload.semestre)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to create UE"))
}

pub async fn create_ue_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  payload: CreateUeInput,
) -> Result<UePayload, ApiError> {
  let nom_ue = payload.nom_ue.trim().to_string();
  if nom_ue.is_empty() {
    return Err(ApiError::bad_request("nom_ue is required"));
  }
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  ensure_promotion_exists(db, promo_id).await?;

  let created = sqlx::query_as::<_, (Uuid, String, i32)>(
    r#"
    INSERT INTO ue (nom_ue, semestre)
    VALUES ($1, $2)
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(&nom_ue)
  .bind(payload.semestre)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to create UE"))?;

  sqlx::query(
    r#"
    INSERT INTO promo_ue (id_promo, id_ue)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(promo_id)
  .bind(created.0)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to attach UE to promotion"))?;

  Ok(UePayload {
    id: created.0,
    nom_ue: created.1,
    semestre: created.2,
  })
}

pub async fn update_ue(
  db: &PgPool,
  auth: &AuthContext,
  ue_id: Uuid,
  payload: UpdateUeInput,
) -> Result<UePayload, ApiError> {
  ensure_can_manage_ue_catalog(auth)?;

  let nom_ue = payload
    .nom_ue
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty());
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  sqlx::query_as::<_, UePayload>(
    r#"
    UPDATE ue
    SET nom_ue = COALESCE($2, nom_ue),
        semestre = $3
    WHERE id = $1
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(ue_id)
  .bind(nom_ue)
  .bind(payload.semestre)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update UE"))?
  .ok_or_else(|| ApiError::bad_request("UE not found"))
}

pub async fn delete_ue(
  db: &PgPool,
  auth: &AuthContext,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_can_manage_ue_catalog(auth)?;

  let used = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM matiere_ue
    WHERE id_ue = $1
    "#,
  )
  .bind(ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to delete UE"))?;

  if used > 0 {
    return Err(ApiError::bad_request(
      "remove subject links from this UE before deleting it",
    ));
  }

  let deleted = sqlx::query(
    r#"
    DELETE FROM ue
    WHERE id = $1
    "#,
  )
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to delete UE"))?
  .rows_affected();

  if deleted == 0 {
    return Err(ApiError::bad_request("UE not found"));
  }

  Ok(MutationAck {
    message: "UE deleted",
  })
}

pub async fn list_ue_promotions(
  db: &PgPool,
  auth: &AuthContext,
  ue_id: Uuid,
) -> Result<Vec<UePromotionLinkPayload>, ApiError> {
  ensure_can_manage_ue_catalog(auth)?;

  let ue_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM ue
    WHERE id = $1
    "#,
  )
  .bind(ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to list UE promotions"))?
    > 0;

  if !ue_exists {
    return Err(ApiError::bad_request("UE not found"));
  }

  if auth.roles.iter().any(|role| role == "admin") {
    return sqlx::query_as::<_, UePromotionLinkPayload>(
      r#"
      SELECT
        p.id,
        p.nom,
        p.annee_arrivee,
        p.annee_depart,
        EXISTS(
          SELECT 1
          FROM promo_ue pu
          WHERE pu.id_promo = p.id AND pu.id_ue = $1
        ) AS linked
      FROM promotion p
      ORDER BY p.annee_arrivee DESC, p.nom
      "#,
    )
    .bind(ue_id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list UE promotions"));
  }

  sqlx::query_as::<_, UePromotionLinkPayload>(
    r#"
    SELECT
      p.id,
      p.nom,
      p.annee_arrivee,
      p.annee_depart,
      EXISTS(
        SELECT 1
        FROM promo_ue pu
        WHERE pu.id_promo = p.id AND pu.id_ue = $2
      ) AS linked
    FROM promotion p
    JOIN delegue_promo dp ON dp.id_promo = p.id AND dp.id_etu = $1
    ORDER BY p.annee_arrivee DESC, p.nom
    "#,
  )
  .bind(auth.user_id)
  .bind(ue_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE promotions"))
}

pub async fn list_ue_catalog_for_promo(
  db: &PgPool,
  promo_id: Uuid,
) -> Result<Vec<UeCatalogItem>, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;

  sqlx::query_as::<_, UeCatalogItem>(
    r#"
    SELECT
      u.id,
      u.nom_ue,
      u.semestre,
      EXISTS(
        SELECT 1
        FROM promo_ue pu
        WHERE pu.id_ue = u.id AND pu.id_promo = $1
      ) AS linked_to_promo
    FROM ue u
    ORDER BY u.semestre, u.id
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list UE catalog"))
}

pub async fn attach_ue_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;

  let ue_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM ue
    WHERE id = $1
    "#,
  )
  .bind(ue_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to attach UE"))?
    > 0;

  if !ue_exists {
    return Err(ApiError::bad_request("UE not found"));
  }

  sqlx::query(
    r#"
    INSERT INTO promo_ue (id_promo, id_ue)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(promo_id)
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to attach UE"))?;

  Ok(MutationAck {
    message: "UE attached to promotion",
  })
}

pub async fn update_ue_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
  payload: UpdateUeInput,
) -> Result<UePayload, ApiError> {
  let nom_ue = payload
    .nom_ue
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty());
  if !(1..=12).contains(&payload.semestre) {
    return Err(ApiError::bad_request("invalid semestre"));
  }

  ensure_promotion_exists(db, promo_id).await?;
  ensure_ue_attached_to_promo(db, promo_id, ue_id).await?;

  sqlx::query_as::<_, UePayload>(
    r#"
    UPDATE ue
    SET nom_ue = COALESCE($2, nom_ue),
        semestre = $3
    WHERE id = $1
    RETURNING id, nom_ue, semestre
    "#,
  )
  .bind(ue_id)
  .bind(nom_ue)
  .bind(payload.semestre)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update UE"))?
  .ok_or_else(|| ApiError::bad_request("UE not found"))
}

pub async fn delete_ue_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;
  ensure_ue_attached_to_promo(db, promo_id, ue_id).await?;

  let used_in_target = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM matiere_ue
    WHERE id_ue = $1 AND id_promo = $2
    "#,
  )
  .bind(ue_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to delete UE"))?;

  if used_in_target > 0 {
    return Err(ApiError::bad_request(
      "remove subject links from this UE before deleting it",
    ));
  }

  sqlx::query(
    r#"
    DELETE FROM promo_ue
    WHERE id_promo = $1 AND id_ue = $2
    "#,
  )
  .bind(promo_id)
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to detach UE"))?;

  Ok(MutationAck {
    message: "UE detached from promotion",
  })
}

pub async fn detach_ue_from_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;
  ensure_ue_attached_to_promo(db, promo_id, ue_id).await?;

  let used_in_target = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM matiere_ue
    WHERE id_ue = $1 AND id_promo = $2
    "#,
  )
  .bind(ue_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to detach UE"))?;

  if used_in_target > 0 {
    return Err(ApiError::bad_request(
      "remove subject links from this UE before detaching it",
    ));
  }

  sqlx::query(
    r#"
    DELETE FROM promo_ue
    WHERE id_promo = $1 AND id_ue = $2
    "#,
  )
  .bind(promo_id)
  .bind(ue_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to detach UE"))?;

  Ok(MutationAck {
    message: "UE detached from promotion",
  })
}

async fn ensure_ue_attached_to_promo(
  db: &PgPool,
  promo_id: Uuid,
  ue_id: Uuid,
) -> Result<(), ApiError> {
  let attached = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM promo_ue pu
    WHERE pu.id_ue = $1 AND pu.id_promo = $2
    "#,
  )
  .bind(ue_id)
  .bind(promo_id)
  .fetch_one(db)
  .await
  .map_err(map_schema_error("unable to validate UE"))?
    > 0;

  if !attached {
    return Err(ApiError::bad_request(
      "UE is not attached to this promotion",
    ));
  }
  Ok(())
}
