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

include!("admin_routes/types.rs");
include!("admin_routes/users.rs");
include!("admin_routes/professeurs.rs");
include!("admin_routes/promotions.rs");
include!("admin_routes/matieres.rs");
