use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Promotion {
  pub id: Uuid,
  pub annee_debut: NaiveDate,
  pub annee_fin: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreatePromotion {
  pub annee_debut: NaiveDate,
  pub annee_fin: NaiveDate,
}
