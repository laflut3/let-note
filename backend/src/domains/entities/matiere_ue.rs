use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GetMatiereUe {
  pub id_promo: Uuid,
  pub id_matiere: String,
  pub id_ue: Uuid,
  pub coef_ue: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateMatiereUe {
  pub id_promo: Uuid,
  pub id_matiere: String,
  pub id_ue: Uuid,
  pub coef_ue: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteMatiereUe {
  pub id_promo: Uuid,
  pub id_matiere: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PatchMatiereUe {
  pub id_promo: Uuid,
  pub id_matiere: String,
  pub coef_ue: Option<f32>,
  pub new_id_matiere: Option<String>,
  pub new_id_ue: Option<Uuid>,
}

pub type MatiereUe = GetMatiereUe;
