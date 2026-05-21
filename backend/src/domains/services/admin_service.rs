use chrono::{Datelike, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domains::{
  entities::{etudiant::GetEtudiant, professeur::CreateProfesseur, promotion::CreatePromotion},
  error::ApiError,
};
use crate::infrastructure::s3;

include!("admin_service/types.rs");
include!("admin_service/students.rs");
include!("admin_service/professeurs.rs");
include!("admin_service/matieres.rs");
include!("admin_service/promotions.rs");
include!("admin_service/updates.rs");
include!("admin_service/helpers.rs");
