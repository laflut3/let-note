#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TARGET="${1:-}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-180s}"
BACKEND_IMAGE_REPO="ghcr.io/laflut3/let-note-backend"
FRONTEND_IMAGE_REPO="ghcr.io/laflut3/let-note-frontend"
MIGRATIONS_DIR="${REPO_ROOT}/infrastructure/BDD/migration"
CLI_VERSION=""
CLI_ARCH=""

if [ -t 1 ]; then
  C_RESET="$(printf '\033[0m')"
  C_INFO="$(printf '\033[90m')"
  C_WARN="$(printf '\033[33m')"
  C_ERR="$(printf '\033[31m')"
  C_OK="$(printf '\033[32m')"
else
  C_RESET=""
  C_INFO=""
  C_WARN=""
  C_ERR=""
  C_OK=""
fi

info() { printf '%b\n' "${C_INFO}[INFO]${C_RESET} $*"; }
warn() { printf '%b\n' "${C_WARN}[WARN]${C_RESET} $*"; }
ok() { printf '%b\n' "${C_OK}[OK]${C_RESET} $*"; }
err() { printf '%b\n' "${C_ERR}[ERR]${C_RESET} $*" >&2; }

load_env_file() {
  local env_file="$1"
  if [ -f "${env_file}" ]; then
    info "Load env file: ${env_file}"
    set -a
    # shellcheck disable=SC1090
    . "${env_file}"
    set +a
  fi
}

escape_sed_replacement() {
  printf '%s' "$1" | sed 's/[&|]/\\&/g'
}

if ! command -v kubectl >/dev/null 2>&1; then
  err "kubectl est requis."
  exit 1
fi

usage() {
  cat <<EOF
Usage: $0 [all|dev|staging|prod] [--version <semver>] [--arch <multi|amd64|arm64>]

Exemples:
  $0 prod --version 1.0.0 --arch multi
  $0 staging --version 1.0.0 --arch amd64
  $0 all
EOF
}

choose_target_interactive() {
  local options=("dev" "staging" "prod" "all")
  info "Aucun environnement fourni. Choisissez une cible:"
  select choice in "${options[@]}"; do
    case "${choice}" in
      dev|staging|prod|all)
        TARGET="${choice}"
        ok "Cible selectionnee: ${TARGET}"
        break
        ;;
      *)
        warn "Choix invalide. Reessayez."
        ;;
    esac
  done
}

if [[ "${TARGET}" == "-h" || "${TARGET}" == "--help" ]]; then
  usage
  exit 0
fi

if [ -z "${TARGET}" ]; then
  if [ -t 0 ]; then
    choose_target_interactive
  else
    err "Aucun environnement fourni."
    usage
    exit 1
  fi
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
      err "Argument inconnu: $1"
      usage
      exit 1
      ;;
  esac
done

# Load deployment env file only (root of deployment folder).
load_env_file "${SCRIPT_DIR}/.env"

# Compatibility: allow using VAULT_TOKEN in .env.
if [ -z "${VAULT_APP_TOKEN:-}" ] && [ -n "${VAULT_TOKEN:-}" ]; then
  VAULT_APP_TOKEN="${VAULT_TOKEN}"
fi

if [ -z "${VAULT_APP_TOKEN:-}" ]; then
  err "VAULT_APP_TOKEN introuvable (.env, env vars)."
  info "Definis VAULT_APP_TOKEN (ou VAULT_TOKEN) dans .env ou l'environnement."
  exit 1
fi

if [ -n "${CLI_VERSION}" ] && [[ ! "${CLI_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  err "Version invalide '${CLI_VERSION}' (ex: 0.1.0)"
  exit 1
fi

if [ -n "${CLI_ARCH}" ] && [[ "${CLI_ARCH}" != "multi" && "${CLI_ARCH}" != "amd64" && "${CLI_ARCH}" != "arm64" ]]; then
  err "Arch invalide '${CLI_ARCH}'"
  info "Valeurs autorisees: multi, amd64, arm64"
  exit 1
fi

IMAGE_VERSION="${CLI_VERSION:-${LET_NOTE_VERSION:-}}"
if [ -z "${IMAGE_VERSION}" ]; then
  err "Version image introuvable."
  info "Definis --version <x.y.z> ou LET_NOTE_VERSION dans infrastructure/deployment/.env"
  exit 1
fi

IMAGE_ARCH="${CLI_ARCH:-${LET_NOTE_ARCH:-amd64}}"
case "${IMAGE_ARCH}" in
  multi)
    IMAGE_TAG="${IMAGE_VERSION}"
    ;;
  amd64|arm64)
    IMAGE_TAG="${IMAGE_VERSION}-${IMAGE_ARCH}"
    ;;
  *)
    err "Arch invalide: ${IMAGE_ARCH}"
    info "Valeurs autorisees: multi, amd64, arm64"
    exit 1
    ;;
esac

deploy_env() {
  local env="$1"
  local overlay="${SCRIPT_DIR}/environments/${env}"
  local escaped_token=""
  local escaped_vault_secret_path=""
  local upper_env=""
  local env_path_var=""
  local vault_secret_path=""
  local backend_expected="${BACKEND_IMAGE_REPO}:${IMAGE_TAG}"
  local front_expected="${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}"
  local backend_images=""
  local front_images=""

  if [ ! -d "${overlay}" ]; then
    err "Overlay introuvable ${overlay}"
    exit 1
  fi

  escaped_token="$(escape_sed_replacement "${VAULT_APP_TOKEN}")"

  upper_env="$(printf '%s' "${env}" | tr '[:lower:]' '[:upper:]')"
  env_path_var="VAULT_SECRET_PATH_${upper_env}"
  vault_secret_path="${!env_path_var:-}"
  if [ -z "${vault_secret_path}" ] && [ "${env}" = "staging" ]; then
    # Backward compatibility with previous typo.
    vault_secret_path="${VAULT_SECRET_PATH_STAGGING:-}"
  fi
  if [ -z "${vault_secret_path}" ]; then
    vault_secret_path="let-note/${env}"
  fi
  escaped_vault_secret_path="$(escape_sed_replacement "${vault_secret_path}")"

  info "Deploy ${env} (tag=${IMAGE_TAG}, arch=${IMAGE_ARCH}, vault_path=${vault_secret_path})"
  kubectl kustomize "${overlay}" \
    | sed "s|${BACKEND_IMAGE_REPO}:latest|${BACKEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|${FRONTEND_IMAGE_REPO}:latest|${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|value: let-note/${env}|value: ${escaped_vault_secret_path}|g" \
    | sed "s|\${VAULT_APP_TOKEN}|${escaped_token}|g" \
    | kubectl apply -f -

  info "Rollout status postgres ${env}"
  kubectl -n "${env}" rollout status deploy/postgres --timeout="${WAIT_TIMEOUT}"

  if [ -d "${MIGRATIONS_DIR}" ]; then
    info "Apply SQL migrations ${env}"
    migrated_count=0
    while IFS= read -r -d '' migration_file; do
      info "  -> $(basename "${migration_file}")"
      kubectl -n "${env}" exec deploy/postgres -- sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${migration_file}"
      migrated_count=$((migrated_count + 1))
    done < <(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name "*.up.sql" -print0 | sort -z)

    if [ "${migrated_count}" -eq 0 ]; then
      warn "Aucun fichier *.up.sql trouve dans ${MIGRATIONS_DIR}"
    fi
  fi

  info "Verify database schema ${env}"
  kubectl -n "${env}" exec deploy/postgres -- sh -c '
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
      CREATE TABLE IF NOT EXISTS etudiant (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        date_naissance DATE NOT NULL,
        mot_de_passe TEXT NOT NULL
      );
      ALTER TABLE etudiant
      ADD COLUMN IF NOT EXISTS mot_de_passe TEXT NOT NULL DEFAULT '\'''\'';"
  '

  info "Rollout status ${env}"
  kubectl -n "${env}" rollout status deploy/backend --timeout="${WAIT_TIMEOUT}"
  kubectl -n "${env}" rollout status deploy/front --timeout="${WAIT_TIMEOUT}"

  backend_images="$(kubectl -n "${env}" get pods -l app=backend -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"
  front_images="$(kubectl -n "${env}" get pods -l app=front -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"

  if [ "${backend_images}" != "${backend_expected}" ]; then
    err "Images backend deployees inattendues en ${env}"
    info "Attendu: ${backend_expected}"
    info "Observe:"
    printf '%s\n' "${backend_images}"
    exit 1
  fi

  if [ "${front_images}" != "${front_expected}" ]; then
    err "Images frontend deployees inattendues en ${env}"
    info "Attendu: ${front_expected}"
    info "Observe:"
    printf '%s\n' "${front_images}"
    exit 1
  fi

  ok "Deploiement valide sur ${env}"
  info "Etat ${env}"
  kubectl -n "${env}" get deploy,pods,svc,ingress
}

info "Apply namespaces/quotas"
kubectl apply -f "${SCRIPT_DIR}/cluster/namespaces.yaml"
kubectl apply -f "${SCRIPT_DIR}/cluster/quotas-limits.yaml"
info "Image version: ${IMAGE_VERSION}"
info "Image arch: ${IMAGE_ARCH}"
info "Image tag used: ${IMAGE_TAG}"

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
    err "Cible invalide: ${TARGET}"
    usage
    exit 1
    ;;
esac

ok "Deploiement termine (${TARGET})"
