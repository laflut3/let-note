use axum::{
  Json, Router,
  extract::{Path, State},
  http::{HeaderMap, StatusCode},
  response::IntoResponse,
  routing::{get, post},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{entities::promotion::CreatePromotion, middleware, services::admin_service};

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
      "/professeurs",
      middleware::right_admin(get(list_professeurs).post(create_professeur), db.clone()),
    )
    .route(
      "/promotions",
      middleware::right_admin(get(list_promotions).post(create_promotion), db.clone()),
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

async fn remove_delegue(
  State(db): State<PgPool>,
  Path((promo_id, etu_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match admin_service::remove_delegue(&db, promo_id, etu_id).await {
    Ok(()) => StatusCode::NO_CONTENT.into_response(),
    Err(error) => error.into_response(),
  }
}
