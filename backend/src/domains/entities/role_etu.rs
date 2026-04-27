use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GetRoleEtu {
  pub id_role: Uuid,
  pub id_etu: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateRoleEtu {
  pub id_role: Uuid,
  pub id_etu: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteRoleEtu {
  pub id_role: Uuid,
  pub id_etu: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PatchRoleEtu {
  pub id_role: Uuid,
  pub id_etu: Uuid,
  pub new_id_role: Option<Uuid>,
  pub new_id_etu: Option<Uuid>,
}

pub type RoleEtu = GetRoleEtu;
