#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-all}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-180s}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Erreur: kubectl est requis."
  exit 1
fi

if [ -z "${VAULT_APP_TOKEN:-}" ]; then
  echo "Erreur: VAULT_APP_TOKEN n'est pas exporte."
  echo "Exemple: export VAULT_APP_TOKEN='<token-let-note-read>'"
  exit 1
fi

deploy_env() {
  local env="$1"
  local overlay="${SCRIPT_DIR}/environments/${env}"

  if [ ! -d "${overlay}" ]; then
    echo "Erreur: overlay introuvable ${overlay}"
    exit 1
  fi

  echo "==> Deploy ${env}"
  kubectl apply -k "${overlay}"

  echo "==> Rollout status ${env}"
  kubectl -n "${env}" rollout status deploy/backend --timeout="${WAIT_TIMEOUT}"
  kubectl -n "${env}" rollout status deploy/frontend --timeout="${WAIT_TIMEOUT}"

  echo "==> Etat ${env}"
  kubectl -n "${env}" get deploy,pods,svc,ingress
}

echo "==> Apply namespaces/quotas"
kubectl apply -f "${SCRIPT_DIR}/cluster/namespaces.yaml"
kubectl apply -f "${SCRIPT_DIR}/cluster/quotas-limits.yaml"

case "${TARGET}" in
  all)
    deploy_env dev
    deploy_env staging
    deploy_env prod
    ;;
  dev|staging|prod)
    deploy_env "${TARGET}"
    ;;
  *)
    echo "Usage: $0 [all|dev|staging|prod]"
    exit 1
    ;;
esac

echo "==> Deploiement termine (${TARGET})"
