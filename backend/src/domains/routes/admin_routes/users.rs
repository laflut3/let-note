async fn admin_status(State(_db): State<PgPool>) -> impl IntoResponse {
  (
    StatusCode::OK,
    Json(AdminStatus {
      message: "admin access granted",
    }),
  )
    .into_response()
}

async fn list_users(State(db): State<PgPool>) -> impl IntoResponse {
  match admin_service::list_etudiants(&db).await {
    Ok(users) => (StatusCode::OK, Json(users)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_users_details(State(db): State<PgPool>) -> impl IntoResponse {
  match admin_service::list_students_details(&db).await {
    Ok(users) => (StatusCode::OK, Json(users)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_user(
  State(db): State<PgPool>,
  Path(etu_id): Path<Uuid>,
  Json(payload): Json<admin_service::UpdateStudentInput>,
) -> impl IntoResponse {
  match admin_service::update_student(&db, etu_id, payload).await {
    Ok(updated) => (StatusCode::OK, Json(updated)).into_response(),
    Err(error) => error.into_response(),
  }
}
