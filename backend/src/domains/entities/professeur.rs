use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GetProfesseur {
  pub id: Uuid,
  pub prenom: String,
  pub nom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateProfesseur {
  pub prenom: String,
  pub nom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteProfesseur {
  pub id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchProfesseur {
  pub id: Uuid,
  pub prenom: Option<String>,
  pub nom: Option<String>,
  pub email: Option<String>,
  pub date_naissance: Option<NaiveDate>,
}

pub type Professeur = GetProfesseur;
