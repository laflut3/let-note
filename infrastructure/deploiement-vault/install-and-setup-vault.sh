#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELM_VALUES_PATH="${SCRIPT_DIR}/helm/values.yaml"
NAMESPACE="${VAULT_NAMESPACE:-vault}"
STATEFULSET="${VAULT_STATEFULSET:-vault}"
HELM_RELEASE_NAME="${HELM_RELEASE_NAME:-vault}"
HELM_CHART_REF="${HELM_CHART_REF:-hashicorp/vault}"
VAULT_ADDR_IN_POD="${VAULT_ADDR_IN_POD:-http://127.0.0.1:18200}"
KV_MOUNT="${KV_MOUNT:-secret}"
PROJECT_NAME="${PROJECT_NAME:-let-note}"
APP_POLICY_NAME="${APP_POLICY_NAME:-${PROJECT_NAME}-read}"
APP_TOKEN_TTL="${APP_TOKEN_TTL:-720h}"
VAULT_PUBLIC_URL="${VAULT_PUBLIC_URL:-https://vault.127.0.0.1.nip.io}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Erreur: kubectl est requis."
  exit 1
fi

if ! command -v helm >/dev/null 2>&1; then
  echo "Erreur: helm est requis."
  exit 1
fi

if [ ! -f "${HELM_VALUES_PATH}" ]; then
  echo "Erreur: fichier values introuvable: ${HELM_VALUES_PATH}"
  exit 1
fi

vault_exec() {
  local cmd="$1"
  kubectl -n "${NAMESPACE}" exec "statefulset/${STATEFULSET}" -- sh -c "export VAULT_ADDR=${VAULT_ADDR_IN_POD} && ${cmd}"
}

vault_exec_auth() {
  local cmd="$1"
  kubectl -n "${NAMESPACE}" exec "statefulset/${STATEFULSET}" -- sh -c "export VAULT_ADDR=${VAULT_ADDR_IN_POD} VAULT_TOKEN=${AUTH_TOKEN} && ${cmd}"
}

wait_for_vault_pod() {
  local attempts=120
  local sleep_s=2
  local i=1
  echo "==> Attente du pod Vault"
  while [ "${i}" -le "${attempts}" ]; do
    if kubectl -n "${NAMESPACE}" get pod "${STATEFULSET}-0" >/dev/null 2>&1; then
      if kubectl -n "${NAMESPACE}" exec "${STATEFULSET}-0" -- sh -c "echo ok" >/dev/null 2>&1; then
        return 0
      fi
    fi
    sleep "${sleep_s}"
    i=$((i + 1))
  done
  echo "Erreur: pod ${STATEFULSET}-0 non pret pour exec apres attente."
  exit 1
}

status_field() {
  local field="$1"
  kubectl -n "${NAMESPACE}" exec "statefulset/${STATEFULSET}" -- sh -c \
    "export VAULT_ADDR=${VAULT_ADDR_IN_POD} && vault status -format=json || true" \
    | sed -n "s/.*\"${field}\":[[:space:]]*\\([^,}]*\\).*/\\1/p" | head -n 1
}

unseal_once() {
  local key="$1"
  vault_exec "vault operator unseal \"${key}\""
}

echo "==> Deployment Vault via Helm"
helm repo add hashicorp https://helm.releases.hashicorp.com >/dev/null 2>&1 || true
helm repo update hashicorp >/dev/null
helm upgrade --install "${HELM_RELEASE_NAME}" "${HELM_CHART_REF}" \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  -f "${HELM_VALUES_PATH}"
wait_for_vault_pod
kubectl -n "${NAMESPACE}" get ingress vault >/dev/null 2>&1 || true

initialized="$(status_field "initialized" || true)"
if [ "${initialized}" != "true" ]; then
  echo
  echo "==> Vault non initialise: lancement de 'vault operator init'"
  echo "IMPORTANT: sauvegarde les cles + root token hors Git."
  vault_exec "vault operator init"
else
  echo "==> Vault deja initialise"
fi

sealed="$(status_field "sealed" || true)"
if [ "${sealed}" = "true" ]; then
  echo
  echo "==> Vault est scelle. Entrez 3 cles d'unseal."
  echo "Utilise les vraies cles donnees par 'vault operator init'."
  vault_exec "vault operator unseal -reset" >/dev/null 2>&1 || true

  for i in 1 2 3; do
    read -r -s -p "Unseal key ${i}: " raw_key
    echo
    key="$(printf '%s' "${raw_key}" | tr -d '[:space:]')"
    if [[ -z "${key}" ]]; then
      echo "Erreur: cle vide."
      exit 1
    fi
    if ! unseal_once "${key}"; then
      echo "Erreur: echec unseal sur la cle ${i}."
      echo "Conseil: verifier la cle, puis recommencer avec 3 cles valides."
      exit 1
    fi
  done
fi

sealed="$(status_field "sealed" || true)"
if [ "${sealed}" = "true" ]; then
  echo "Erreur: Vault est encore scelle apres 3 cles."
  exit 1
fi

echo "==> Vault unsealed"

echo "==> Verification login"
AUTH_TOKEN=""
for attempt in 1 2 3; do
  read -r -s -p "Root token Vault (tentative ${attempt}/3): " root_token
  echo
  if [[ -z "${root_token}" ]]; then
    echo "Token vide."
    continue
  fi
  if vault_exec "VAULT_TOKEN=\"${root_token}\" vault token lookup >/dev/null"; then
    AUTH_TOKEN="${root_token}"
    break
  fi
  if [ "${attempt}" -eq 3 ]; then
    echo "Erreur: token root invalide apres 3 tentatives."
    exit 1
  fi
done

if [ -z "${AUTH_TOKEN}" ]; then
  echo "Erreur: impossible de valider un token root."
  exit 1
fi

if ! vault_exec_auth "vault secrets list -format=json" | grep -q "\"${KV_MOUNT}/\""; then
  echo "==> Activation KV v2 sur '${KV_MOUNT}/'"
  vault_exec_auth "vault secrets enable -path=${KV_MOUNT} kv-v2"
else
  echo "==> KV '${KV_MOUNT}/' deja actif"
fi

if ! vault_exec_auth "vault audit list -format=json" | grep -q "\"stdout/\""; then
  echo "==> Activation audit logs (stdout)"
  vault_exec_auth "vault audit enable file file_path=stdout"
else
  echo "==> Audit stdout deja actif"
fi

echo "==> Creation policy '${APP_POLICY_NAME}' pour projet '${PROJECT_NAME}'"
vault_exec_auth "cat > /tmp/${APP_POLICY_NAME}.hcl <<'HCL'
path \"${KV_MOUNT}/data/${PROJECT_NAME}/*\" {
  capabilities = [\"read\"]
}
path \"${KV_MOUNT}/metadata/${PROJECT_NAME}/*\" {
  capabilities = [\"read\"]
}
HCL
vault policy write ${APP_POLICY_NAME} /tmp/${APP_POLICY_NAME}.hcl
rm -f /tmp/${APP_POLICY_NAME}.hcl"

echo "==> Creation token applicatif (ttl=${APP_TOKEN_TTL})"
app_token="$(vault_exec_auth "vault token create -policy=${APP_POLICY_NAME} -ttl=${APP_TOKEN_TTL} -field=token")"

echo
echo "Setup termine."
echo "Namespace      : ${NAMESPACE}"
echo "Vault addr pod : ${VAULT_ADDR_IN_POD}"
echo "KV mount       : ${KV_MOUNT}"
echo "Projet         : ${PROJECT_NAME}"
echo "Policy         : ${APP_POLICY_NAME}"
echo "App token      : ${app_token}"
echo "UI/API URL     : ${VAULT_PUBLIC_URL}"
echo
echo "Exporter pour ton app:"
echo "export VAULT_APP_TOKEN='${app_token}'"
