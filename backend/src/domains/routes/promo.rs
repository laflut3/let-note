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
    .route("/ues", get(list_ues).post(create_ue))
    .route("/ues/{ue_id}", put(update_ue).delete(delete_ue))
    .route("/ues/{ue_id}/promotions", get(list_ue_promotions))
    .route("/promotions", get(list_accessible_promotions))
    .route("/promotions/{promo_id}/dashboard", get(get_promo_dashboard))
    .route("/promotions/{promo_id}/ical", get(get_promo_ical))
    .route("/promotions/{promo_id}/ues", get(list_ues_for_promo))
    .route(
      "/promotions/{promo_id}/ues/catalog",
      middleware::right_admin_or_delegue_for_promo(get(list_ue_catalog_for_promo), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/ical-url",
      middleware::right_admin(put(update_promo_ical_url), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/ues",
      middleware::right_admin_or_delegue_for_promo(post(create_ue_for_promo), db.clone()),
    )
    .route(
      "/promotions/{promo_id}/ues/{ue_id}",
      middleware::right_admin_or_delegue_for_promo(
        put(update_ue_for_promo).delete(delete_ue_for_promo),
        db.clone(),
      ),
    )
    .route(
      "/promotions/{promo_id}/ues/{ue_id}/attach",
      middleware::right_admin_or_delegue_for_promo(
        post(attach_ue_to_promo).delete(detach_ue_from_promo),
        db.clone(),
      ),
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
      middleware::right_admin_or_delegue_for_promo(post(create_devoir_for_promo), db.clone()),
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
    .route(
      "/promotions/{promo_id}/matieres/{matiere_id}/resultats",
      post(create_resultat_for_matiere),
    )
    .route(
      "/promotions/{promo_id}/resultats/{resultat_id}",
      put(update_resultat).delete(delete_resultat),
    )
}

include!("promo_routes/types.rs");
include!("promo_routes/dashboard.rs");
include!("promo_routes/ues.rs");
include!("promo_routes/devoirs.rs");
include!("promo_routes/resultats.rs");
include!("promo_routes/resources.rs");
