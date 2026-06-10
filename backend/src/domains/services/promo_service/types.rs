#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereInput {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub referent_prof_id: Uuid,
}

#[derive(Debug, Clone)]
pub struct CreatePromoMatiereResourceUploadInput {
  pub type_metier: String,
  pub title: String,
  pub description: Option<String>,
  pub file_name: String,
  pub content_type: Option<String>,
  pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateProfesseurInput {
  pub prenom: String,
  pub nom: String,
  pub email: String,
  pub date_naissance: Option<NaiveDate>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateIcalInput {
  pub ical_url: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateDevoirInput {
  pub id_mat: String,
  pub titre: String,
  pub description: Option<String>,
  pub date_rendu: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateDevoirInput {
  pub id_mat: Option<String>,
  pub titre: Option<String>,
  pub description: Option<String>,
  pub date_rendu: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromotionScope {
  pub id: Uuid,
  pub nom: String,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub referent_prof_email: Option<String>,
  pub can_manage: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DashboardPayload {
  pub promotion: PromotionScope,
  pub etudiants: Vec<PromoStudent>,
  pub matieres: Vec<MatiereDashboardItem>,
  pub professeurs: Vec<ProfesseurDashboardItem>,
  pub devoirs: Vec<DevoirPayload>,
  pub events: Vec<PromotionEventPayload>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromoStudent {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromoStudentManagementItem {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub is_in_promo: bool,
  pub is_delegue: bool,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpsertStudentEventInput {
  pub id_etu: Uuid,
  pub event_month: i32,
  pub event_day: i32,
  pub title: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct StudentEventConfig {
  pub id: Uuid,
  pub id_etu: Uuid,
  pub student_nom: String,
  pub student_prenom: String,
  pub event_type: String,
  pub title: String,
  pub event_month: i32,
  pub event_day: i32,
  pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PromotionEventPayload {
  pub id: Option<Uuid>,
  pub id_etu: Uuid,
  pub student_nom: String,
  pub student_prenom: String,
  pub event_type: String,
  pub title: String,
  pub event_month: i32,
  pub event_day: i32,
  pub occurrence_date: NaiveDate,
  pub is_today: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MatiereDashboardItem {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub referent_prof_email: Option<String>,
  pub resources: Vec<MatiereResourceDashboardItem>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct MatiereDashboardRow {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub referent_prof_id: Option<Uuid>,
  pub referent_prof_nom: Option<String>,
  pub referent_prof_prenom: Option<String>,
  pub referent_prof_email: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct MatiereResourceDashboardItem {
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
  pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct DevoirPayload {
  pub id: Uuid,
  pub id_promo: Uuid,
  pub id_mat: String,
  pub nom_matiere: String,
  pub titre: String,
  pub description: Option<String>,
  pub date_rendu: Option<DateTime<Utc>>,
  pub created_at: DateTime<Utc>,
  pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct ProfesseurDashboardItem {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MutationAck {
  pub message: &'static str,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct ResourceFileRow {
  id_promo: Option<Uuid>,
  s3_bucket: String,
  s3_key: String,
  content_type: Option<String>,
  title: String,
}
