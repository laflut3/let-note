async fn list_promotions(State(db): State<PgPool>) -> impl IntoResponse {
  match admin_service::list_promotions(&db).await {
    Ok(promotions) => (StatusCode::OK, Json(promotions)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_promotion(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<admin_service::UpdatePromotionInput>,
) -> impl IntoResponse {
  match admin_service::update_promotion(&db, promo_id, payload).await {
    Ok(updated) => (StatusCode::OK, Json(updated)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_promotion(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  match admin_service::delete_promotion(&db, promo_id).await {
    Ok(deleted) => (StatusCode::OK, Json(deleted)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_promotion(
  State(db): State<PgPool>,
  Json(payload): Json<CreatePromotion>,
) -> impl IntoResponse {
  match admin_service::create_promotion(&db, payload).await {
    Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
    Err(error) => error.into_response(),
  }
}
async fn assign_delegue(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, etu_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match admin_service::assign_delegue(&db, promo_id, etu_id, auth.user_id).await {
    Ok(result) => (StatusCode::OK, Json(result)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_promotion_students(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  match admin_service::list_promotion_students(&db, promo_id).await {
    Ok(users) => (StatusCode::OK, Json(users)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn add_student_to_promotion(
  State(db): State<PgPool>,
  Path((promo_id, etu_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match admin_service::add_student_to_promotion(&db, promo_id, etu_id).await {
    Ok(result) => (StatusCode::OK, Json(result)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn remove_student_from_promotion(
  State(db): State<PgPool>,
  Path((promo_id, etu_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match admin_service::remove_student_from_promotion(&db, promo_id, etu_id).await {
    Ok(result) => (StatusCode::OK, Json(result)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn remove_delegue(
  State(db): State<PgPool>,
  Path((promo_id, etu_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match admin_service::remove_delegue(&db, promo_id, etu_id).await {
    Ok(()) => StatusCode::NO_CONTENT.into_response(),
    Err(error) => error.into_response(),
  }
}
