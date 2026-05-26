use std::collections::HashMap;
use std::time::Duration;

use reqwest::{Client, Url};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct VaultKvV2Envelope {
  data: VaultKvV2Data,
}

#[derive(Debug, Deserialize)]
struct VaultKvV2Data {
  data: HashMap<String, String>,
}

pub async fn load_secrets_from_vault() -> anyhow::Result<()> {
  let vault_addr = match std::env::var("VAULT_ADDR") {
    Ok(value) => value,
    Err(_) => return Ok(()),
  };

  let vault_url = Url::parse(&vault_addr)
    .map_err(|err| anyhow::anyhow!("VAULT_ADDR must be a valid URL: {err}"))?;
  let allow_insecure_http = std::env::var("VAULT_ALLOW_INSECURE_HTTP")
    .map(|value| value.eq_ignore_ascii_case("true"))
    .unwrap_or(false);
  match vault_url.scheme() {
    "https" => {}
    "http" if allow_insecure_http => {}
    "http" => {
      return Err(anyhow::anyhow!(
        "VAULT_ADDR must use https; set VAULT_ALLOW_INSECURE_HTTP=true only for local/dev Vault"
      ));
    }
    scheme => {
      return Err(anyhow::anyhow!(
        "VAULT_ADDR must use http or https, got scheme '{scheme}'"
      ));
    }
  }

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

  let timeout_seconds = std::env::var("VAULT_TIMEOUT_SECONDS")
    .ok()
    .and_then(|value| value.parse::<u64>().ok())
    .unwrap_or(10);

  let client = Client::builder()
    .timeout(Duration::from_secs(timeout_seconds))
    .build()?;
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
