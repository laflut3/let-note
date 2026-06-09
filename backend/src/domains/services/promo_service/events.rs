pub async fn list_student_events_for_promo(
  db: &PgPool,
  promo_id: Uuid,
) -> Result<Vec<StudentEventConfig>, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;
  purge_expired_student_events(db).await?;

  sqlx::query_as::<_, StudentEventConfig>(
    r#"
    SELECT
      se.id,
      se.id_etu,
      e.nom AS student_nom,
      e.prenom AS student_prenom,
      se.event_type,
      se.title,
      se.event_month,
      se.event_day,
      se.updated_at
    FROM student_event se
    JOIN etudiant e ON e.id = se.id_etu
    JOIN etu_promo ep ON ep.id_etu = se.id_etu
    WHERE ep.id_promo = $1
    ORDER BY se.event_month, se.event_day, e.nom, e.prenom
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list student events"))
}

pub async fn upsert_student_event_for_promo(
  db: &PgPool,
  auth: &AuthContext,
  promo_id: Uuid,
  payload: UpsertStudentEventInput,
) -> Result<MutationAck, ApiError> {
  ensure_student_in_promo(db, payload.id_etu, promo_id).await?;
  validate_month_day(payload.event_month, payload.event_day)?;
  ensure_event_date_not_past(payload.event_month, payload.event_day)?;

  let title = payload
    .title
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or("Croissantage")
    .to_string();

  sqlx::query(
    r#"
    INSERT INTO student_event (
      id_etu, event_type, title, event_month, event_day, created_by, updated_by
    )
    VALUES ($1, 'croissantage', $2, $3, $4, $5, $5)
    ON CONFLICT (id_etu, event_type)
    DO UPDATE SET
      title = EXCLUDED.title,
      event_month = EXCLUDED.event_month,
      event_day = EXCLUDED.event_day,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    "#,
  )
  .bind(payload.id_etu)
  .bind(title)
  .bind(payload.event_month)
  .bind(payload.event_day)
  .bind(auth.user_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to save student event"))?;

  Ok(MutationAck {
    message: "student event saved",
  })
}

pub async fn delete_student_event_for_promo(
  db: &PgPool,
  promo_id: Uuid,
  event_id: Uuid,
) -> Result<MutationAck, ApiError> {
  ensure_promotion_exists(db, promo_id).await?;

  let deleted = sqlx::query(
    r#"
    DELETE FROM student_event se
    WHERE se.id = $1
      AND EXISTS (
        SELECT 1
        FROM etu_promo ep
        WHERE ep.id_etu = se.id_etu AND ep.id_promo = $2
      )
    "#,
  )
  .bind(event_id)
  .bind(promo_id)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to delete student event"))?
  .rows_affected();

  if deleted == 0 {
    return Err(ApiError::bad_request("student event not found"));
  }

  Ok(MutationAck {
    message: "student event deleted",
  })
}

async fn list_promotion_events_for_year(
  db: &PgPool,
  promo_id: Uuid,
) -> Result<Vec<PromotionEventPayload>, ApiError> {
  purge_expired_student_events(db).await?;

  let today = Utc::now().date_naive();
  let year = today.year();
  let year_end = NaiveDate::from_ymd_opt(year, 12, 31)
    .ok_or_else(|| ApiError::internal("unable to build event calendar"))?;

  let birthdays = sqlx::query_as::<_, (Uuid, String, String, NaiveDate)>(
    r#"
    SELECT e.id, e.nom, e.prenom, e.date_naissance
    FROM etu_promo ep
    JOIN etudiant e ON e.id = ep.id_etu
    WHERE ep.id_promo = $1
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list birthday events"))?;

  let custom_events = sqlx::query_as::<_, StudentEventConfig>(
    r#"
    SELECT
      se.id,
      se.id_etu,
      e.nom AS student_nom,
      e.prenom AS student_prenom,
      se.event_type,
      se.title,
      se.event_month,
      se.event_day,
      se.updated_at
    FROM student_event se
    JOIN etudiant e ON e.id = se.id_etu
    JOIN etu_promo ep ON ep.id_etu = se.id_etu
    WHERE ep.id_promo = $1
    "#,
  )
  .bind(promo_id)
  .fetch_all(db)
  .await
  .map_err(map_schema_error("unable to list promotion events"))?;

  let mut events = Vec::with_capacity(birthdays.len() + custom_events.len());

  for (id_etu, nom, prenom, date_naissance) in birthdays {
    let Some(occurrence_date) =
      NaiveDate::from_ymd_opt(year, date_naissance.month(), date_naissance.day())
    else {
      continue;
    };
    if occurrence_date < today || occurrence_date > year_end {
      continue;
    }

    events.push(PromotionEventPayload {
      id: None,
      id_etu,
      student_nom: nom,
      student_prenom: prenom,
      event_type: "birthday".to_string(),
      title: "Anniversaire".to_string(),
      event_month: occurrence_date.month() as i32,
      event_day: occurrence_date.day() as i32,
      occurrence_date,
      is_today: occurrence_date == today,
    });
  }

  for event in custom_events {
    let Some(occurrence_date) =
      NaiveDate::from_ymd_opt(year, event.event_month as u32, event.event_day as u32)
    else {
      continue;
    };
    if occurrence_date < today || occurrence_date > year_end {
      continue;
    }

    events.push(PromotionEventPayload {
      id: Some(event.id),
      id_etu: event.id_etu,
      student_nom: event.student_nom,
      student_prenom: event.student_prenom,
      event_type: event.event_type,
      title: event.title,
      event_month: occurrence_date.month() as i32,
      event_day: occurrence_date.day() as i32,
      occurrence_date,
      is_today: occurrence_date == today,
    });
  }

  events.sort_by(|left, right| {
    left
      .occurrence_date
      .cmp(&right.occurrence_date)
      .then_with(|| left.student_nom.cmp(&right.student_nom))
      .then_with(|| left.student_prenom.cmp(&right.student_prenom))
      .then_with(|| left.event_type.cmp(&right.event_type))
  });

  Ok(events)
}

async fn purge_expired_student_events(db: &PgPool) -> Result<(), ApiError> {
  let today = Utc::now().date_naive();

  sqlx::query(
    r#"
    DELETE FROM student_event
    WHERE event_month < $1
      OR (event_month = $1 AND event_day < $2)
    "#,
  )
  .bind(today.month() as i32)
  .bind(today.day() as i32)
  .execute(db)
  .await
  .map_err(map_schema_error("unable to purge expired student events"))?;

  Ok(())
}

async fn ensure_student_in_promo(db: &PgPool, etu_id: Uuid, promo_id: Uuid) -> Result<(), ApiError> {
  let exists = sqlx::query_scalar::<_, i64>(
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
  .map_err(map_schema_error("unable to validate student promotion"))?
    > 0;

  if !exists {
    return Err(ApiError::bad_request("student is not attached to this promotion"));
  }

  Ok(())
}

fn validate_month_day(month: i32, day: i32) -> Result<(), ApiError> {
  if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
    return Err(ApiError::bad_request("event date is invalid"));
  }

  if NaiveDate::from_ymd_opt(2024, month as u32, day as u32).is_none() {
    return Err(ApiError::bad_request("event date is invalid"));
  }

  Ok(())
}

fn ensure_event_date_not_past(month: i32, day: i32) -> Result<(), ApiError> {
  let today = Utc::now().date_naive();
  let Some(occurrence_date) = NaiveDate::from_ymd_opt(today.year(), month as u32, day as u32)
  else {
    return Err(ApiError::bad_request("event date is invalid"));
  };

  if occurrence_date < today {
    return Err(ApiError::bad_request("event date has already passed"));
  }

  Ok(())
}
