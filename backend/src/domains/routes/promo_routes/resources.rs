async fn get_resource_file(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(resource_id): Path<Uuid>,
  Query(query): Query<ResourceFileQuery>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::get_resource_file_for_user(&db, &auth, resource_id).await {
    Ok((bytes, content_type, title)) => {
      let disposition = if query.download.unwrap_or(false) {
        format!("attachment; filename=\"{}\"", title.replace('"', "_"))
      } else {
        format!("inline; filename=\"{}\"", title.replace('"', "_"))
      };
      (
        [
          (header::CONTENT_TYPE, content_type),
          (header::CONTENT_DISPOSITION, disposition),
          (header::CACHE_CONTROL, "no-store".to_string()),
        ],
        Body::from(bytes),
      )
        .into_response()
    }
    Err(error) => error.into_response(),
  }
}

async fn get_promotion_image(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::get_promotion_image_for_user(&db, &auth, promo_id).await {
    Ok((bytes, content_type)) => (
      [
        (header::CONTENT_TYPE, content_type),
        (header::CACHE_CONTROL, "no-store".to_string()),
      ],
      Body::from(bytes),
    )
      .into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_matiere_resource_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, code_matiere)): Path<(Uuid, String)>,
  multipart: Multipart,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  let payload = match parse_promo_matiere_resource_multipart(multipart).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::create_matiere_resource_for_promo(
    &db,
    promo_id,
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

async fn parse_promo_matiere_resource_multipart(
  mut multipart: Multipart,
) -> Result<promo_service::CreatePromoMatiereResourceUploadInput, ApiError> {
  let mut type_metier = String::new();
  let mut title = String::new();
  let mut description: Option<String> = None;
  let mut file_name = String::new();
  let mut content_type: Option<String> = None;
  let mut bytes: Vec<u8> = Vec::new();

  loop {
    let next = multipart
      .next_field()
      .await
      .map_err(|_| ApiError::bad_request("invalid multipart payload"))?;
    let Some(field) = next else { break };
    let name = field.name().unwrap_or("").to_string();

    match name.as_str() {
      "type_metier" => {
        type_metier = field
          .text()
          .await
          .map_err(|_| ApiError::bad_request("invalid type_metier"))?;
      }
      "title" => {
        title = field
          .text()
          .await
          .map_err(|_| ApiError::bad_request("invalid title"))?;
      }
      "description" => {
        description = Some(
          field
            .text()
            .await
            .map_err(|_| ApiError::bad_request("invalid description"))?,
        );
      }
      "file" => {
        file_name = field.file_name().unwrap_or("file.bin").to_string();
        content_type = field.content_type().map(str::to_string);
        bytes = field
          .bytes()
          .await
          .map_err(|_| ApiError::bad_request("invalid file"))?
          .to_vec();
      }
      _ => {}
    }
  }

  Ok(promo_service::CreatePromoMatiereResourceUploadInput {
    type_metier,
    title,
    description,
    file_name,
    content_type,
    bytes,
  })
}
