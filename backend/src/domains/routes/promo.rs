use axum::{
  Json, Router,
  extract::{Path, State},
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

async fn get_promo_ical(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::fetch_promotion_ical(&db, &auth, promo_id).await {
    Ok(ical) => (
      [(header::CONTENT_TYPE, "text/calendar; charset=utf-8")],
      ical,
    )
      .into_response(),
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

async fn list_ues(State(db): State<PgPool>, headers: HeaderMap) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_ues(&db, &auth).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_ue(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Json(payload): Json<promo_service::CreateUeInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::create_ue(&db, &auth, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_ue(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(ue_id): Path<Uuid>,
  Json(payload): Json<promo_service::UpdateUeInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::update_ue(&db, &auth, ue_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_ue(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(ue_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::delete_ue(&db, &auth, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_ue_promotions(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(ue_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_ue_promotions(&db, &auth, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn list_ue_catalog_for_promo(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  match promo_service::list_ue_catalog_for_promo(&db, promo_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_ue_for_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
  Json(payload): Json<promo_service::UpdateUeInput>,
) -> impl IntoResponse {
  match promo_service::update_ue_for_promo(&db, promo_id, ue_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_ue_for_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::delete_ue_for_promo(&db, promo_id, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn attach_ue_to_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::attach_ue_to_promo(&db, promo_id, ue_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn detach_ue_from_promo(
  State(db): State<PgPool>,
  Path((promo_id, ue_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::detach_ue_from_promo(&db, promo_id, ue_id).await {
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

async fn list_devoirs_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::list_devoirs_for_promo(&db, &auth, promo_id).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn create_devoir_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path(promo_id): Path<Uuid>,
  Json(payload): Json<promo_service::CreateDevoirInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::create_devoir_for_promo(&db, &auth, promo_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_devoir_for_promo(
  State(db): State<PgPool>,
  headers: HeaderMap,
  Path((promo_id, devoir_id)): Path<(Uuid, Uuid)>,
  Json(payload): Json<promo_service::UpdateDevoirInput>,
) -> impl IntoResponse {
  let auth = match middleware::extract_auth_context(&headers, &db).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match promo_service::update_devoir_for_promo(&db, &auth, promo_id, devoir_id, payload).await {
    Ok(data) => axum::Json(data).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn delete_devoir_for_promo(
  State(db): State<PgPool>,
  Path((promo_id, devoir_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
  match promo_service::delete_devoir_for_promo(&db, promo_id, devoir_id).await {
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
