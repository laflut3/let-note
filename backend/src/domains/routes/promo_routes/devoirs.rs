async fn list_devoirs_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_devoirs_for_promo(&db, &auth, promo_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_devoir_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateDevoirInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::create_devoir_for_promo(&db, &auth, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_devoir_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, devoir_id)): Path<(Uuid, Uuid)>,
  Json(payload): Json<promo_service::UpdateDevoirInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::update_devoir_for_promo(&db, &auth, promo_id, devoir_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_devoir_for_promo(
  State(db): State<PgPool>,
  Path((promo_id, devoir_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::delete_devoir_for_promo(&db, promo_id, devoir_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}
