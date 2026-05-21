pub async fn list_etudiants(db: &PgPool) -> Result<Vec<GetEtudiant>, ApiError> {
  sqlx::query_as::<_, GetEtudiant>(
    r#"
    SELECT id, numero_etudiant, nom, prenom, email, date_naissance
    FROM etudiant
    ORDER BY nom, prenom, email
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list students at this time"))
}

pub async fn list_promotions(db: &PgPool) -> Result<Vec<AdminPromotionSummary>, ApiError> {
  sqlx::query_as::<_, AdminPromotionSummary>(
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
      COUNT(DISTINCT ep.id_etu)::BIGINT AS etudiant_count,
      COUNT(DISTINCT dp.id_etu)::BIGINT AS delegue_count,
      COALESCE(
        ARRAY_AGG(DISTINCT CONCAT(e.prenom, ' ', e.nom))
        FILTER (WHERE e.id IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS delegues
    FROM promotion p
    LEFT JOIN etu_promo ep ON ep.id_promo = p.id
    LEFT JOIN delegue_promo dp ON dp.id_promo = p.id
    LEFT JOIN professeur pr ON pr.id = p.referent_prof_id
    LEFT JOIN etudiant e ON e.id = dp.id_etu
    GROUP BY p.id, pr.id
    ORDER BY p.annee_arrivee DESC, p.nom
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list promotions at this time"))
}

pub async fn list_students_details(db: &PgPool) -> Result<Vec<AdminStudentDetails>, ApiError> {
  let rows = sqlx::query_as::<_, AdminStudentDetailsRow>(
    r#"
    SELECT
      e.id,
      e.numero_etudiant,
      e.nom,
      e.prenom,
      e.email,
      e.date_naissance,
      COALESCE(ARRAY_AGG(DISTINCT r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY[]::TEXT[]) AS roles
    FROM etudiant e
    LEFT JOIN role_etu re ON re.id_etu = e.id
    LEFT JOIN role r ON r.id = re.id_role
    GROUP BY e.id
    ORDER BY e.nom, e.prenom, e.email
    "#,
  )
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list student details"))?;

  let mut out = Vec::with_capacity(rows.len());
  for row in rows {
    let promotions = sqlx::query_as::<_, AdminStudentPromoInfo>(
      r#"
      SELECT
        p.id AS promo_id,
        p.nom AS promo_nom,
        p.annee_arrivee,
        p.annee_depart,
        EXISTS (
          SELECT 1
          FROM delegue_promo dp
          WHERE dp.id_etu = $1 AND dp.id_promo = p.id
        ) AS is_delegue
      FROM etu_promo ep
      JOIN promotion p ON p.id = ep.id_promo
      WHERE ep.id_etu = $1
      ORDER BY p.annee_arrivee DESC, p.nom
      "#,
    )
    .bind(row.id)
    .fetch_all(db)
    .await
    .map_err(map_schema_error("unable to list student promotion details"))?;

    out.push(AdminStudentDetails {
      id: row.id,
      numero_etudiant: row.numero_etudiant,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      date_naissance: row.date_naissance,
      roles: row.roles,
      promotions,
    });
  }

  Ok(out)
}

pub async fn update_student(
  db: &PgPool,
  etu_id: Uuid,
  payload: UpdateStudentInput,
) -> Result<MutationAck, ApiError> {
  let current = sqlx::query_as::<_, (Option<String>, String, String, String, NaiveDate)>(
    r#"
    SELECT numero_etudiant, prenom, nom, email, date_naissance
    FROM etudiant
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .fetch_optional(db)
  .await
  .map_err(map_schema_error("unable to update student"))?
  .ok_or_else(|| ApiError::bad_request("student not found"))?;

  let numero_etudiant = payload
    .numero_etudiant
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .map(str::to_string)
    .or(current.0);
  if let Some(ref numero) = numero_etudiant
    && (numero.len() != 8 || !numero.chars().all(|char| char.is_ascii_digit()))
  {
    return Err(ApiError::bad_request(
      "student number must contain exactly 8 digits",
    ));
  }

  let prenom = payload
    .prenom
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .unwrap_or(&current.1)
    .to_string();
  let nom = payload
    .nom
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .unwrap_or(&current.2)
    .to_string();
  let email = payload
    .email
    .as_deref()
    .map(str::trim)
    .filter(|v| !v.is_empty())
    .unwrap_or(&current.3)
    .to_lowercase();
  let date_naissance = payload.date_naissance.unwrap_or(current.4);

  sqlx::query(
    r#"
    UPDATE etudiant
    SET numero_etudiant = $2, prenom = $3, nom = $4, email = $5, date_naissance = $6
    WHERE id = $1
    "#,
  )
  .bind(etu_id)
  .bind(numero_etudiant)
  .bind(prenom)
  .bind(nom)
  .bind(email)
  .bind(date_naissance)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to update student"))?;

  Ok(MutationAck {
    message: "student updated",
  })
}
