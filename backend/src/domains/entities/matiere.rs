use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Matiere {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub annee: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateMatiere {
  pub code_matiere: String,
  pub nom_matiere: String,
  pub annee: NaiveDate,
}
