async fn create_ue_for_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateUeInput>,
) -> impl IntoResponse {
  match promo_service::create_ue_for_promo(&db, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_ues(State(db): State<PgPool>, headers: HeaderMap) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_ues(&db, &auth).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_ue(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Json(payload): Json<promo_service::CreateUeInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::create_ue(&db, &auth, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_ue(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(ue_id): Path<Uuid>,
  Json(payload): Json<promo_service::UpdateUeInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::update_ue(&db, &auth, ue_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_ue(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(ue_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::delete_ue(&db, &auth, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_ue_promotions(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(ue_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_ue_promotions(&db, &auth, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_ue_catalog_for_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  match promo_service::list_ue_catalog_for_promo(&db, promo_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_ue_for_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
  Json(payload): Json<promo_service::UpdateUeInput>,
) -> impl IntoResponse {
  match promo_service::update_ue_for_promo(&db, promo_id, ue_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_ue_for_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::delete_ue_for_promo(&db, promo_id, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn attach_ue_to_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::attach_ue_to_promo(&db, promo_id, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn detach_ue_from_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::detach_ue_from_promo(&db, promo_id, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn add_matiere_to_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateMatiereInput>,
) -> impl IntoResponse {
  match promo_service::add_matiere_to_promo(&db, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn add_professeur_to_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateProfesseurInput>,
) -> impl IntoResponse {
  match promo_service::add_professeur_to_promo(&db, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn set_referent_for_matiere(
  State(db): State<PgPool>,
  Path((promo_id, matiere_id, prof_id)): Path<(Uuid, String, Uuid)>,
) -> impl IntoResponse {
  match promo_service::set_referent_for_matiere(&db, promo_id, matiere_id, prof_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}
