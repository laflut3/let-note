use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MatiereUe {
  pub id_matiere: String,
  pub id_ue: Uuid,
  pub coef_ue: f32,
}
