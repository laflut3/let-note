#[derive(Debug, Clone, serde::Serialize)]
pub struct CreatedPromotion {
  pub id: Uuid,
  pub nom: String,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub referent_prof_id: Option<Uuid>,
  pub user_count: usize,
}

#[derive(Debug, Clone)]
pub struct PromotionImageUploadInput {
  pub file_name: String,
  pub content_type: Option<String>,
  pub bytes: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct CreatePromotionInput {
  pub nom: String,
  pub ical_url: Option<String>,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub referent_prof_id: Option<Uuid>,
  pub etudiant_ids: Vec<Uuid>,
  pub image: PromotionImageUploadInput,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminPromotionSummary {
  pub id: Uuid,
  pub nom: String,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub etudiant_count: i64,
  pub delegue_count: i64,
  pub delegues: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminProfesseur {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DelegateAssignment {
  pub promo_id: Uuid,
  pub etu_id: Uuid,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminMatiereSummary {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub promotion_count: i64,
  pub linked_promo_ids: Vec<Uuid>,
  pub linked_promotions: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromotionStudent {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub is_delegue: bool,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminStudentDetailsRow {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
  pub roles: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct AdminStudentPromoInfo {
  pub promo_id: Uuid,
  pub promo_nom: String,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub is_delegue: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AdminStudentDetails {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
  pub roles: Vec<String>,
  pub promotions: Vec<AdminStudentPromoInfo>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateStudentInput {
  pub prenom: Option<String>,
  pub nom: Option<String>,
  pub email: Option<String>,
  pub date_naissance: Option<NaiveDate>,
}

#[derive(Debug, Clone)]
pub struct UpdatePromotionInput {
  pub nom: Option<String>,
  pub ical_url: Option<String>,
  pub annee_arrivee: Option<i32>,
  pub annee_depart: Option<i32>,
  pub referent_prof_id: Option<Uuid>,
  pub image: Option<PromotionImageUploadInput>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateProfesseurInput {
  pub prenom: Option<String>,
  pub nom: Option<String>,
  pub email: Option<String>,
  pub date_naissance: Option<NaiveDate>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateMatiereInput {
  pub nom_matiere: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereInput {
  pub code_matiere: String,
  pub nom_matiere: String,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct MatiereResourceItem {
  pub id: Uuid,
  pub id_mat: String,
  pub id_promo: Option<Uuid>,
  pub type_metier: String,
  pub title: String,
  pub description: Option<String>,
  pub s3_bucket: String,
  pub s3_key: String,
  pub url: Option<String>,
  pub content_type: Option<String>,
  pub size_bytes: Option<i64>,
  pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereResourceInput {
  pub id_promo: Option<Uuid>,
  pub type_metier: String,
  pub title: String,
  pub description: Option<String>,
  pub s3_bucket: String,
  pub s3_key: String,
  pub url: Option<String>,
  pub content_type: Option<String>,
  pub size_bytes: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct CreateMatiereResourceUploadInput {
  pub id_promo: Option<Uuid>,
  pub type_metier: String,
  pub title: String,
  pub description: Option<String>,
  pub file_name: String,
  pub content_type: Option<String>,
  pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct LinkMatiereAllPromotionsInput {
  pub nom_matiere: Option<String>,
  pub referent_prof_id: Uuid,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct LinkMatierePromotionInput {
  pub promo_id: Uuid,
  pub nom_matiere: Option<String>,
  pub referent_prof_id: Uuid,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MutationAck {
  pub message: &'static str,
}
