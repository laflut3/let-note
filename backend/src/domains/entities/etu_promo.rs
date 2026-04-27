use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GetEtuPromo {
  pub id_etu: Uuid,
  pub id_promo: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateEtuPromo {
  pub id_etu: Uuid,
  pub id_promo: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteEtuPromo {
  pub id_etu: Uuid,
  pub id_promo: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchEtuPromo {
  pub id_etu: Uuid,
  pub id_promo: Uuid,
  pub new_id_etu: Option<Uuid>,
  pub new_id_promo: Option<Uuid>,
}

pub type EtuPromo = GetEtuPromo;
