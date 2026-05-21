async fn list_matieres(State(db): State<PgPool>) -> impl IntoResponse {
  match admin_service::list_matieres(&db).await {
    Ok(matieres) => (StatusCode::OK, Json(matieres)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_matiere(
  State(db): State<PgPool>,
  Json(payload): Json<admin_service::CreateMatiereInput>,
) -> impl IntoResponse {
  match admin_service::create_matiere(&db, payload).await {
    Ok(ack) => (StatusCode::CREATED, Json(ack)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_matiere(
  State(db): State<PgPool>,
  Path(code_matiere): Path<String>,
  Json(payload): Json<admin_service::UpdateMatiereInput>,
) -> impl IntoResponse {
  match admin_service::update_matiere(&db, &code_matiere, payload).await {
    Ok(updated) => (StatusCode::OK, Json(updated)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_matiere_resources(
  State(db): State<PgPool>,
  Path(code_matiere): Path<String>,
) -> impl IntoResponse {
  match admin_service::list_matiere_resources(&db, &code_matiere).await {
    Ok(items) => (StatusCode::OK, Json(items)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_matiere_resource(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(code_matiere): Path<String>,
  mut multipart: Multipart,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  let mut id_promo: Option<Uuid> = None;
  let mut type_metier = String::new();
  let mut title = String::new();
  let mut description: Option<String> = None;
  let mut file_name = String::new();
  let mut content_type: Option<String> = None;
  let mut bytes: Vec<u8> = Vec::new();

  loop {
    let next = match multipart.next_field().await {
      Ok(field) => field,
      Err(_) => return ApiError::bad_request("invalid multipart payload").into_response(),
    };
    let Some(field) = next else { break };
    let name = field.name().unwrap_or("").to_string();
    match name.as_str() {
      "id_promo" => {
        let value = match field.text().await {
          Ok(v) => v,
          Err(_) => return ApiError::bad_request("invalid id_promo").into_response(),
        };
        let trimmed = value.trim();
        if !trimmed.is_empty() {
          id_promo = match Uuid::parse_str(trimmed) {
            Ok(v) => Some(v),
            Err(_) => return ApiError::bad_request("invalid id_promo").into_response(),
          };
        }
      }
      "type_metier" => match field.text().await {
        Ok(v) => type_metier = v,
        Err(_) => return ApiError::bad_request("invalid type_metier").into_response(),
      },
      "title" => match field.text().await {
        Ok(v) => title = v,
        Err(_) => return ApiError::bad_request("invalid title").into_response(),
      },
      "description" => match field.text().await {
        Ok(v) => description = Some(v),
        Err(_) => return ApiError::bad_request("invalid description").into_response(),
      },
      "file" => {
        file_name = field.file_name().unwrap_or("file.bin").to_string();
        content_type = field.content_type().map(str::to_string);
        bytes = match field.bytes().await {
          Ok(v) => v.to_vec(),
          Err(_) => return ApiError::bad_request("invalid file").into_response(),
        };
      }
      _ => {}
    }
  }

  let payload = admin_service::CreateMatiereResourceUploadInput {
    id_promo,
    type_metier,
    title,
    description,
    file_name,
    content_type,
    bytes,
  };

  match admin_service::create_matiere_resource_from_upload(
    &db,
    &code_matiere,
    payload,
    auth.user_id,
  )
  .await
  {
    Ok(ack) => (StatusCode::CREATED, Json(ack)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_matiere_resource(
  State(db): State<PgPool>,
  Path(resource_id): Path<Uuid>,
) -> impl IntoResponse {
  match admin_service::delete_matiere_resource(&db, resource_id).await {
    Ok(ack) => (StatusCode::OK, Json(ack)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_matiere(
  State(db): State<PgPool>,
  Path(code_matiere): Path<String>,
) -> impl IntoResponse {
  match admin_service::delete_matiere(&db, &code_matiere).await {
    Ok(deleted) => (StatusCode::OK, Json(deleted)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn link_matiere_all_promotions(
  State(db): State<PgPool>,
  Path(code_matiere): Path<String>,
  Json(payload): Json<admin_service::LinkMatiereAllPromotionsInput>,
) -> impl IntoResponse {
  match admin_service::link_matiere_to_all_promotions(&db, &code_matiere, payload).await {
    Ok(ack) => (StatusCode::OK, Json(ack)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn link_matiere_promotion(
  State(db): State<PgPool>,
  Path(code_matiere): Path<String>,
  Json(payload): Json<admin_service::LinkMatierePromotionInput>,
) -> impl IntoResponse {
  match admin_service::link_matiere_to_promotion(&db, &code_matiere, payload).await {
    Ok(ack) => (StatusCode::OK, Json(ack)).into_response(),
    Err(error) => error.into_response(),
  }
}
