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

async fn list_professeurs(State(db): State<PgPool>) -> impl IntoResponse {
  match admin_service::list_professeurs(&db).await {
    Ok(users) => (StatusCode::OK, Json(users)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_professeur(
  State(db): State<PgPool>,
  Json(payload): Json<CreateAdminProfesseurPayload>,
) -> impl IntoResponse {
  let dto = crate::domains::entities::professeur::CreateProfesseur {
    prenom: payload.prenom,
    nom: payload.nom,
    email: payload.email,
    date_naissance: payload.date_naissance,
    mot_de_passe: String::new(),
  };

  match admin_service::create_professeur(&db, dto).await {
    Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
    Err(error) => error.into_response(),
  }
}
async fn update_professeur(
  State(db): State<PgPool>,
  Path(prof_id): Path<Uuid>,
  Json(payload): Json<admin_service::UpdateProfesseurInput>,
) -> impl IntoResponse {
  match admin_service::update_professeur(&db, prof_id, payload).await {
    Ok(updated) => (StatusCode::OK, Json(updated)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_professeur(
  State(db): State<PgPool>,
  Path(prof_id): Path<Uuid>,
) -> impl IntoResponse {
  match admin_service::delete_professeur(&db, prof_id).await {
    Ok(deleted) => (StatusCode::OK, Json(deleted)).into_response(),
    Err(error) => error.into_response(),
  }
}
