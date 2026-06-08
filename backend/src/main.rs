use crate::app::create_router;
use crate::infrastructure::{bdd, http, s3, vault};

pub mod app;
pub mod domains;
pub mod infrastructure;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
  let config = http::read_app_config();
  vault::load_secrets_from_vault().await?;
  let s3_config = s3::read_s3_config()?;
  s3::verify_bucket_access(&s3_config).await?;
  let db_pool = bdd::create_db_pool().await?;
  let app = create_router(db_pool.clone()).with_state(db_pool);
  http::serve_http(app, &config).await?;
  Ok(())
}
