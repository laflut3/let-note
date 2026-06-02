#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TARGET="${1:-}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-180s}"
BACKEND_IMAGE_REPO="ghcr.io/laflut3/let-note-backend"
FRONTEND_IMAGE_REPO="ghcr.io/laflut3/let-note-frontend"
MIGRATIONS_DIR="${REPO_ROOT}/infrastructure/BDD/migration"
DEPLOY_CONFIG_TOML="${SCRIPT_DIR}/deploy-config.toml"
CLI_VERSION=""
CLI_ARCH=""
ALLOW_PG_MAJOR_UPGRADE="false"

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

toml_read_deploy_value() {
  local key="$1"
  local file="$2"
  [ -f "${file}" ] || return 0
  awk -F'=' -v wanted="${key}" '
    BEGIN { in_deploy=0 }
    /^[[:space:]]*\[deploy\][[:space:]]*$/ { in_deploy=1; next }
    /^[[:space:]]*\[/ { in_deploy=0 }
    in_deploy && $1 ~ ("^[[:space:]]*" wanted "[[:space:]]*$") {
      v=$2
      sub(/^[[:space:]]*/, "", v)
      sub(/[[:space:]]*$/, "", v)
      gsub(/^"/, "", v)
      gsub(/"$/, "", v)
      print v
      exit
    }
  ' "${file}"
}

vault_read_field() {
  local path="$1"
  local field="$2"
  vault_exec "${VAULT_ADDR}" "${VAULT_ADMIN_TOKEN:-${VAULT_TOKEN:-}}" kv get -field="${field}" "${path}" 2>/dev/null || true
}

first_non_empty() {
  local a="${1:-}"
  local b="${2:-}"
  if [ -n "${a}" ]; then
    printf '%s' "${a}"
  else
    printf '%s' "${b}"
  fi
}

escape_sed_replacement() {
  printf '%s' "$1" | sed 's/[&|]/\\&/g'
}

usage() {
  cat <<USAGE
Usage: $0 [all|dev|staging|prod] [--version <semver>] [--arch <multi|amd64|arm64>] [--allow-pg-major-upgrade]

Examples:
  $0 all
  $0 dev --version 1.0.0 --arch amd64
  $0 prod --version 1.0.0 --arch multi
  $0 staging
  $0 dev --allow-pg-major-upgrade
USAGE
}

extract_pg_major_from_image() {
  local image="$1"
  local image_no_digest="${image%%@*}"
  local image_tag="${image_no_digest##*:}"
  if [[ "${image_tag}" =~ ^([0-9]+) ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

get_target_postgres_image() {
  local postgres_manifest="${SCRIPT_DIR}/base/10-postgres.yaml"
  awk '$1=="image:"{print $2; exit}' "${postgres_manifest}"
}

get_current_postgres_image() {
  local env_name="$1"
  kubectl -n "${env_name}" get deploy/postgres -o jsonpath='{.spec.template.spec.containers[?(@.name=="postgres")].image}' 2>/dev/null || true
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || {
    err "Commande requise manquante: ${cmd}"
    exit 1
  }
}

vault_exec() {
  local vault_addr="$1"
  local vault_token="$2"
  shift 2

  if command -v vault >/dev/null 2>&1; then
    if [ -n "${vault_token}" ]; then
      VAULT_ADDR="${vault_addr}" VAULT_TOKEN="${vault_token}" vault "$@"
    else
      VAULT_ADDR="${vault_addr}" vault "$@"
    fi
    return
  fi

  local ns pod
  ns="${VAULT_K8S_NAMESPACE:-vault}"
  pod="${VAULT_K8S_POD:-vault-0}"
  kubectl exec -i -n "${ns}" "${pod}" -- env VAULT_ADDR="${vault_addr}" VAULT_TOKEN="${vault_token}" vault "$@"
}

ensure_https_tls_secret() {
  local env_name="$1"
  local host="$2"
  local tls_secret="${TLS_SECRET_NAME:-app-tls}"
  local tls_mode="${TLS_MODE:-auto}"
  local mkcert_install_ca="${MKCERT_INSTALL_CA:-true}"

  if [ "${ENABLE_HTTPS:-false}" != "true" ]; then
    warn "HTTPS desactive (ENABLE_HTTPS!=true), ingress TLS peut rester non fonctionnel."
    return
  fi

  require_cmd openssl
  title "TLS setup ${env_name}"
  sub "Host: ${host}"
  sub "Secret: ${tls_secret}"
  sub "Mode: ${tls_mode}"

  local cert_file key_file
  cert_file="$(mktemp)"
  key_file="$(mktemp)"
  local cert_mode_used="self-signed"

  if [ "${tls_mode}" = "mkcert" ] || { [ "${tls_mode}" = "auto" ] && command -v mkcert >/dev/null 2>&1; }; then
    cert_mode_used="mkcert"
    if [ "${mkcert_install_ca}" = "true" ]; then
      mkcert -install >/dev/null 2>&1 || warn "mkcert -install a echoue, verification navigateur potentiellement KO."
    fi
    if ! mkcert -cert-file "${cert_file}" -key-file "${key_file}" "${host}" >/dev/null 2>&1; then
      warn "Generation mkcert impossible, fallback vers certificat auto-signe."
      cert_mode_used="self-signed"
    fi
  fi

  if [ "${cert_mode_used}" = "self-signed" ]; then
    openssl req -x509 -nodes -newkey rsa:2048 \
      -keyout "${key_file}" \
      -out "${cert_file}" \
      -days "${TLS_CERT_DAYS:-365}" \
      -subj "/CN=${host}" \
      -addext "subjectAltName=DNS:${host}" >/dev/null 2>&1
  fi

  kubectl -n "${env_name}" create secret tls "${tls_secret}" \
    --cert="${cert_file}" \
    --key="${key_file}" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  local cert_subject cert_issuer cert_dates cert_verify
  cert_subject="$(openssl x509 -in "${cert_file}" -noout -subject | sed 's/^subject=//')"
  cert_issuer="$(openssl x509 -in "${cert_file}" -noout -issuer | sed 's/^issuer=//')"
  cert_dates="$(openssl x509 -in "${cert_file}" -noout -dates | tr '\n' ' ' | sed 's/ $//')"
  cert_verify="NON_TRUSTED"
  if [ "${cert_mode_used}" = "mkcert" ]; then
    cert_verify="TRUSTED_LOCAL_CA"
  fi

  sub "Cert subject: ${cert_subject}"
  sub "Cert issuer: ${cert_issuer}"
  sub "Cert dates: ${cert_dates}"
  sub "Cert trust mode: ${cert_verify}"

  if [ "${cert_mode_used}" = "self-signed" ]; then
    warn "Certificat auto-signe: Chrome affichera 'Non securise' tant que la CA n'est pas approuvee."
    warn "Pour un cadenas vert local: installe mkcert puis relance avec TLS_MODE=mkcert."
  else
    ok "Certificat local de confiance genere avec mkcert."
  fi

  if command -v getent >/dev/null 2>&1; then
    if getent hosts "${host}" >/dev/null 2>&1; then
      sub "Resolution DNS locale OK pour ${host}"
    else
      warn "Host ${host} introuvable localement (ajoute-le dans /etc/hosts ou DNS local)."
    fi
  fi

  rm -f "${cert_file}" "${key_file}"
  ok "Secret TLS ${tls_secret} pret pour ${env_name}"
}

ensure_db_credentials() {
  local env_name="$1"
  local suffix="$(printf '%s' "${env_name}" | tr '[:lower:]' '[:upper:]')"
  local app_db_user app_db_pass app_db_name escaped_pass
  local env_path_var vault_secret_path

  env_path_var="VAULT_SECRET_PATH_${suffix}"
  vault_secret_path="${!env_path_var:-${env_name}/${VAULT_APP_NAME}}"
  app_db_user="$(vault_read_field "${VAULT_KV_MOUNT}/${vault_secret_path}" PS_BDD_USER)"
  app_db_pass="$(vault_read_field "${VAULT_KV_MOUNT}/${vault_secret_path}" PS_BDD_PASS)"
  app_db_name="$(vault_read_field "${VAULT_KV_MOUNT}/${vault_secret_path}" PS_BDD_DB)"
  [ -n "${app_db_user}" ] || { err "PS_BDD_USER manquant dans Vault (${VAULT_KV_MOUNT}/${vault_secret_path})"; exit 1; }
  [ -n "${app_db_pass}" ] || { err "PS_BDD_PASS manquant dans Vault (${VAULT_KV_MOUNT}/${vault_secret_path})"; exit 1; }
  [ -n "${app_db_name}" ] || { err "PS_BDD_DB manquant dans Vault (${VAULT_KV_MOUNT}/${vault_secret_path})"; exit 1; }
  escaped_pass="${app_db_pass//\'/\'\'}"

  title "DB credentials sync ${env_name}"
  sub "Role: ${app_db_user}"
  sub "Database: ${app_db_name}"
  sub "Source credentials: Vault (${VAULT_KV_MOUNT}/${vault_secret_path})"

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
    \"CREATE DATABASE \\\"${app_db_name}\\\";\"
  " >/dev/null 2>&1 || true

  kubectl -n "${env_name}" exec deploy/postgres -- sh -c "
    psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \
    \"GRANT CONNECT ON DATABASE \\\"${app_db_name}\\\" TO \\\"${app_db_user}\\\";\"
  " >/dev/null

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
    --allow-pg-major-upgrade)
      ALLOW_PG_MAJOR_UPGRADE="true"
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

if [ -z "${VAULT_APP_TOKEN:-}" ] && [ -n "${VAULT_TOKEN:-}" ]; then
  VAULT_APP_TOKEN="${VAULT_TOKEN}"
fi
if [ -z "${VAULT_ADMIN_TOKEN:-}" ] && [ -n "${VAULT_TOKEN:-}" ]; then
  VAULT_ADMIN_TOKEN="${VAULT_TOKEN}"
fi

if [ -z "${VAULT_ADDR:-}" ]; then
  VAULT_ADDR="http://vault.vault.svc.cluster.local:8200"
fi
if [ -z "${VAULT_KV_MOUNT:-}" ]; then
  VAULT_KV_MOUNT="secret"
fi

VAULT_APP_NAME="${VAULT_APP_NAME:-let-note}"
VAULT_DEPLOY_PATH="${VAULT_DEPLOY_PATH:-shared/${VAULT_APP_NAME}/deploy}"

if [ -n "${CLI_VERSION}" ] && [[ ! "${CLI_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  err "Version invalide: ${CLI_VERSION}"
  exit 1
fi
if [ -n "${CLI_ARCH}" ] && [[ "${CLI_ARCH}" != "multi" && "${CLI_ARCH}" != "amd64" && "${CLI_ARCH}" != "arm64" ]]; then
  err "Arch invalide: ${CLI_ARCH}"
  exit 1
fi

vault_version="$(vault_read_field "${VAULT_KV_MOUNT}/${VAULT_DEPLOY_PATH}" LET_NOTE_VERSION)"
toml_version="$(toml_read_deploy_value "version" "${DEPLOY_CONFIG_TOML}")"
IMAGE_VERSION="$(first_non_empty "${CLI_VERSION:-}" "$(first_non_empty "${toml_version:-}" "${vault_version}")")"
if [ -z "${IMAGE_VERSION}" ]; then
  err "LET_NOTE_VERSION manquante (--version, TOML ${DEPLOY_CONFIG_TOML} ou Vault ${VAULT_KV_MOUNT}/${VAULT_DEPLOY_PATH})"
  exit 1
fi
vault_arch="$(vault_read_field "${VAULT_KV_MOUNT}/${VAULT_DEPLOY_PATH}" LET_NOTE_ARCH)"
toml_arch="$(toml_read_deploy_value "arch" "${DEPLOY_CONFIG_TOML}")"
IMAGE_ARCH="$(first_non_empty "${CLI_ARCH:-}" "$(first_non_empty "${toml_arch:-}" "${vault_arch:-amd64}")")"
case "${IMAGE_ARCH}" in
  multi) IMAGE_TAG="${IMAGE_VERSION}" ;;
  amd64|arm64) IMAGE_TAG="${IMAGE_VERSION}-${IMAGE_ARCH}" ;;
  *) err "Arch invalide: ${IMAGE_ARCH}"; exit 1 ;;
esac

if [ -z "${VAULT_APP_TOKEN:-}" ]; then
  VAULT_APP_TOKEN="$(vault_read_field "${VAULT_KV_MOUNT}/${VAULT_DEPLOY_PATH}" VAULT_APP_TOKEN)"
fi

ensure_runtime_secrets_from_vault() {
  local env_name="$1"
  local suffix
  suffix="$(printf '%s' "${env_name}" | tr '[:lower:]' '[:upper:]')"
  local env_path_var env_path db_name db_user db_pass s3_access s3_secret s3_endpoint s3_region s3_bucket
  local app_token

  env_path_var="VAULT_SECRET_PATH_${suffix}"
  env_path="${!env_path_var:-${env_name}/${VAULT_APP_NAME}}"
  db_name="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_DB)"
  db_user="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_USER)"
  db_pass="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_PASS)"
  s3_access="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_ACCESS_KEY)"
  s3_secret="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_SECRET_KEY)"
  s3_endpoint="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_ENDPOINT)"
  s3_region="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_REGION)"
  s3_bucket="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_BUCKET)"

  [ -n "${db_name}" ] || { err "PS_BDD_DB manquant dans Vault (${VAULT_KV_MOUNT}/${env_path})"; exit 1; }
  [ -n "${db_user}" ] || { err "PS_BDD_USER manquant dans Vault (${VAULT_KV_MOUNT}/${env_path})"; exit 1; }
  [ -n "${db_pass}" ] || { err "PS_BDD_PASS manquant dans Vault (${VAULT_KV_MOUNT}/${env_path})"; exit 1; }
  [ -n "${s3_access}" ] || { err "S3_ACCESS_KEY manquant dans Vault (${VAULT_KV_MOUNT}/${env_path})"; exit 1; }
  [ -n "${s3_secret}" ] || { err "S3_SECRET_KEY manquant dans Vault (${VAULT_KV_MOUNT}/${env_path})"; exit 1; }

  app_token="$(first_non_empty "${VAULT_APP_TOKEN:-}" "$(vault_read_field "${VAULT_KV_MOUNT}/${VAULT_DEPLOY_PATH}" VAULT_APP_TOKEN)")"
  [ -n "${app_token}" ] || { err "VAULT_APP_TOKEN manquant dans Vault (${VAULT_KV_MOUNT}/${VAULT_DEPLOY_PATH})"; exit 1; }

  kubectl -n "${env_name}" create secret generic vault-app-auth \
    --from-literal=token="${app_token}" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  kubectl -n "${env_name}" create secret generic postgres-secret \
    --from-literal=POSTGRES_PASSWORD="${db_pass}" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  kubectl -n "${env_name}" create secret generic s3-secret \
    --from-literal=S3_ACCESS_KEY="${s3_access}" \
    --from-literal=S3_SECRET_KEY="${s3_secret}" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  cat <<EOF | kubectl apply -f - >/dev/null
apiVersion: v1
kind: ConfigMap
metadata:
  name: seaweed-s3-config
  namespace: ${env_name}
data:
  s3.conf: |
    {
      "identities": [
        {
          "name": "let-note",
          "credentials": [
            {
              "accessKey": "${s3_access}",
              "secretKey": "${s3_secret}"
            }
          ],
          "actions": [
            "Admin",
            "Read",
            "Write",
            "List",
            "Tagging"
          ]
        }
      ]
    }
EOF

  kubectl -n "${env_name}" create configmap postgres-config \
    --from-literal=POSTGRES_DB="${db_name}" \
    --from-literal=POSTGRES_USER="${db_user}" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  if [ -n "${s3_endpoint}" ] || [ -n "${s3_region}" ] || [ -n "${s3_bucket}" ]; then
    kubectl -n "${env_name}" create configmap backend-config \
      --from-literal=PS_BDD_SERVER=postgres \
      --from-literal=PS_BDD_PORT=5432 \
      --from-literal=S3_ENDPOINT="${s3_endpoint:-http://seaweed-s3:8333}" \
      --from-literal=S3_REGION="${s3_region:-us-east-1}" \
      --from-literal=S3_BUCKET="${s3_bucket:-let-note-files}" \
      --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  fi

  kubectl -n "${env_name}" rollout restart deploy/seaweed-s3 >/dev/null 2>&1 || true
}

deploy_env() {
  local env="$1"
  local overlay="${SCRIPT_DIR}/environments/${env}"
  local escaped_token escaped_vault_secret_path escaped_vault_addr escaped_ingress_host upper_env env_path_var vault_secret_path ingress_host
  local backend_expected front_expected backend_images front_images
  local pg_target_image pg_current_image pg_target_major pg_current_major
  local rendered_manifest skip_pg_image_update

  [ -d "${overlay}" ] || { err "Overlay introuvable: ${overlay}"; exit 1; }

  escaped_token="$(escape_sed_replacement "${VAULT_APP_TOKEN:-}")"
  escaped_vault_addr="$(escape_sed_replacement "${VAULT_ADDR}")"
  upper_env="$(printf '%s' "${env}" | tr '[:lower:]' '[:upper:]')"
  env_path_var="VAULT_SECRET_PATH_${upper_env}"
  vault_secret_path="${!env_path_var:-}"
  env_path_var="INGRESS_HOST_${upper_env}"
  ingress_host="${!env_path_var:-}"
  if [ -z "${ingress_host}" ]; then
    ingress_host="$(vault_read_field "${VAULT_KV_MOUNT}/${vault_secret_path:-${env}/${VAULT_APP_NAME}}" INGRESS_HOST)"
    ingress_host="${ingress_host:-${env}.app.local}"
  fi
  if [ -z "${vault_secret_path}" ]; then
    vault_secret_path="${env}/${VAULT_APP_NAME}"
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

  if [ "${env}" = "prod" ]; then
    info "TLS local secret skippe pour prod (cert-manager gere app-tls)"
  else
    ensure_https_tls_secret "${env}" "${ingress_host}"
  fi

  pg_target_image="$(get_target_postgres_image)"
  pg_current_image="$(get_current_postgres_image "${env}")"
  pg_target_major=""
  pg_current_major=""
  skip_pg_image_update="false"

  if [ -n "${pg_target_image}" ] && [ -n "${pg_current_image}" ]; then
    pg_target_major="$(extract_pg_major_from_image "${pg_target_image}" || true)"
    pg_current_major="$(extract_pg_major_from_image "${pg_current_image}" || true)"
    if [ -n "${pg_target_major}" ] && [ -n "${pg_current_major}" ] && [ "${pg_target_major}" != "${pg_current_major}" ]; then
      if [ "${ALLOW_PG_MAJOR_UPGRADE}" != "true" ]; then
        skip_pg_image_update="true"
        warn "Postgres major upgrade detecte (${pg_current_major} -> ${pg_target_major}) sans migration."
        warn "Le script conserve automatiquement l'image Postgres actuelle pour eviter un CrashLoop et une indisponibilite."
        warn "Pour autoriser l'upgrade majeur: lancez avec --allow-pg-major-upgrade apres migration de donnees."
      else
        warn "Postgres major upgrade force (${pg_current_major} -> ${pg_target_major}). Assurez-vous qu'une migration de donnees est faite."
      fi
    fi
  fi

  rendered_manifest="$(mktemp)"
  kubectl kustomize "${overlay}" \
    | sed "s|${BACKEND_IMAGE_REPO}:latest|${BACKEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|${FRONTEND_IMAGE_REPO}:latest|${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|value: http://vault.vault.svc.cluster.local:8200|value: ${escaped_vault_addr}|g" \
    | sed "s|host: ${env}.app.local|host: ${escaped_ingress_host}|g" \
    | sed "s|value: ${env}/${VAULT_APP_NAME}|value: ${escaped_vault_secret_path}|g" \
    | sed "s|\${VAULT_APP_TOKEN}|${escaped_token}|g" \
    > "${rendered_manifest}"

  if [ "${skip_pg_image_update}" = "true" ]; then
    sub "Postgres image conservee: ${pg_current_image}"
    sed -i "s|image: ${pg_target_image}|image: ${pg_current_image}|g" "${rendered_manifest}"
  fi

  kubectl apply -f "${rendered_manifest}"
  rm -f "${rendered_manifest}"

  ensure_runtime_secrets_from_vault "${env}"

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

ok "Pipeline termine (${TARGET})"
