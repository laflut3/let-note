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
