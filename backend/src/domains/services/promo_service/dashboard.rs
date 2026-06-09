pub async fn list_accessible_promotions(
  db: &PgPool,
  auth: &AuthContext,
) -> Result<Vec<PromotionScope>, ApiError> {
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
      ORDER BY p.annee_arrivee DESC, p.nom
      "#,
    )
    .bind(auth.user_id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list promotions"));
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
    WHERE ep.id_etu = $1
    ORDER BY p.annee_arrivee DESC, p.nom
    "#,
  )
  .bind(auth.user_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list promotions"))
}

pub async fn get_promotion_dashboard(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
) -> Result<DashboardPayload, ApiError> {
  let promotion = get_accessible_promotion(db, auth, promo_id).await?;

  let etudiants = sqlx::query_as::<_, PromoStudent>(
    r#"
    SELECT e.id, e.nom, e.prenom, e.email
    FROM etu_promo ep
    JOIN etudiant e ON e.id = ep.id_etu
    WHERE ep.id_promo = $1
    ORDER BY e.nom, e.prenom
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load students"))?;

  let matieres_rows = sqlx::query_as::<_, MatiereDashboardRow>(
    r#"
    SELECT
      m.code_matiere,
      m.nom_matiere,
      rmp.id_prof AS referent_prof_id,
      p.nom AS referent_prof_nom,
      p.prenom AS referent_prof_prenom,
      p.email AS referent_prof_email
    FROM mat_promo mp
    JOIN matiere m ON m.code_matiere = mp.id_mat
    LEFT JOIN referent_matiere_promo rmp ON rmp.id_mat = mp.id_mat AND rmp.id_promo = mp.id_promo
    LEFT JOIN professeur p ON p.id = rmp.id_prof
    WHERE mp.id_promo = $1
    ORDER BY m.nom_matiere, m.code_matiere
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load subjects"))?;

  let mut matieres = matieres_rows
    .into_iter()
    .map(|row| MatiereDashboardItem {
      code_matiere: row.code_matiere,
      nom_matiere: row.nom_matiere,
      referent_prof_id: row.referent_prof_id,
      referent_prof_nom: row.referent_prof_nom,
      referent_prof_prenom: row.referent_prof_prenom,
      referent_prof_email: row.referent_prof_email,
      resources: Vec::new(),
    })
    .collect::<Vec<_>>();

  let resources = sqlx::query_as::<_, MatiereResourceDashboardItem>(
    r#"
    SELECT id, id_mat, id_promo, type_metier::text AS type_metier, title, description,
           s3_bucket, s3_key, url, content_type, size_bytes, created_at
    FROM matiere_resource
    WHERE id_promo = $1 OR id_promo IS NULL
    ORDER BY created_at DESC
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load subject resources"))?;

  let mut resources_by_mat: HashMap<String, Vec<MatiereResourceDashboardItem>> = HashMap::new();
  for resource in resources {
    resources_by_mat
      .entry(resource.id_mat.clone())
      .or_default()
      .push(resource);
  }

  for matiere in &mut matieres {
    matiere.resources = resources_by_mat
      .remove(&matiere.code_matiere)
      .unwrap_or_default();
  }

  let professeurs = sqlx::query_as::<_, ProfesseurDashboardItem>(
    r#"
    SELECT p.id, p.nom, p.prenom, p.email
    FROM prof_promo pp
    JOIN professeur p ON p.id = pp.id_prof
    WHERE pp.id_promo = $1
    ORDER BY p.nom, p.prenom, p.email
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to load professors"))?;

  let devoirs = list_devoirs_for_promo(db, auth, promo_id).await?;

  Ok(DashboardPayload {
    promotion,
    etudiants,
    matieres,
    professeurs,
    devoirs,
  })
}

pub async fn get_resource_file_for_user(
  db: &PgPool,
  auth: &AuthContext,
  resource_id: Uuid,
) -> Result<(Vec<u8>, String, String), ApiError> {
  let resource = sqlx::query_as::<_, ResourceFileRow>(
    r#"
    SELECT id_promo, s3_bucket, s3_key, content_type, title
    FROM matiere_resource
    WHERE id = $1
    "#,
  )
  .bind(resource_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to load resource"))?
  .ok_or_else(|| ApiError::bad_request("resource not found"))?;

  let allowed = if auth.roles.iter().any(|r| r == "admin") {
    true
  } else if let Some(promo_id) = resource.id_promo {
    let count = sqlx::query_scalar::<_, i64>(
      r#"
      SELECT COUNT(*)
      FROM etu_promo
      WHERE id_etu = $1 AND id_promo = $2
      "#,
    )
    .bind(auth.user_id)
    .bind(promo_id)
    .fetch_one(db)
    .await
    .map_err(map_schema_error("unable to validate permissions"))?;
    count > 0
  } else {
    false
  };

  if !allowed {
    return Err(ApiError::forbidden("you cannot access this resource"));
  }

  let (bytes, downloaded_ct) = s3::download_bytes(&resource.s3_bucket, &resource.s3_key)
    .await
    .map_err(|_| ApiError::internal("unable to read resource file"))?;
  let content_type = resource
    .content_type
    .or(downloaded_ct)
    .unwrap_or_else(|| "application/octet-stream".to_string());
  Ok((bytes, content_type, resource.title))
}
