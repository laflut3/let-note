use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Professeur {
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
