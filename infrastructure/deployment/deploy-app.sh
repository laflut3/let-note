#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${REPO_ROOT}/config-let-note.toml"
TARGET="${1:-all}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-180s}"
BACKEND_IMAGE_REPO="ghcr.io/laflut3/let-note-backend"
FRONTEND_IMAGE_REPO="ghcr.io/laflut3/let-note-frontend"
CLI_VERSION=""
CLI_ARCH=""

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Erreur: kubectl est requis."
  exit 1
fi

if [ -z "${VAULT_APP_TOKEN:-}" ]; then
  echo "Erreur: VAULT_APP_TOKEN n'est pas exporte."
  echo "Exemple: export VAULT_APP_TOKEN='<token-let-note-read>'"
  exit 1
fi

usage() {
  cat <<EOF
Usage: $0 [all|dev|staging|prod] [--version <semver>] [--arch <multi|amd64|arm64>]

Exemples:
  $0 prod --version 0.1.0 --arch multi
  $0 staging --version 0.1.0 --arch amd64
  $0 all
EOF
}

if [[ "${TARGET}" == "-h" || "${TARGET}" == "--help" ]]; then
  usage
  exit 0
fi

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      CLI_VERSION="${2:-}"
      shift 2
      ;;
    --arch)
      CLI_ARCH="${2:-}"
      shift 2
      ;;
    *)
      echo "Erreur: argument inconnu: $1"
      usage
      exit 1
      ;;
  esac
done

if [ -n "${CLI_VERSION}" ] && [[ ! "${CLI_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Erreur: version invalide '${CLI_VERSION}' (ex: 0.1.0)"
  exit 1
fi

if [ -n "${CLI_ARCH}" ] && [[ "${CLI_ARCH}" != "multi" && "${CLI_ARCH}" != "amd64" && "${CLI_ARCH}" != "arm64" ]]; then
  echo "Erreur: arch invalide '${CLI_ARCH}'"
  echo "Valeurs autorisees: multi, amd64, arm64"
  exit 1
fi

if [ -f "${CONFIG_FILE}" ]; then
  CONFIG_VERSION="$(sed -n 's/^[[:space:]]*version[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "${CONFIG_FILE}" | head -n1)"
  CONFIG_ARCH="$(sed -n 's/^[[:space:]]*arch[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "${CONFIG_FILE}" | head -n1)"
else
  CONFIG_VERSION=""
  CONFIG_ARCH=""
fi

IMAGE_VERSION="${CLI_VERSION:-${LET_NOTE_VERSION:-${CONFIG_VERSION:-}}}"
if [ -z "${IMAGE_VERSION}" ]; then
  echo "Erreur: version image introuvable."
  echo "Definis --version <x.y.z>, LET_NOTE_VERSION, ou version dans ${CONFIG_FILE}"
  exit 1
fi

IMAGE_ARCH="${CLI_ARCH:-${LET_NOTE_ARCH:-${CONFIG_ARCH:-amd64}}}"
case "${IMAGE_ARCH}" in
  multi)
    IMAGE_TAG="${IMAGE_VERSION}"
    ;;
  amd64|arm64)
    IMAGE_TAG="${IMAGE_VERSION}-${IMAGE_ARCH}"
    ;;
  *)
    echo "Erreur: arch invalide: ${IMAGE_ARCH}"
    echo "Valeurs autorisees: multi, amd64, arm64"
    exit 1
    ;;
esac

deploy_env() {
  local env="$1"
  local overlay="${SCRIPT_DIR}/environments/${env}"
  local escaped_token=""
  local backend_expected="${BACKEND_IMAGE_REPO}:${IMAGE_TAG}"
  local front_expected="${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}"
  local backend_images=""
  local front_images=""

  if [ ! -d "${overlay}" ]; then
    echo "Erreur: overlay introuvable ${overlay}"
    exit 1
  fi

  escaped_token="$(printf '%s' "${VAULT_APP_TOKEN}" | sed 's/[&|]/\\&/g')"

  echo "==> Deploy ${env} (tag=${IMAGE_TAG}, arch=${IMAGE_ARCH})"
  kubectl kustomize "${overlay}" \
    | sed "s|${BACKEND_IMAGE_REPO}:latest|${BACKEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|${FRONTEND_IMAGE_REPO}:latest|${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|\${VAULT_APP_TOKEN}|${escaped_token}|g" \
    | kubectl apply -f -

  echo "==> Rollout status ${env}"
  kubectl -n "${env}" rollout status deploy/backend --timeout="${WAIT_TIMEOUT}"
  kubectl -n "${env}" rollout status deploy/front --timeout="${WAIT_TIMEOUT}"

  backend_images="$(kubectl -n "${env}" get pods -l app=backend -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"
  front_images="$(kubectl -n "${env}" get pods -l app=front -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"

  if [ "${backend_images}" != "${backend_expected}" ]; then
    echo "Erreur: images backend deployees inattendues en ${env}"
    echo "Attendu: ${backend_expected}"
    echo "Observe:"
    printf '%s\n' "${backend_images}"
    exit 1
  fi

  if [ "${front_images}" != "${front_expected}" ]; then
    echo "Erreur: images frontend deployees inattendues en ${env}"
    echo "Attendu: ${front_expected}"
    echo "Observe:"
    printf '%s\n' "${front_images}"
    exit 1
  fi

  echo "==> Etat ${env}"
  kubectl -n "${env}" get deploy,pods,svc,ingress
}

echo "==> Apply namespaces/quotas"
kubectl apply -f "${SCRIPT_DIR}/cluster/namespaces.yaml"
kubectl apply -f "${SCRIPT_DIR}/cluster/quotas-limits.yaml"
echo "==> Image version: ${IMAGE_VERSION}"
echo "==> Image arch: ${IMAGE_ARCH}"
echo "==> Image tag used: ${IMAGE_TAG}"

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
