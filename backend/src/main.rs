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
  let _ = (
    &s3_config.endpoint,
    &s3_config.region,
    &s3_config.bucket,
    &s3_config.access_key,
    &s3_config.secret_key,
  );
  let db_pool = bdd::create_db_pool().await?;
  let app = create_router(db_pool.clone()).with_state(db_pool);
  http::serve_http(app, &config).await?;
  Ok(())
}
