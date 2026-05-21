use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GetUe {
  pub id: Uuid,
  pub nom_ue: String,
  pub semestre: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateUe {
  pub nom_ue: String,
  pub semestre: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteUe {
  pub id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchUe {
  pub id: Uuid,
  pub nom_ue: Option<String>,
  pub semestre: Option<i32>,
}

pub type Ue = GetUe;
