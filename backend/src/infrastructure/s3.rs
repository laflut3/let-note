#[derive(Debug, Clone)]
pub struct S3Config {
  pub endpoint: String,
  pub region: String,
  pub bucket: String,
  pub access_key: String,
  pub secret_key: String,
}

pub fn read_s3_config() -> anyhow::Result<S3Config> {
  let endpoint = std::env::var("S3_ENDPOINT")
    .unwrap_or_else(|_| "http://127.0.0.1:9000".to_string())
    .trim()
    .to_string();
  let region = std::env::var("S3_REGION")
    .unwrap_or_else(|_| "us-east-1".to_string())
    .trim()
    .to_string();
  let bucket = std::env::var("S3_BUCKET")
    .unwrap_or_else(|_| "let-note-files".to_string())
    .trim()
    .to_string();
  let access_key = std::env::var("S3_ACCESS_KEY")
    .unwrap_or_else(|_| "minioadmin".to_string())
    .trim()
    .to_string();
  let secret_key = std::env::var("S3_SECRET_KEY")
    .unwrap_or_else(|_| "minioadmin".to_string())
    .trim()
    .to_string();

  if endpoint.is_empty() || region.is_empty() || bucket.is_empty() {
    return Err(anyhow::anyhow!(
      "S3_ENDPOINT, S3_REGION and S3_BUCKET must be non-empty"
    ));
  }
  if access_key.is_empty() || secret_key.is_empty() {
    return Err(anyhow::anyhow!("S3 credentials must be non-empty"));
  }

  Ok(S3Config {
    endpoint,
    region,
    bucket,
    access_key,
    secret_key,
  })
}
