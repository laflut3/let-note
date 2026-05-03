use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, PartialEq, Eq)]
pub struct GetEtudiant {
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteEtudiant {
  pub id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchEtudiant {
  pub id: Uuid,
  pub nom: Option<String>,
  pub prenom: Option<String>,
  pub email: Option<String>,
  pub date_naissance: Option<NaiveDate>,
}

pub type Etudiant = GetEtudiant;
