use axum::{
  Json, Router,
  body::Body,
  extract::{Path, Query, State},
  http::HeaderMap,
  http::header,
  response::IntoResponse,
  routing::{get, post, put},
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{middleware, services::promo_service};

pub fn promo_routes(db: PgPool) -> Router<PgPool> {
  Router::new()
    .route("/resources/{resource_id}/file", get(get_resource_file))
    .route("/promotions", get(list_accessible_promotions))
    .route("/promotions/{promo_id}/dashboard", get(get_promo_dashboard))
    .route("/promotions/{promo_id}/ical", get(get_promo_ical))
    .route(
      "/promotions/{promo_id}/ical-url",
      middleware::right_admin(put(update_promo_ical_url), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/matieres",
      middleware::right_admin_or_delegue_for_promo(post(add_matiere_to_promo), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/professeurs",
      middleware::right_admin_or_delegue_for_promo(post(add_professeur_to_promo), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/devoirs",
      get(list_devoirs_for_promo),
    )
    .route(
      "/promotions/{promo_id}/devoirs",
      post(create_devoir_for_promo),
    )
    .route(
      "/promotions/{promo_id}/devoirs/{devoir_id}",
      middleware::right_admin_or_delegue_for_promo(
        put(update_devoir_for_promo).delete(delete_devoir_for_promo),
        db.clone(),
      ),
    )
    .route(
      "/promotions/{promo_id}/matieres/{matiere_id}/referent/{prof_id}",
      middleware::right_admin_or_delegue_for_promo(put(set_referent_for_matiere), db.clone()),
    )
}

async fn add_matiere_to_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateMatiereInput>,
) -> impl IntoResponse {
  match promo_service::add_matiere_to_promo(&db, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn add_professeur_to_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateProfesseurInput>,
) -> impl IntoResponse {
  match promo_service::add_professeur_to_promo(&db, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn set_referent_for_matiere(
  State(db): State<PgPool>,
  Path((promo_id, matiere_id, prof_id)): Path<(Uuid, String, Uuid)>,
) -> impl IntoResponse {
  match promo_service::set_referent_for_matiere(&db, promo_id, matiere_id, prof_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

include!("promo_routes/types.rs");
include!("promo_routes/dashboard.rs");
include!("promo_routes/devoirs.rs");
include!("promo_routes/resources.rs");
