#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/.env}"
ENV_EXAMPLE_FILE="${SCRIPT_DIR}/.env.example"

NAMESPACE="${VAULT_NAMESPACE:-vault}"
POD="${VAULT_POD:-vault-0}"
VAULT_ADDR_IN_POD="${VAULT_ADDR_IN_POD:-http://127.0.0.1:18200}"
KV_MOUNT="${KV_MOUNT:-secret}"
PROJECT="${PROJECT:-let-note}"
POLICY_NAME="${POLICY_NAME:-let-note-read}"
TOKEN_TTL="${TOKEN_TTL:-720h}"

vault_exec() {
  local cmd="$1"
  kubectl -n "${NAMESPACE}" exec -i "${POD}" -- sh -c "export VAULT_ADDR=${VAULT_ADDR_IN_POD} && ${cmd}"
}

vault_exec_auth() {
  local cmd="$1"
  kubectl -n "${NAMESPACE}" exec -i "${POD}" -- sh -c "export VAULT_ADDR=${VAULT_ADDR_IN_POD} VAULT_TOKEN=${VAULT_ROOT_TOKEN} && ${cmd}"
}

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Erreur: variable manquante ${name}"
    exit 1
  fi
}

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Erreur: kubectl requis."
  exit 1
fi

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
elif [ -f "${ENV_EXAMPLE_FILE}" ]; then
  echo "Info: ${ENV_FILE} introuvable, chargement de ${ENV_EXAMPLE_FILE}"
  set -a
  # shellcheck disable=SC1090
  source "${ENV_EXAMPLE_FILE}"
  set +a
else
  echo "Erreur: aucun fichier .env trouve (${ENV_FILE})."
  exit 1
fi

echo "==> Saisir le root token Vault"
read -r -s -p "VAULT_ROOT_TOKEN: " VAULT_ROOT_TOKEN
echo
if [ -z "${VAULT_ROOT_TOKEN}" ]; then
  echo "Erreur: token vide."
  exit 1
fi

echo "==> Verification login root"
vault_exec "VAULT_TOKEN=\"${VAULT_ROOT_TOKEN}\" vault token lookup >/dev/null"

if ! vault_exec_auth "vault secrets list -format=json" | grep -q "\"${KV_MOUNT}/\""; then
  echo "==> Activation KV v2 (${KV_MOUNT}/)"
  vault_exec_auth "vault secrets enable -path=${KV_MOUNT} kv-v2"
else
  echo "==> KV ${KV_MOUNT}/ deja actif"
fi

echo "==> Charger les variables applicatives"
echo "Format attendu: DEV_*, STAGING_*, PROD_*"
echo "Ex: DEV_PS_BDD_SERVER, DEV_JWT_SECRET, ..."

for env in DEV STAGING PROD; do
  for key in PS_BDD_SERVER PS_BDD_PORT PS_BDD_DB PS_BDD_USER PS_BDD_PASS JWT_SECRET COOKIE_SECURE; do
    var="${env}_${key}"
    require_var "${var}"
  done
done

echo "==> Ecriture secrets ${PROJECT}/dev"
vault_exec_auth "vault kv put ${KV_MOUNT}/${PROJECT}/dev \
PS_BDD_SERVER='${DEV_PS_BDD_SERVER}' \
PS_BDD_PORT='${DEV_PS_BDD_PORT}' \
PS_BDD_DB='${DEV_PS_BDD_DB}' \
PS_BDD_USER='${DEV_PS_BDD_USER}' \
PS_BDD_PASS='${DEV_PS_BDD_PASS}' \
JWT_SECRET='${DEV_JWT_SECRET}' \
COOKIE_SECURE='${DEV_COOKIE_SECURE}'"

echo "==> Ecriture secrets ${PROJECT}/staging"
vault_exec_auth "vault kv put ${KV_MOUNT}/${PROJECT}/staging \
PS_BDD_SERVER='${STAGING_PS_BDD_SERVER}' \
PS_BDD_PORT='${STAGING_PS_BDD_PORT}' \
PS_BDD_DB='${STAGING_PS_BDD_DB}' \
PS_BDD_USER='${STAGING_PS_BDD_USER}' \
PS_BDD_PASS='${STAGING_PS_BDD_PASS}' \
JWT_SECRET='${STAGING_JWT_SECRET}' \
COOKIE_SECURE='${STAGING_COOKIE_SECURE}'"

echo "==> Ecriture secrets ${PROJECT}/prod"
vault_exec_auth "vault kv put ${KV_MOUNT}/${PROJECT}/prod \
PS_BDD_SERVER='${PROD_PS_BDD_SERVER}' \
PS_BDD_PORT='${PROD_PS_BDD_PORT}' \
PS_BDD_DB='${PROD_PS_BDD_DB}' \
PS_BDD_USER='${PROD_PS_BDD_USER}' \
PS_BDD_PASS='${PROD_PS_BDD_PASS}' \
JWT_SECRET='${PROD_JWT_SECRET}' \
COOKIE_SECURE='${PROD_COOKIE_SECURE}'"

echo "==> Creation policy ${POLICY_NAME}"
vault_exec_auth "cat > /tmp/${POLICY_NAME}.hcl <<'HCL'
path \"${KV_MOUNT}/data/${PROJECT}/*\" {
  capabilities = [\"read\"]
}
path \"${KV_MOUNT}/metadata/${PROJECT}/*\" {
  capabilities = [\"read\"]
}
HCL
vault policy write ${POLICY_NAME} /tmp/${POLICY_NAME}.hcl
rm -f /tmp/${POLICY_NAME}.hcl"

echo "==> Creation token applicatif"
APP_TOKEN="$(vault_exec_auth "vault token create -policy=${POLICY_NAME} -ttl=${TOKEN_TTL} -field=token")"

echo
echo "Setup termine."
echo "VAULT_APP_TOKEN=${APP_TOKEN}"
