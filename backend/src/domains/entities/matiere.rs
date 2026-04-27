use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GetMatiere {
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteMatiere {
  pub code_matiere: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchMatiere {
  pub code_matiere: String,
  pub nom_matiere: Option<String>,
  pub annee: Option<NaiveDate>,
}

pub type Matiere = GetMatiere;
