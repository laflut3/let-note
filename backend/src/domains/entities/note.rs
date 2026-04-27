use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GetNote {
  pub id_mat: String,
  pub id_etu: Uuid,
  pub note: f32,
  pub coef: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateNote {
  pub id_mat: String,
  pub id_etu: Uuid,
  pub note: f32,
  pub coef: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteNote {
  pub id_mat: String,
  pub id_etu: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PatchNote {
  pub id_mat: String,
  pub id_etu: Uuid,
  pub note: Option<f32>,
  pub coef: Option<f32>,
}

pub type Note = GetNote;
