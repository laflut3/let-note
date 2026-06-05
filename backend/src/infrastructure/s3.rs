use anyhow::Context;
use aws_credential_types::Credentials;
use aws_sdk_s3::{Client, config::Builder as S3ConfigBuilder, primitives::ByteStream};
use aws_types::region::Region;

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

pub async fn upload_bytes(
  key: &str,
  content: Vec<u8>,
  content_type: Option<&str>,
) -> anyhow::Result<()> {
  let cfg = read_s3_config()?;
  let bucket = cfg.bucket.clone();
  let client = client_from_config(&cfg);

  ensure_bucket_exists(&client, &bucket)
    .await
    .with_context(|| format!("unable to access S3 bucket {bucket}"))?;

  let request = client
    .put_object()
    .bucket(bucket)
    .key(key)
    .body(ByteStream::from(content));

  let request = if let Some(ct) = content_type.filter(|value| !value.trim().is_empty()) {
    request.content_type(ct.trim().to_string())
  } else {
    request
  };

  request
    .send()
    .await
    .with_context(|| format!("unable to upload S3 object {key}"))?;
  Ok(())
}

pub async fn download_bytes(bucket: &str, key: &str) -> anyhow::Result<(Vec<u8>, Option<String>)> {
  let cfg = read_s3_config()?;
  let client = client_from_config(&cfg);
  let object = client
    .get_object()
    .bucket(bucket)
    .key(key)
    .send()
    .await
    .with_context(|| format!("unable to download S3 object {bucket}/{key}"))?;
  let content_type = object.content_type().map(str::to_string);
  let bytes = object.body.collect().await?.into_bytes().to_vec();
  Ok((bytes, content_type))
}

fn client_from_config(cfg: &S3Config) -> Client {
  let client_config = S3ConfigBuilder::new()
    .region(Region::new(cfg.region.clone()))
    .endpoint_url(cfg.endpoint.clone())
    .force_path_style(true)
    .credentials_provider(Credentials::new(
      cfg.access_key.clone(),
      cfg.secret_key.clone(),
      None,
      None,
      "let-note",
    ))
    .build();

  Client::from_conf(client_config)
}

async fn ensure_bucket_exists(client: &Client, bucket: &str) -> anyhow::Result<()> {
  if client.head_bucket().bucket(bucket).send().await.is_ok() {
    return Ok(());
  }

  let _ = client.create_bucket().bucket(bucket).send().await;
  client.head_bucket().bucket(bucket).send().await?;
  Ok(())
}
