use std::{collections::HashMap, net::SocketAddr};

use clap::Parser;
use reqwest::Client;
use serde::Deserialize;
use sqlx::postgres::PgPoolOptions;

use crate::app::create_router;

pub mod app;
pub mod domains;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
  #[arg(
    short = 'H',
    long = "host",
    env = "APP_HOST",
    default_value = "127.0.0.1"
  )]
  host: String,

  #[arg(short = 'P', long = "port", env = "APP_PORT", default_value_t = 8080)]
  port: u16,
}

#[derive(Debug, Deserialize)]
struct VaultKvV2Envelope {
  data: VaultKvV2Data,
}

#[derive(Debug, Deserialize)]
struct VaultKvV2Data {
  data: HashMap<String, String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
  let args = Args::parse();

  load_secrets_from_vault().await?;

  let database_url = build_database_url()?;
  let db_pool = PgPoolOptions::new()
    .max_connections(5)
    .connect(&database_url)
    .await?;
  let app = create_router().with_state(db_pool);

  let socket_addr = format!("{}:{}", args.host, args.port)
    .parse::<SocketAddr>()
    .expect("Invalid socket address.");

  let listener = tokio::net::TcpListener::bind(socket_addr).await?;
  axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal())
    .await?;

  Ok(())
}

async fn load_secrets_from_vault() -> anyhow::Result<()> {
  let vault_addr = match std::env::var("VAULT_ADDR") {
    Ok(value) => value,
    Err(_) => return Ok(()),
  };

  let vault_token = std::env::var("VAULT_TOKEN")
    .map_err(|_| anyhow::anyhow!("VAULT_ADDR is set but VAULT_TOKEN is missing"))?;

  let mount = std::env::var("VAULT_KV_MOUNT").unwrap_or_else(|_| "secret".to_string());
  let path = std::env::var("VAULT_SECRET_PATH").unwrap_or_else(|_| "let-note".to_string());

  let url = format!(
    "{}/v1/{}/data/{}",
    vault_addr.trim_end_matches('/'),
    mount,
    path
  );

  let client = Client::builder().build()?;
  let response = client
    .get(url)
    .header("X-Vault-Token", vault_token)
    .send()
    .await?;

  if !response.status().is_success() {
    return Err(anyhow::anyhow!(
      "vault returned status {} while fetching secrets",
      response.status()
    ));
  }

  let payload: VaultKvV2Envelope = response.json().await?;

  for (key, value) in payload.data.data {
    if !value.is_empty() {
      // SAFETY: env mutation occurs during startup, before worker threads are spawned.
      unsafe {
        std::env::set_var(key, value);
      }
    }
  }

  Ok(())
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

pub async fn shutdown_signal() {
  tokio::signal::ctrl_c()
    .await
    .expect("Failed to install CTRL+C signal handler");
}
