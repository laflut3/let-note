#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateUeInput {
  pub nom_ue: String,
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateUeInput {
  pub nom_ue: Option<String>,
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct UePayload {
  pub id: Uuid,
  pub nom_ue: String,
  pub semestre: i32,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct UeCatalogItem {
  pub id: Uuid,
  pub nom_ue: String,
  pub semestre: i32,
  pub linked_to_promo: bool,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct UePromotionLinkPayload {
  pub id: Uuid,
  pub nom: String,
  pub annee_arrivee: i32,
  pub annee_depart: i32,
  pub linked: bool,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateMatiereInput {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub ue_id: Uuid,
  pub coef_ue: Option<f32>,
  pub referent_prof_id: Uuid,
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
pub struct CreateResultatInput {
  pub etudiant_id: Option<Uuid>,
  pub libelle: String,
  pub session: Option<i32>,
  pub note: f32,
  pub coef: Option<f32>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateResultatInput {
  pub libelle: Option<String>,
  pub session: Option<i32>,
  pub note: Option<f32>,
  pub coef: Option<f32>,
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
  pub resultats: Vec<ResultatDashboardItem>,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct PromoStudent {
  pub id: Uuid,
  pub numero_etudiant: Option<String>,
  pub nom: String,
  pub prenom: String,
  pub email: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MatiereDashboardItem {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub ue_id: Option<Uuid>,
  pub ue_nom: Option<String>,
  pub ue_semestre: Option<i32>,
  pub coef_ue: Option<f32>,
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
  pub ue_id: Option<Uuid>,
  pub ue_nom: Option<String>,
  pub ue_semestre: Option<i32>,
  pub coef_ue: Option<f32>,
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

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
pub struct ResultatDashboardItem {
  pub id: Uuid,
  pub id_mat: String,
  pub nom_matiere: String,
  pub id_etu: Uuid,
  pub etu_numero: Option<String>,
  pub etu_nom: String,
  pub etu_prenom: String,
  pub libelle: String,
  pub session: Option<i32>,
  pub note: f32,
  pub coef: f32,
  pub updated_at: DateTime<Utc>,
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
