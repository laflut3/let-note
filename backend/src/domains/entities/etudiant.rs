use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Etudiant {
  pub id: Uuid,
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateEtudiant {
  pub nom: String,
  pub prenom: String,
  pub email: String,
  pub date_naissance: NaiveDate,
}
