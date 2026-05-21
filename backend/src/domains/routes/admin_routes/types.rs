#[derive(Serialize)]
struct AdminStatus {
  message: &'static str,
}

#[derive(Debug, Deserialize)]
struct CreateAdminProfesseurPayload {
  prenom: String,
  nom: String,
  email: String,
  date_naissance: chrono::NaiveDate,
}
