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
SKIP_VAULT_SYNC="false"
FORCE_VAULT_SYNC="false"

if [ -t 1 ]; then
  C_RESET="$(printf '\033[0m')"
  C_DIM="$(printf '\033[2m')"
  C_INFO="$(printf '\033[36m')"
  C_WARN="$(printf '\033[33m')"
  C_ERR="$(printf '\033[31m')"
  C_OK="$(printf '\033[32m')"
  C_TITLE="$(printf '\033[1;35m')"
else
  C_RESET=""
  C_DIM=""
  C_INFO=""
  C_WARN=""
  C_ERR=""
  C_OK=""
  C_TITLE=""
fi

title() { printf '\n%b%s%b\n' "${C_TITLE}" "$*" "${C_RESET}"; }
info() { printf '%b\n' "${C_INFO}[INFO]${C_RESET} $*"; }
warn() { printf '%b\n' "${C_WARN}[WARN]${C_RESET} $*"; }
ok() { printf '%b\n' "${C_OK}[ OK ]${C_RESET} $*"; }
err() { printf '%b\n' "${C_ERR}[ERR ]${C_RESET} $*" >&2; }
sub() { printf '%b\n' "${C_DIM}  -> $*${C_RESET}"; }

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

usage() {
  cat <<USAGE
Usage: $0 [all|dev|staging|prod] [--version <semver>] [--arch <multi|amd64|arm64>] [--skip-vault-sync] [--force-vault-sync]

Examples:
  $0 all
  $0 dev --version 1.0.0 --arch amd64
  $0 prod --version 1.0.0 --arch multi
  $0 staging --skip-vault-sync
  $0 dev --force-vault-sync
USAGE
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || {
    err "Commande requise manquante: ${cmd}"
    exit 1
  }
}

env_or_fail() {
  local key="$1"
  local val="${!key:-}"
  if [ -z "${val}" ]; then
    err "Variable requise manquante: ${key}"
    exit 1
  fi
  printf '%s' "${val}"
}

vault_cli_safe_value() {
  local value="$1"
  # Vault CLI treats values starting with '@' as file paths (key=@file).
  # Escape leading '@' to force literal string.
  if [[ "${value}" == @* ]]; then
    printf '\\%s' "${value}"
  else
    printf '%s' "${value}"
  fi
}

vault_exec() {
  local vault_addr="$1"
  local vault_token="$2"
  shift 2

  if command -v vault >/dev/null 2>&1; then
    VAULT_ADDR="${vault_addr}" VAULT_TOKEN="${vault_token}" vault "$@"
    return
  fi

  local ns pod
  ns="${VAULT_K8S_NAMESPACE:-default}"
  pod="${VAULT_K8S_POD:-vault-0}"
  kubectl exec -i -n "${ns}" "${pod}" -- env VAULT_ADDR="${vault_addr}" VAULT_TOKEN="${vault_token}" vault "$@"
}

vault_put_env() {
  local env_name="$1"
  local suffix="$(printf '%s' "${env_name}" | tr '[:lower:]' '[:upper:]')"
  local path_var="VAULT_SECRET_PATH_${suffix}"

  local kv_mount secret_path
  local ps_server ps_db ps_user ps_pass ps_port jwt cookie
  local admin_email admin_password admin_prenom admin_nom
  local s3_endpoint s3_region s3_bucket s3_access_key s3_secret_key

  kv_mount="$(env_or_fail VAULT_KV_MOUNT)"
  secret_path="${!path_var:-}"
  if [ -z "${secret_path}" ]; then
    if [ "${env_name}" = "staging" ] && [ -n "${VAULT_SECRET_PATH_STAGGING:-}" ]; then
      secret_path="${VAULT_SECRET_PATH_STAGGING}"
    else
      secret_path="let-note/${env_name}"
    fi
  fi

  ps_server="$(env_or_fail PS_BDD_SERVER_${suffix})"
  ps_db="$(env_or_fail PS_BDD_DB_${suffix})"
  ps_user="$(env_or_fail PS_BDD_USER_${suffix})"
  ps_pass="$(env_or_fail PS_BDD_PASS_${suffix})"
  ps_port="$(env_or_fail PS_BDD_PORT_${suffix})"
  jwt="$(env_or_fail JWT_SECRET_${suffix})"
  cookie="$(env_or_fail COOKIE_SECURE_${suffix})"
  admin_email="$(env_or_fail ADMIN_EMAIL_${suffix})"
  admin_password="$(env_or_fail ADMIN_PASSWORD_${suffix})"
  admin_prenom="$(env_or_fail ADMIN_PRENOM_${suffix})"
  admin_nom="$(env_or_fail ADMIN_NOM_${suffix})"
  s3_endpoint="$(env_or_fail S3_ENDPOINT_${suffix})"
  s3_region="$(env_or_fail S3_REGION_${suffix})"
  s3_bucket="$(env_or_fail S3_BUCKET_${suffix})"
  s3_access_key="$(env_or_fail S3_ACCESS_KEY_${suffix})"
  s3_secret_key="$(env_or_fail S3_SECRET_KEY_${suffix})"

  sub "Sync Vault path: ${kv_mount}/${secret_path}"

  local -a all_pairs
  all_pairs=(
    "PS_BDD_SERVER=${ps_server}"
    "PS_BDD_DB=${ps_db}"
    "PS_BDD_USER=${ps_user}"
    "PS_BDD_PASS=$(vault_cli_safe_value "${ps_pass}")"
    "PS_BDD_PORT=${ps_port}"
    "JWT_SECRET=$(vault_cli_safe_value "${jwt}")"
    "COOKIE_SECURE=${cookie}"
    "ADMIN_EMAIL=$(vault_cli_safe_value "${admin_email}")"
    "ADMIN_PASSWORD=$(vault_cli_safe_value "${admin_password}")"
    "ADMIN_PRENOM=$(vault_cli_safe_value "${admin_prenom}")"
    "ADMIN_NOM=$(vault_cli_safe_value "${admin_nom}")"
    "S3_ENDPOINT=$(vault_cli_safe_value "${s3_endpoint}")"
    "S3_REGION=${s3_region}"
    "S3_BUCKET=${s3_bucket}"
    "S3_ACCESS_KEY=$(vault_cli_safe_value "${s3_access_key}")"
    "S3_SECRET_KEY=$(vault_cli_safe_value "${s3_secret_key}")"
  )

  local vault_path_exists="false"
  if vault_exec "${VAULT_ADDR}" "${VAULT_ADMIN_TOKEN}" kv get "${kv_mount}/${secret_path}" >/dev/null 2>&1; then
    vault_path_exists="true"
  fi

  if [ "${FORCE_VAULT_SYNC}" = "true" ] || [ "${vault_path_exists}" = "false" ]; then
    vault_exec "${VAULT_ADDR}" "${VAULT_ADMIN_TOKEN}" kv put "${kv_mount}/${secret_path}" "${all_pairs[@]}" >/dev/null
    ok "Vault variables synchronisees (${FORCE_VAULT_SYNC:+force=on}) pour ${env_name}"
    return
  fi

  local -a missing_pairs
  missing_pairs=()
  local pair key
  for pair in "${all_pairs[@]}"; do
    key="${pair%%=*}"
    if ! vault_exec "${VAULT_ADDR}" "${VAULT_ADMIN_TOKEN}" kv get -field="${key}" "${kv_mount}/${secret_path}" >/dev/null 2>&1; then
      missing_pairs+=("${pair}")
    fi
  done

  if [ "${#missing_pairs[@]}" -eq 0 ]; then
    ok "Vault path deja present, aucune cle manquante (${env_name})"
    return
  fi

  vault_exec "${VAULT_ADDR}" "${VAULT_ADMIN_TOKEN}" kv patch "${kv_mount}/${secret_path}" "${missing_pairs[@]}" >/dev/null
  ok "Vault path complete: ${#missing_pairs[@]} cles ajoutees (${env_name})"
}

ensure_https_tls_secret() {
  local env_name="$1"
  local host="$2"
  local tls_secret="${TLS_SECRET_NAME:-app-tls}"

  if [ "${ENABLE_HTTPS:-false}" != "true" ]; then
    warn "HTTPS desactive (ENABLE_HTTPS!=true), ingress TLS peut rester non fonctionnel."
    return
  fi

  require_cmd openssl
  title "TLS setup ${env_name}"
  sub "Host: ${host}"
  sub "Secret: ${tls_secret}"

  local cert_file key_file
  cert_file="$(mktemp)"
  key_file="$(mktemp)"

  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "${key_file}" \
    -out "${cert_file}" \
    -days "${TLS_CERT_DAYS:-365}" \
    -subj "/CN=${host}" \
    -addext "subjectAltName=DNS:${host}" >/dev/null 2>&1

  kubectl -n "${env_name}" create secret tls "${tls_secret}" \
    --cert="${cert_file}" \
    --key="${key_file}" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  rm -f "${cert_file}" "${key_file}"
  ok "Secret TLS ${tls_secret} pret pour ${env_name}"
}

ensure_db_credentials() {
  local env_name="$1"
  local suffix="$(printf '%s' "${env_name}" | tr '[:lower:]' '[:upper:]')"
  local app_db_user app_db_pass app_db_name escaped_pass

  app_db_user="$(env_or_fail PS_BDD_USER_${suffix})"
  app_db_pass="$(env_or_fail PS_BDD_PASS_${suffix})"
  app_db_name="$(env_or_fail PS_BDD_DB_${suffix})"
  escaped_pass="${app_db_pass//\'/\'\'}"

  title "DB credentials sync ${env_name}"
  sub "Role: ${app_db_user}"
  sub "Database: ${app_db_name}"

  kubectl -n "${env_name}" exec deploy/postgres -- sh -c "
    psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" <<'SQL'
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${app_db_user}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${app_db_user}', '${escaped_pass}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${app_db_user}', '${escaped_pass}');
  END IF;
END
\$\$;
SQL
  "

  kubectl -n "${env_name}" exec deploy/postgres -- sh -c "
    psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \
    \"GRANT CONNECT ON DATABASE \\\"${app_db_name}\\\" TO \\\"${app_db_user}\\\";\"
  " >/dev/null || true

  ok "Postgres credentials alignees pour ${env_name}"
}

if [ -z "${TARGET}" ]; then
  if [ -t 0 ]; then
    title "Selection environnement"
    select choice in dev staging prod all; do
      case "${choice}" in
        dev|staging|prod|all)
          TARGET="${choice}"
          break
          ;;
        *) warn "Choix invalide" ;;
      esac
    done
  else
    usage
    exit 1
  fi
fi

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
    --skip-vault-sync)
      SKIP_VAULT_SYNC="true"
      shift
      ;;
    --force-vault-sync)
      FORCE_VAULT_SYNC="true"
      shift
      ;;
    *)
      err "Argument inconnu: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd kubectl
load_env_file "${SCRIPT_DIR}/.env"

if [ -z "${VAULT_APP_TOKEN:-}" ] && [ -n "${VAULT_TOKEN:-}" ]; then
  VAULT_APP_TOKEN="${VAULT_TOKEN}"
fi
if [ -z "${VAULT_ADMIN_TOKEN:-}" ] && [ -n "${VAULT_TOKEN:-}" ]; then
  VAULT_ADMIN_TOKEN="${VAULT_TOKEN}"
fi

if [ -z "${VAULT_ADDR:-}" ]; then
  VAULT_ADDR="http://vault.default.svc.cluster.local:8200"
fi
if [ -z "${VAULT_KV_MOUNT:-}" ]; then
  VAULT_KV_MOUNT="secret"
fi

if [ -n "${CLI_VERSION}" ] && [[ ! "${CLI_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  err "Version invalide: ${CLI_VERSION}"
  exit 1
fi
if [ -n "${CLI_ARCH}" ] && [[ "${CLI_ARCH}" != "multi" && "${CLI_ARCH}" != "amd64" && "${CLI_ARCH}" != "arm64" ]]; then
  err "Arch invalide: ${CLI_ARCH}"
  exit 1
fi

IMAGE_VERSION="${CLI_VERSION:-${LET_NOTE_VERSION:-}}"
if [ -z "${IMAGE_VERSION}" ]; then
  err "LET_NOTE_VERSION manquante (.env ou --version)"
  exit 1
fi
IMAGE_ARCH="${CLI_ARCH:-${LET_NOTE_ARCH:-amd64}}"
case "${IMAGE_ARCH}" in
  multi) IMAGE_TAG="${IMAGE_VERSION}" ;;
  amd64|arm64) IMAGE_TAG="${IMAGE_VERSION}-${IMAGE_ARCH}" ;;
  *) err "Arch invalide: ${IMAGE_ARCH}"; exit 1 ;;
esac

if [ -z "${VAULT_APP_TOKEN:-}" ]; then
  err "VAULT_APP_TOKEN (ou VAULT_TOKEN) manquant pour injecter secret/vault-app-auth"
  exit 1
fi

sync_vault() {
  local env="$1"
  [ "${SKIP_VAULT_SYNC}" = "true" ] && { warn "Vault sync desactive (--skip-vault-sync)"; return; }
  if [ -z "${VAULT_ADMIN_TOKEN:-}" ]; then
    warn "VAULT_ADMIN_TOKEN absent: sync Vault sautee."
    warn "Definis VAULT_ADMIN_TOKEN (ou VAULT_TOKEN admin) pour automatiser l'ecriture des secrets Vault."
    return
  fi

  title "Vault sync ${env}"
  vault_put_env "${env}"
}

deploy_env() {
  local env="$1"
  local overlay="${SCRIPT_DIR}/environments/${env}"
  local escaped_token escaped_vault_secret_path escaped_vault_addr escaped_ingress_host upper_env env_path_var vault_secret_path ingress_host
  local backend_expected front_expected backend_images front_images

  [ -d "${overlay}" ] || { err "Overlay introuvable: ${overlay}"; exit 1; }

  escaped_token="$(escape_sed_replacement "${VAULT_APP_TOKEN}")"
  escaped_vault_addr="$(escape_sed_replacement "${VAULT_ADDR}")"
  upper_env="$(printf '%s' "${env}" | tr '[:lower:]' '[:upper:]')"
  env_path_var="VAULT_SECRET_PATH_${upper_env}"
  vault_secret_path="${!env_path_var:-}"
  env_path_var="INGRESS_HOST_${upper_env}"
  ingress_host="${!env_path_var:-}"
  if [ -z "${ingress_host}" ]; then
    ingress_host="${env}.app.local"
  fi
  if [ -z "${vault_secret_path}" ]; then
    if [ "${env}" = "staging" ] && [ -n "${VAULT_SECRET_PATH_STAGGING:-}" ]; then
      vault_secret_path="${VAULT_SECRET_PATH_STAGGING}"
    else
      vault_secret_path="let-note/${env}"
    fi
  fi
  escaped_vault_secret_path="$(escape_sed_replacement "${vault_secret_path}")"
  escaped_ingress_host="$(escape_sed_replacement "${ingress_host}")"

  backend_expected="${BACKEND_IMAGE_REPO}:${IMAGE_TAG}"
  front_expected="${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}"

  title "Deploy ${env}"
  sub "Image tag: ${IMAGE_TAG}"
  sub "Vault path: ${vault_secret_path}"
  sub "Vault addr: ${VAULT_ADDR}"
  sub "Ingress host: ${ingress_host}"

  ensure_https_tls_secret "${env}" "${ingress_host}"

  kubectl kustomize "${overlay}" \
    | sed "s|${BACKEND_IMAGE_REPO}:latest|${BACKEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|${FRONTEND_IMAGE_REPO}:latest|${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|value: http://vault.default.svc.cluster.local:8200|value: ${escaped_vault_addr}|g" \
    | sed "s|host: ${env}.app.local|host: ${escaped_ingress_host}|g" \
    | sed "s|value: let-note/${env}|value: ${escaped_vault_secret_path}|g" \
    | sed "s|\${VAULT_APP_TOKEN}|${escaped_token}|g" \
    | kubectl apply -f -

  info "Rollout postgres (${env})"
  kubectl -n "${env}" rollout status deploy/postgres --timeout="${WAIT_TIMEOUT}"
  ensure_db_credentials "${env}"

  info "Apply migrations (${env})"
  if [ ! -d "${MIGRATIONS_DIR}" ]; then
    err "Dossier migrations introuvable: ${MIGRATIONS_DIR}"
    exit 1
  fi

  mapfile -t migration_files < <(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.up.sql' | sort)
  if [ "${#migration_files[@]}" -eq 0 ]; then
    err "Aucune migration trouvee dans ${MIGRATIONS_DIR}"
    exit 1
  fi

  for migration_file in "${migration_files[@]}"; do
    sub "$(basename "${migration_file}")"
    kubectl -n "${env}" exec -i deploy/postgres -- sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${migration_file}"
  done

  info "Verify expected schema (${env})"
  kubectl -n "${env}" exec deploy/postgres -- sh -c '
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'\''SQL'\''
DO $$
BEGIN
  IF to_regclass('\''public.etudiant'\'') IS NULL THEN
    RAISE EXCEPTION '\''Missing required table: etudiant'\'';
  END IF;
  IF to_regclass('\''public.role'\'') IS NULL THEN
    RAISE EXCEPTION '\''Missing required table: role'\'';
  END IF;
  IF to_regclass('\''public.role_etu'\'') IS NULL THEN
    RAISE EXCEPTION '\''Missing required table: role_etu'\'';
  END IF;
END
$$;
SQL
  '

  info "Rollout backend/front (${env})"
  kubectl -n "${env}" rollout status deploy/backend --timeout="${WAIT_TIMEOUT}"
  kubectl -n "${env}" rollout status deploy/front --timeout="${WAIT_TIMEOUT}"

  backend_images="$(kubectl -n "${env}" get pods -l app=backend -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"
  front_images="$(kubectl -n "${env}" get pods -l app=front -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"

  [ "${backend_images}" = "${backend_expected}" ] || { err "Images backend inattendues (${env})"; printf '%s\n' "${backend_images}"; exit 1; }
  [ "${front_images}" = "${front_expected}" ] || { err "Images front inattendues (${env})"; printf '%s\n' "${front_images}"; exit 1; }

  ok "Deploiement valide sur ${env}"
  kubectl -n "${env}" get deploy,pods,svc,ingress
}

title "Bootstrap cluster"
kubectl apply -f "${SCRIPT_DIR}/cluster/namespaces.yaml"
kubectl apply -f "${SCRIPT_DIR}/cluster/quotas-limits.yaml"
info "Image version: ${IMAGE_VERSION}"
info "Image arch: ${IMAGE_ARCH}"
info "Image tag: ${IMAGE_TAG}"

case "${TARGET}" in
  all)
    sync_vault dev
    deploy_env dev
    sync_vault staging
    deploy_env staging
    sync_vault prod
    deploy_env prod
    ;;
  dev|staging|prod)
    sync_vault "${TARGET}"
    deploy_env "${TARGET}"
    ;;
  *)
    err "Cible invalide: ${TARGET}"
    usage
    exit 1
    ;;
esac

ok "Pipeline termine (${TARGET})"
