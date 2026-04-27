use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GetMatPromo {
  pub id_mat: Uuid,
  pub id_promo: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateMatPromo {
  pub id_mat: Uuid,
  pub id_promo: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteMatPromo {
  pub id_mat: Uuid,
  pub id_promo: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchMatPromo {
  pub id_mat: Uuid,
  pub id_promo: Uuid,
  pub new_id_mat: Option<Uuid>,
  pub new_id_promo: Option<Uuid>,
}

pub type MatPromo = GetMatPromo;
