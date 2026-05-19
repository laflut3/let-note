use axum::{
  Json, Router,
  extract::{Path, State},
  http::HeaderMap,
  response::IntoResponse,
  routing::{get, post, put},
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{middleware, services::promo_service};

pub fn promo_routes(db: PgPool) -> Router<PgPool> {
  Router::new()
    .route("/promotions", get(list_accessible_promotions))
    .route("/promotions/{promo_id}/dashboard", get(get_promo_dashboard))
    .route("/promotions/{promo_id}/ues", get(list_ues_for_promo))
    .route(
      "/promotions/{promo_id}/ical-url",
      middleware::right_admin(put(update_promo_ical_url), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/ues",
      middleware::right_delegue_for_promo(post(create_ue_for_promo), db.clone()),
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
      "/promotions/{promo_id}/matieres/{matiere_id}/referent/{prof_id}",
      middleware::right_admin_or_delegue_for_promo(put(set_referent_for_matiere), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/matieres/{matiere_id}/resultats",
      post(create_resultat_for_matiere),
    )
    .route(
      "/promotions/{promo_id}/resultats/{resultat_id}",
      put(update_resultat),
    )
}

async fn list_accessible_promotions(
  State(db): State<PgPool>,
  headers: HeaderMap,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_accessible_promotions(&db, &auth).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn get_promo_dashboard(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::get_promotion_dashboard(&db, &auth, promo_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_ues_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_ues_for_promo(&db, &auth, promo_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_promo_ical_url(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::UpdateIcalInput>,
) -> impl IntoResponse {
  match promo_service::update_promotion_ical_url(&db, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_ue_for_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateUeInput>,
) -> impl IntoResponse {
  match promo_service::create_ue_for_promo(&db, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
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

async fn create_resultat_for_matiere(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, matiere_id)): Path<(Uuid, String)>,
  Json(payload): Json<promo_service::CreateResultatInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::create_resultat_for_matiere(&db, &auth, promo_id, matiere_id, payload).await
  {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_resultat(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, resultat_id)): Path<(Uuid, Uuid)>,
  Json(payload): Json<promo_service::UpdateResultatInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::update_resultat(&db, &auth, promo_id, resultat_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}
