use axum::{
  Json, Router,
  body::Body,
  extract::{Multipart, State},
  http::{HeaderMap, StatusCode, header},
  response::IntoResponse,
  routing::{get, post, put},
};
use sqlx::PgPool;

use crate::domains::{entities::etudiant::CreateEtudiant, middleware, services::etudiant_service};

pub fn etudiant_routes() -> Router<PgPool> {
  Router::new()
    .route("/etudiant", post(create_etudiant))
    .route("/etudiant/me", get(get_my_profile))
    .route("/etudiant/me", put(update_my_profile))
    .route(
      "/etudiant/me/photo",
      get(get_my_photo).post(upload_my_photo),
    )
}

async fn create_etudiant(
  State(db): State<PgPool>,
  Json(etudiant): Json<CreateEtudiant>,
) -> impl IntoResponse {
  match etudiant_service::create_etudiant(&db, etudiant).await {
    Ok(created_etudiant) => (StatusCode::CREATED, Json(created_etudiant)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn get_my_profile(State(db): State<PgPool>, headers: HeaderMap) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match etudiant_service::get_my_profile_by_id(&db, auth.user_id).await {
    Ok(profile) => (StatusCode::OK, Json(profile)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_my_profile(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Json(payload): Json<etudiant_service::UpdateMyProfileInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match etudiant_service::update_my_profile_by_id(&db, auth.user_id, payload).await {
    Ok(profile) => (StatusCode::OK, Json(profile)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn upload_my_photo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  mut multipart: Multipart,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  let mut file_name = String::from("photo.bin");
  let mut content_type: Option<String> = None;
  let mut bytes: Vec<u8> = Vec::new();

  loop {
    let next = match multipart.next_field().await {
      Ok(field) => field,
      Err(_) => {
        return crate::domains::error::ApiError::bad_request("invalid multipart payload")
          .into_response();
      }
    };
    let Some(field) = next else { break };
    if field.name().unwrap_or("") != "file" {
      continue;
    }
    file_name = field.file_name().unwrap_or("photo.bin").to_string();
    content_type = field.content_type().map(str::to_string);
    bytes = match field.bytes().await {
      Ok(value) => value.to_vec(),
      Err(_) => {
        return crate::domains::error::ApiError::bad_request("invalid photo file").into_response();
      }
    };
  }

  match etudiant_service::upload_profile_photo(
    &db,
    auth.user_id,
    &file_name,
    content_type.as_deref(),
    bytes,
  )
  .await
  {
    Ok(profile) => (StatusCode::OK, Json(profile)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn get_my_photo(State(db): State<PgPool>, headers: HeaderMap) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match etudiant_service::get_profile_photo_blob(&db, auth.user_id).await {
    Ok((bytes, content_type)) => (
      StatusCode::OK,
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
