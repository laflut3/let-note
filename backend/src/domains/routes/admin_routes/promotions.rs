async fn list_promotions(State(db): State<PgPool>) -> impl IntoResponse {
  match admin_service::list_promotions(&db).await {
    Ok(promotions) => (StatusCode::OK, Json(promotions)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn update_promotion(
  State(db): State<PgPool>,
  Path(promo_id): Path<Uuid>,
  multipart: Multipart,
) -> impl IntoResponse {
  let payload = match parse_update_promotion_multipart(multipart).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

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
  multipart: Multipart,
) -> impl IntoResponse {
  let payload = match parse_create_promotion_multipart(multipart).await {
    Ok(value) => value,
    Err(error) => return error.into_response(),
  };

  match admin_service::create_promotion(&db, payload).await {
    Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
    Err(error) => error.into_response(),
  }
}

async fn parse_create_promotion_multipart(
  multipart: Multipart,
) -> Result<admin_service::CreatePromotionInput, ApiError> {
  let form = parse_promotion_form(multipart).await?;
  Ok(admin_service::CreatePromotionInput {
    nom: require_field(form.nom, "nom")?,
    ical_url: form.ical_url,
    annee_arrivee: parse_required_i32(form.annee_arrivee, "annee_arrivee")?,
    annee_depart: parse_required_i32(form.annee_depart, "annee_depart")?,
    referent_prof_id: parse_optional_uuid(form.referent_prof_id, "referent_prof_id")?,
    etudiant_ids: form.etudiant_ids,
    image: form
      .image
      .ok_or_else(|| ApiError::bad_request("promotion image is required"))?,
  })
}

async fn parse_update_promotion_multipart(
  multipart: Multipart,
) -> Result<admin_service::UpdatePromotionInput, ApiError> {
  let form = parse_promotion_form(multipart).await?;
  Ok(admin_service::UpdatePromotionInput {
    nom: form.nom,
    ical_url: form.ical_url,
    annee_arrivee: parse_optional_i32(form.annee_arrivee, "annee_arrivee")?,
    annee_depart: parse_optional_i32(form.annee_depart, "annee_depart")?,
    referent_prof_id: parse_optional_uuid(form.referent_prof_id, "referent_prof_id")?,
    image: form.image,
  })
}

#[derive(Default)]
struct PromotionMultipartForm {
  nom: Option<String>,
  ical_url: Option<String>,
  annee_arrivee: Option<String>,
  annee_depart: Option<String>,
  referent_prof_id: Option<String>,
  etudiant_ids: Vec<Uuid>,
  image: Option<admin_service::PromotionImageUploadInput>,
}

async fn parse_promotion_form(mut multipart: Multipart) -> Result<PromotionMultipartForm, ApiError> {
  let mut form = PromotionMultipartForm::default();

  while let Some(field) = multipart
    .next_field()
    .await
    .map_err(|_| ApiError::bad_request("invalid multipart payload"))?
  {
    let name = field.name().unwrap_or("").to_string();
    let file_name = field
      .file_name()
      .map(str::to_string)
      .unwrap_or_else(|| "promotion-image".to_string());
    let content_type = field.content_type().map(str::to_string);
    let bytes = field
      .bytes()
      .await
      .map_err(|_| ApiError::bad_request("invalid multipart field"))?;

    match name.as_str() {
      "image" => {
        form.image = Some(admin_service::PromotionImageUploadInput {
          file_name,
          content_type,
          bytes: bytes.to_vec(),
        });
      }
      "etudiant_ids" => {
        let value = field_text(bytes.to_vec())?;
        append_student_ids(&mut form.etudiant_ids, &value)?;
      }
      "nom" => form.nom = Some(field_text(bytes.to_vec())?),
      "ical_url" => form.ical_url = optional_field_text(bytes.to_vec())?,
      "annee_arrivee" => form.annee_arrivee = Some(field_text(bytes.to_vec())?),
      "annee_depart" => form.annee_depart = Some(field_text(bytes.to_vec())?),
      "referent_prof_id" => form.referent_prof_id = optional_field_text(bytes.to_vec())?,
      _ => {}
    }
  }

  form.etudiant_ids.sort_unstable();
  form.etudiant_ids.dedup();
  Ok(form)
}

fn require_field(value: Option<String>, field: &'static str) -> Result<String, ApiError> {
  value
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .ok_or_else(|| match field {
      "nom" => ApiError::bad_request("nom is required"),
      "annee_arrivee" => ApiError::bad_request("annee_arrivee is required"),
      "annee_depart" => ApiError::bad_request("annee_depart is required"),
      _ => ApiError::bad_request("required field is missing"),
    })
}

fn optional_field_text(bytes: Vec<u8>) -> Result<Option<String>, ApiError> {
  let value = field_text(bytes)?.trim().to_string();
  Ok(if value.is_empty() { None } else { Some(value) })
}

fn field_text(bytes: Vec<u8>) -> Result<String, ApiError> {
  String::from_utf8(bytes).map_err(|_| ApiError::bad_request("multipart field must be utf-8"))
}

fn parse_required_i32(value: Option<String>, field: &'static str) -> Result<i32, ApiError> {
  require_field(value, field)?
    .parse::<i32>()
    .map_err(|_| ApiError::bad_request("field must be a number"))
}

fn parse_optional_i32(
  value: Option<String>,
  _field: &'static str,
) -> Result<Option<i32>, ApiError> {
  value
    .map(|value| {
      value
        .trim()
        .parse::<i32>()
        .map_err(|_| ApiError::bad_request("field must be a number"))
    })
    .transpose()
}

fn parse_optional_uuid(
  value: Option<String>,
  _field: &'static str,
) -> Result<Option<Uuid>, ApiError> {
  value
    .map(|value| {
      Uuid::parse_str(value.trim())
        .map_err(|_| ApiError::bad_request("field must be a uuid"))
    })
    .transpose()
}

fn append_student_ids(target: &mut Vec<Uuid>, value: &str) -> Result<(), ApiError> {
  let value = value.trim();
  if value.is_empty() {
    return Ok(());
  }

  if value.starts_with('[') {
    let ids = serde_json::from_str::<Vec<Uuid>>(value)
      .map_err(|_| ApiError::bad_request("etudiant_ids must contain valid uuid values"))?;
    target.extend(ids);
    return Ok(());
  }

  target.push(
    Uuid::parse_str(value)
      .map_err(|_| ApiError::bad_request("etudiant_ids must contain valid uuid values"))?,
  );
  Ok(())
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
