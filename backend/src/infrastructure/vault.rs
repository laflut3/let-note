use std::collections::HashMap;

use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct VaultKvV2Envelope {
  data: VaultKvV2Data,
}

#[derive(Debug, Deserialize)]
struct VaultKvV2Data {
  data: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct VaultAuthEnvelope {
  auth: VaultAuthData,
}

#[derive(Debug, Deserialize)]
struct VaultAuthData {
  client_token: String,
}

pub async fn load_secrets_from_vault() -> anyhow::Result<()> {
  let vault_addr = match std::env::var("VAULT_ADDR") {
    Ok(value) => value,
    Err(_) => return Ok(()),
  };

  let mount = std::env::var("VAULT_KV_MOUNT").unwrap_or_else(|_| "secret".to_string());
  let path = std::env::var("VAULT_SECRET_PATH").unwrap_or_else(|_| "let-note".to_string());
  let client = Client::builder().build()?;
  let vault_token = vault_token(&client, vault_addr.trim_end_matches('/')).await?;

  let url = format!(
    "{}/v1/{}/data/{}",
    vault_addr.trim_end_matches('/'),
    mount,
    path
  );

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

async fn vault_token(client: &Client, vault_addr: &str) -> anyhow::Result<String> {
  if let Ok(token) = std::env::var("VAULT_TOKEN")
    && !token.is_empty()
  {
    return Ok(token);
  }

  let auth_method = std::env::var("VAULT_AUTH_METHOD").unwrap_or_else(|_| "kubernetes".to_string());
  if auth_method != "kubernetes" {
    return Err(anyhow::anyhow!(
      "VAULT_TOKEN is missing and VAULT_AUTH_METHOD={} is unsupported",
      auth_method
    ));
  }

  let role = std::env::var("VAULT_K8S_ROLE")
    .or_else(|_| std::env::var("VAULT_ROLE"))
    .map_err(|_| anyhow::anyhow!("VAULT_K8S_ROLE is required for Kubernetes Vault auth"))?;
  let auth_mount =
    std::env::var("VAULT_K8S_AUTH_MOUNT").unwrap_or_else(|_| "kubernetes".to_string());
  let jwt_path = std::env::var("VAULT_K8S_JWT_PATH")
    .unwrap_or_else(|_| "/var/run/secrets/kubernetes.io/serviceaccount/token".to_string());
  let jwt = std::fs::read_to_string(jwt_path)?.trim().to_string();

  let url = format!("{}/v1/auth/{}/login", vault_addr, auth_mount);
  let response = client
    .post(url)
    .json(&serde_json::json!({
      "role": role,
      "jwt": jwt,
    }))
    .send()
    .await?;

  if !response.status().is_success() {
    return Err(anyhow::anyhow!(
      "vault returned status {} while authenticating with Kubernetes",
      response.status()
    ));
  }

  let payload: VaultAuthEnvelope = response.json().await?;
  Ok(payload.auth.client_token)
}
