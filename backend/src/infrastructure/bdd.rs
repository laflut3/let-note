use sqlx::{PgPool, postgres::PgPoolOptions};

pub async fn create_db_pool() -> anyhow::Result<PgPool> {
  let database_url = build_database_url()?;
  PgPoolOptions::new()
    .max_connections(5)
    .connect(&database_url)
    .await
    .map_err(Into::into)
}

fn build_database_url() -> anyhow::Result<String> {
  if let Ok(url) = std::env::var("DATABASE_URL") {
    return Ok(url);
  }

  let host = std::env::var("PS_BDD_SERVER").unwrap_or_else(|_| "127.0.0.1".to_string());
  let port = std::env::var("PS_BDD_PORT").unwrap_or_else(|_| "5432".to_string());
  let db = std::env::var("PS_BDD_DB").unwrap_or_else(|_| "let_note_dev".to_string());
  let user = std::env::var("PS_BDD_USER").unwrap_or_else(|_| "let_note".to_string());
  let pass = std::env::var("PS_BDD_PASS")
    .map_err(|_| anyhow::anyhow!("PS_BDD_PASS is required when DATABASE_URL is not set"))?;

  Ok(format!("postgres://{user}:{pass}@{host}:{port}/{db}"))
}
