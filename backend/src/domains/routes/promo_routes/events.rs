async fn list_student_events_for_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  match promo_service::list_student_events_for_promo(&db, promo_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn upsert_student_event_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::UpsertStudentEventInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::upsert_student_event_for_promo(&db, &auth, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_student_event_for_promo(
  State(db): State<PgPool>,
  Path((promo_id, event_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::delete_student_event_for_promo(&db, promo_id, event_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}
