use axum::{
  Json, Router,
  extract::{Multipart, Path, State},
  http::{HeaderMap, StatusCode},
  response::IntoResponse,
  routing::{get, post, put},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{
  entities::promotion::CreatePromotion, error::ApiError, middleware, services::admin_service,
};

#[derive(Serialize)]
struct AdminStatus {
  message: &'static str,
}

#[derive(Debug, Deserialize)]
struct CreateAdminProfesseurPayload {
  prenom: String,
  nom: String,
  email: String,
  date_naissance: chrono::NaiveDate,
}

pub fn admin_routes(db: PgPool) -> Router<PgPool> {
  Router::new()
    .route(
      "/status",
      middleware::right_admin(get(admin_status), db.clone()),
    )
    .route(
      "/users",
      middleware::right_admin(get(list_users), db.clone()),
    )
    .route(
      "/users/details",
      middleware::right_admin(get(list_users_details), db.clone()),
    )
    .route(
      "/users/{etu_id}",
      middleware::right_admin(put(update_user), db.clone()),
    )
    .route(
      "/professeurs",
      middleware::right_admin(get(list_professeurs).post(create_professeur), db.clone()),
    )
    .route(
      "/professeurs/{prof_id}",
      middleware::right_admin(put(update_professeur).delete(delete_professeur), db.clone()),
    )
    .route(
      "/promotions",
      middleware::right_admin(get(list_promotions).post(create_promotion), db.clone()),
    )
    .route(
      "/promotions/{promo_id}",
      middleware::right_admin(put(update_promotion).delete(delete_promotion), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/etudiants",
      middleware::right_admin(get(list_promotion_students), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/etudiants/{etu_id}",
      middleware::right_admin(
        post(add_student_to_promotion).delete(remove_student_from_promotion),
        db.clone(),
      ),
    )
    .route(
      "/matieres",
      middleware::right_admin(get(list_matieres).post(create_matiere), db.clone()),
    )
    .route(
      "/matieres/{code_matiere}",
      middleware::right_admin(put(update_matiere).delete(delete_matiere), db.clone()),
    )
    .route(
      "/matieres/{code_matiere}/link-all",
      middleware::right_admin(post(link_matiere_all_promotions), db.clone()),
    )
    .route(
      "/matieres/{code_matiere}/link-promotion",
      middleware::right_admin(post(link_matiere_promotion), db.clone()),
    )
    .route(
      "/matieres/{code_matiere}/resources",
      middleware::right_admin(
        get(list_matiere_resources).post(create_matiere_resource),
        db.clone(),
      ),
    )
    .route(
      "/matieres/resources/{resource_id}",
      middleware::right_admin(axum::routing::delete(delete_matiere_resource), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/delegues/{etu_id}",
      middleware::right_admin(post(assign_delegue).delete(remove_delegue), db),
    )
}

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
