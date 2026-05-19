use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GetPromotion {
  pub id: Uuid,
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee_debut: NaiveDate,
  pub annee_fin: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreatePromotion {
  pub image_url: String,
  pub ical_url: Option<String>,
  pub annee: i32,
  pub etudiant_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeletePromotion {
  pub id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchPromotion {
  pub id: Uuid,
  pub annee_debut: Option<NaiveDate>,
  pub annee_fin: Option<NaiveDate>,
}

pub type Promotion = GetPromotion;
