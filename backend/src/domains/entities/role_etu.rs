use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RoleEtu {
  pub id_role: Uuid,
  pub id_etu: Uuid,
}
