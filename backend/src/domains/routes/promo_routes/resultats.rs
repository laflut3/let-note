async fn create_resultat_for_matiere(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, matiere_id)): Path<(Uuid, String)>,
  Json(payload): Json<promo_service::CreateResultatInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::create_resultat_for_matiere(&db, &auth, promo_id, matiere_id, payload).await
  {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_resultat(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, resultat_id)): Path<(Uuid, Uuid)>,
  Json(payload): Json<promo_service::UpdateResultatInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::update_resultat(&db, &auth, promo_id, resultat_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_resultat(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, resultat_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::delete_resultat(&db, &auth, promo_id, resultat_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}
