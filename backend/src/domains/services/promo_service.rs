use chrono::{DateTime, NaiveDate, Utc};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::domains::{error::ApiError, middleware::AuthContext};
use crate::infrastructure::s3;

include!("promo_service/types.rs");
include!("promo_service/dashboard.rs");
include!("promo_service/ue.rs");
include!("promo_service/subjects.rs");
include!("promo_service/devoirs.rs");
include!("promo_service/resultats.rs");
include!("promo_service/helpers.rs");
