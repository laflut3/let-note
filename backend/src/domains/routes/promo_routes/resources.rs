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
