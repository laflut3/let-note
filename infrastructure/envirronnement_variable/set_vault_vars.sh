#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

usage() {
  cat <<USAGE
Usage:
  ./set_vault_vars.sh <dev|stagging|prod|all>

Examples:
  ./set_vault_vars.sh dev
  ./set_vault_vars.sh all
USAGE
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur: fichier introuvable: $ENV_FILE" >&2
  echo "Copie .env.exemple vers .env puis remplis les valeurs." >&2
  exit 1
fi

get_var() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)"
  if [ -z "$line" ]; then
    return 1
  fi
  printf '%s' "${line#*=}"
}

must_get() {
  local key="$1"
  local value
  if ! value="$(get_var "$key")"; then
    echo "Erreur: variable manquante dans .env: $key" >&2
    exit 1
  fi
  printf '%s' "$value"
}

vault_exec() {
  local vault_addr="$1"
  local vault_token="$2"
  shift
  shift

  if command -v vault >/dev/null 2>&1; then
    VAULT_ADDR="$vault_addr" VAULT_TOKEN="$vault_token" vault "$@"
    return
  fi

  if ! command -v kubectl >/dev/null 2>&1; then
    echo "Erreur: ni 'vault' ni 'kubectl' n'est disponible." >&2
    exit 1
  fi

  local ns pod
  pod="$(get_var VAULT_K8S_POD || printf '%s' "vault-0")"

  if ns="$(get_var VAULT_K8S_NAMESPACE 2>/dev/null)"; then
    :
  elif kubectl get pod -n vault "$pod" >/dev/null 2>&1; then
    ns="vault"
  elif kubectl get pod -n default "$pod" >/dev/null 2>&1; then
    ns="default"
  else
    echo "Erreur: impossible de trouver le pod '$pod' (ns testés: vault, default)." >&2
    echo "Definis VAULT_K8S_NAMESPACE et VAULT_K8S_POD dans .env." >&2
    exit 1
  fi

  kubectl exec -i -n "$ns" "$pod" -- env VAULT_ADDR="$vault_addr" VAULT_TOKEN="$vault_token" vault "$@"
}

push_env() {
  local env_name="$1"   # dev|stagging|prod
  local suffix="$2"     # DEV|STAGGING|PROD

  local vault_addr vault_token kv_mount secret_path
  local ps_db ps_user ps_pass ps_port jwt cookie

  vault_addr="$(must_get VAULT_ADDR)"
  vault_token="$(must_get VAULT_TOKEN)"
  kv_mount="$(must_get VAULT_KV_MOUNT)"
  secret_path="$(must_get VAULT_SECRET_PATH_${suffix})"

  ps_db="$(must_get PS_BDD_DB_${suffix})"
  ps_user="$(must_get PS_BDD_USER_${suffix})"
  ps_pass="$(must_get PS_BDD_PASS_${suffix})"
  ps_port="$(must_get PS_BDD_PORT_${suffix})"
  jwt="$(must_get JWT_SECRET_${suffix})"
  cookie="$(must_get COOKIE_SECURE_${suffix})"

  vault_exec "$vault_addr" "$vault_token" kv put "${kv_mount}/${secret_path}" \
    PS_BDD_DB="$ps_db" \
    PS_BDD_USER="$ps_user" \
    PS_BDD_PASS="$ps_pass" \
    PS_BDD_PORT="$ps_port" \
    JWT_SECRET="$jwt" \
    COOKIE_SECURE="$cookie" >/dev/null

  echo "OK: $env_name -> ${kv_mount}/${secret_path}"
}

TARGET="${1:-}"
case "$TARGET" in
  dev)
    push_env dev DEV
    ;;
  stagging)
    push_env stagging STAGGING
    ;;
  prod)
    push_env prod PROD
    ;;
  all)
    push_env dev DEV
    push_env stagging STAGGING
    push_env prod PROD
    ;;
  *)
    usage
    exit 1
    ;;
esac
