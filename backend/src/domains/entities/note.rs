use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Note {
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
