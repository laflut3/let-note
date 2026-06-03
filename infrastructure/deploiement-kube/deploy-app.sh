#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TARGET="${1:-}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-180s}"
BACKEND_IMAGE_REPO="ghcr.io/laflut3/let-note-backend"
FRONTEND_IMAGE_REPO="ghcr.io/laflut3/let-note-frontend"
MIGRATIONS_DIR="${SCRIPT_DIR}/charts/let-note/migrations"
DEPLOY_CONFIG_TOML="${SCRIPT_DIR}/deploy-config.toml"
APP_CHART_DIR="${SCRIPT_DIR}/charts/let-note"
CLUSTER_CHART_DIR="${SCRIPT_DIR}/charts/cluster"
ALLOW_PG_MAJOR_UPGRADE="false"
FORCE_RESTART="false"
ALLOW_CERT_CHANGE="false"
DEPLOY_SCOPE="${DEPLOY_SCOPE:-auto}"
APPLY_ARGOCD="${APPLY_ARGOCD:-false}"
CLUSTER_BOOTSTRAPPED="false"
ARGOCD_APPSET_APPLIED="false"

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
  vault_exec "${VAULT_ADDR}" "${DEPLOY_VAULT_TOKEN:-${VAULT_ADMIN_TOKEN:-${VAULT_TOKEN:-}}}" kv get -field="${field}" "${path}" 2>/dev/null || true
}

vault_read_required_field() {
  local path="$1"
  local field="$2"
  local value error_file

  error_file="$(mktemp)"
  if value="$(vault_exec "${VAULT_ADDR}" "${DEPLOY_VAULT_TOKEN:-${VAULT_ADMIN_TOKEN:-${VAULT_TOKEN:-}}}" kv get -field="${field}" "${path}" 2>"${error_file}")"; then
    rm -f "${error_file}"
    if [ -n "${value}" ]; then
      printf '%s' "${value}"
      return 0
    fi
    err "${field} vide dans Vault (${path})"
    exit 1
  fi

  err "Lecture Vault impossible pour ${field} (${path})"
  while IFS= read -r line; do
    [ -n "${line}" ] && err "Vault: ${line}"
  done < "${error_file}"
  rm -f "${error_file}"
  exit 1
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
Usage: $0 [all|dev|staging|prod] [--app-only|--full] [--argocd] [--allow-cert-change] [--allow-pg-major-upgrade] [--force-restart]

Examples:
  $0 all
  $0 dev
  $0 prod
  $0 staging
  $0 prod --app-only
  $0 prod --full
  $0 prod --full --allow-cert-change
  $0 prod --full --argocd
  $0 dev --allow-pg-major-upgrade
  $0 prod --force-restart

Modes:
  --app-only  applique uniquement les deployments backend/front
  --full      applique tout le chart Helm et les taches infra
  --argocd    applique aussi l'ApplicationSet ArgoCD (Git doit etre a jour)
  --allow-cert-change autorise une rotation du certificat TLS existant
  auto        full si l'environnement n'existe pas encore, app-only sinon
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
  local postgres_manifest

  postgres_manifest="$(mktemp)"
  helm template let-note "${APP_CHART_DIR}" --namespace dev \
    -f "${APP_CHART_DIR}/environments/dev.yaml" \
    > "${postgres_manifest}"
  awk '
    $1=="-" && $2=="name:" && $3=="postgres" { in_postgres=1; next }
    in_postgres && $1=="image:" { print $2; exit }
  ' "${postgres_manifest}"
  rm -f "${postgres_manifest}"
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

describe_pods_for_app() {
  local env_name="$1"
  local app_name="$2"

  err "Diagnostic pods app=${app_name} namespace=${env_name}"
  kubectl -n "${env_name}" get pods -l "app=${app_name}" -o wide || true
  kubectl -n "${env_name}" describe pods -l "app=${app_name}" || true
}

app_ready_with_image() {
  local env_name="$1"
  local app_name="$2"
  local deploy_name="$3"
  local expected_image="$4"
  local desired ready matching

  desired="$(kubectl -n "${env_name}" get "deploy/${deploy_name}" -o jsonpath='{.spec.replicas}')"
  desired="${desired:-1}"
  ready="$(kubectl -n "${env_name}" get pods -l "app=${app_name}" -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' | awk '$1=="true"{count++} END{print count+0}')"
  matching="$(kubectl -n "${env_name}" get pods -l "app=${app_name}" -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | awk -v expected="${expected_image}" '$1==expected{count++} END{print count+0}')"

  [ "${ready}" -ge "${desired}" ] && [ "${matching}" -ge "${desired}" ]
}

rollout_status_or_describe() {
  local env_name="$1"
  local app_name="$2"
  local deploy_name="$3"
  local expected_image="${4:-}"

  if [ -n "${expected_image}" ] && app_ready_with_image "${env_name}" "${app_name}" "${deploy_name}" "${expected_image}"; then
    info "Rollout ${deploy_name} deja pret (${env_name})"
    return
  fi

  if ! kubectl -n "${env_name}" rollout status "deploy/${deploy_name}" --timeout="${WAIT_TIMEOUT}"; then
    if [ -n "${expected_image}" ] && app_ready_with_image "${env_name}" "${app_name}" "${deploy_name}" "${expected_image}"; then
      warn "Rollout status a expire pour ${deploy_name}, mais les pods sont Ready avec l'image attendue."
      return
    fi
    describe_pods_for_app "${env_name}" "${app_name}"
    exit 1
  fi
}

apply_argocd_applicationset() {
  local app_manifest="${SCRIPT_DIR}/gitops/argocd/applicationset.yaml"
  local rendered_app

  if [ "${ARGOCD_APPSET_APPLIED}" = "true" ]; then
    return
  fi

  [ -f "${app_manifest}" ] || { warn "Manifest ArgoCD introuvable: ${app_manifest}"; return; }

  if ! kubectl get crd applicationsets.argoproj.io >/dev/null 2>&1; then
    warn "ArgoCD ApplicationSet CRD applicationsets.argoproj.io introuvable, ApplicationSet non applique."
    return
  fi

  title "ArgoCD ApplicationSet"
  rendered_app="$(mktemp)"
  sed "s|__IMAGE_TAG__|${IMAGE_TAG}|g" "${app_manifest}" \
    | sed "s|${BACKEND_IMAGE_REPO}:latest|${BACKEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    | sed "s|${FRONTEND_IMAGE_REPO}:latest|${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}|g" \
    > "${rendered_app}"
  kubectl apply -f "${rendered_app}"
  rm -f "${rendered_app}"
  ARGOCD_APPSET_APPLIED="true"
}

ensure_cluster_bootstrap() {
  local rendered_cluster

  if [ "${CLUSTER_BOOTSTRAPPED}" = "true" ]; then
    return
  fi

  title "Bootstrap cluster"
  [ -d "${CLUSTER_CHART_DIR}" ] || { err "Chart Helm cluster introuvable: ${CLUSTER_CHART_DIR}"; exit 1; }
  rendered_cluster="$(mktemp)"
  helm template let-note-cluster "${CLUSTER_CHART_DIR}" > "${rendered_cluster}"
  kubectl apply -f "${rendered_cluster}"
  rm -f "${rendered_cluster}"
  CLUSTER_BOOTSTRAPPED="true"
}

env_has_app_deployments() {
  local env_name="$1"

  kubectl -n "${env_name}" get deploy/backend deploy/front >/dev/null 2>&1
}

deploy_scope_for_env() {
  local env_name="$1"

  case "${DEPLOY_SCOPE}" in
    app|app-only)
      printf '%s' "app"
      ;;
    full)
      printf '%s' "full"
      ;;
    auto)
      if env_has_app_deployments "${env_name}"; then
        printf '%s' "app"
      else
        printf '%s' "full"
      fi
      ;;
    *)
      err "DEPLOY_SCOPE invalide: ${DEPLOY_SCOPE}"
      exit 1
      ;;
  esac
}

render_env_manifest() {
  local chart_dir="$1"
  local env_name="$2"
  local escaped_vault_addr="$3"
  local escaped_ingress_host="$4"
  local escaped_vault_secret_path="$5"
  local escaped_deploy_id="$6"
  local rendered_manifest="$7"

  helm template "let-note-${env_name}" "${chart_dir}" \
    --namespace "${env_name}" \
    -f "${chart_dir}/environments/${env_name}.yaml" \
    --set-string "images.backend.tag=${IMAGE_TAG}" \
    --set-string "images.frontend.tag=${IMAGE_TAG}" \
    --set-string "backend.vault.addr=${escaped_vault_addr}" \
    --set-string "backend.vault.secretPath=${escaped_vault_secret_path}" \
    --set-string "ingress.host=${escaped_ingress_host}" \
    --set-string "config.app.ingress.host=${escaped_ingress_host}" \
    --set-string "global.deployId=${escaped_deploy_id}" \
    > "${rendered_manifest}"
}

guard_tls_certificate_change() {
  local env_name="$1"
  local desired_host="$2"
  local tls_secret="${TLS_SECRET_NAME:-app-tls}"
  local current_hosts

  current_hosts="$(kubectl -n "${env_name}" get certificate "${tls_secret}" -o jsonpath='{.spec.dnsNames[*]}' 2>/dev/null || true)"
  if [ -z "${current_hosts}" ]; then
    return
  fi

  if printf '%s\n' "${current_hosts}" | tr ' ' '\n' | awk -v desired="${desired_host}" '$1 == desired { found=1 } END { exit found ? 0 : 1 }'; then
    sub "Certificat TLS existant conserve: ${current_hosts}"
    return
  fi

  if [ "${ALLOW_CERT_CHANGE}" = "true" ]; then
    warn "Rotation certificat autorisee: ${current_hosts} -> ${desired_host}"
    return
  fi

  err "Changement de host TLS bloque pour eviter une recreation de certificat."
  err "Certificat actuel (${env_name}/${tls_secret}): ${current_hosts}"
  err "Host demande: ${desired_host}"
  err "Si c'est volontaire, relance une seule fois avec --allow-cert-change."
  exit 1
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
  if [ -n "${vault_token}" ]; then
    kubectl exec -i -n "${ns}" "${pod}" -- env VAULT_ADDR="${vault_addr}" VAULT_TOKEN="${vault_token}" vault "$@"
  else
    kubectl exec -i -n "${ns}" "${pod}" -- env VAULT_ADDR="${vault_addr}" vault "$@"
  fi
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
  app_db_user="$(vault_read_required_field "${VAULT_KV_MOUNT}/${vault_secret_path}" PS_BDD_USER)"
  app_db_pass="$(vault_read_required_field "${VAULT_KV_MOUNT}/${vault_secret_path}" PS_BDD_PASS)"
  app_db_name="$(vault_read_required_field "${VAULT_KV_MOUNT}/${vault_secret_path}" PS_BDD_DB)"
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
    --app-only)
      DEPLOY_SCOPE="app"
      shift
      ;;
    --full)
      DEPLOY_SCOPE="full"
      shift
      ;;
    --argocd)
      APPLY_ARGOCD="true"
      shift
      ;;
    --allow-cert-change)
      ALLOW_CERT_CHANGE="true"
      shift
      ;;
    --allow-pg-major-upgrade)
      ALLOW_PG_MAJOR_UPGRADE="true"
      shift
      ;;
    --force-restart)
      FORCE_RESTART="true"
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
require_cmd helm

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
VAULT_AUTH_METHOD="${VAULT_AUTH_METHOD:-kubernetes}"
VAULT_K8S_AUTH_MOUNT="${VAULT_K8S_AUTH_MOUNT:-kubernetes}"
VAULT_K8S_SERVICE_ACCOUNT="${VAULT_K8S_SERVICE_ACCOUNT:-let-note-backend}"
DEPLOY_VAULT_TOKEN="${VAULT_ADMIN_TOKEN:-${VAULT_TOKEN:-}}"

toml_version="$(toml_read_deploy_value "version" "${DEPLOY_CONFIG_TOML}")"
IMAGE_VERSION="${toml_version:-}"
if [ -z "${IMAGE_VERSION}" ]; then
  err "version manquante dans ${DEPLOY_CONFIG_TOML} ([deploy].version)"
  exit 1
fi
toml_arch="$(toml_read_deploy_value "arch" "${DEPLOY_CONFIG_TOML}")"
IMAGE_ARCH="${toml_arch:-}"
if [ -z "${IMAGE_ARCH}" ]; then
  err "arch manquante dans ${DEPLOY_CONFIG_TOML} ([deploy].arch)"
  exit 1
fi
if [[ ! "${IMAGE_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  err "Version invalide dans ${DEPLOY_CONFIG_TOML}: ${IMAGE_VERSION}"
  exit 1
fi
case "${IMAGE_ARCH}" in
  multi) IMAGE_TAG="${IMAGE_VERSION}" ;;
  amd64|arm64) IMAGE_TAG="${IMAGE_VERSION}-${IMAGE_ARCH}" ;;
  *) err "Arch invalide dans ${DEPLOY_CONFIG_TOML}: ${IMAGE_ARCH}"; exit 1 ;;
esac

ensure_runtime_secrets_from_vault() {
  local env_name="$1"
  local suffix
  suffix="$(printf '%s' "${env_name}" | tr '[:lower:]' '[:upper:]')"
  local env_path_var env_path db_name db_user db_pass s3_access s3_secret s3_endpoint s3_region s3_bucket

  env_path_var="VAULT_SECRET_PATH_${suffix}"
  env_path="${!env_path_var:-${env_name}/${VAULT_APP_NAME}}"
  db_name="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_DB)"
  db_user="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_USER)"
  db_pass="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_PASS)"
  s3_access="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" S3_ACCESS_KEY)"
  s3_secret="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" S3_SECRET_KEY)"
  s3_endpoint="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_ENDPOINT)"
  s3_region="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_REGION)"
  s3_bucket="$(vault_read_field "${VAULT_KV_MOUNT}/${env_path}" S3_BUCKET)"

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

ensure_vault_service_account() {
  local env_name="$1"

  kubectl -n "${env_name}" create serviceaccount "${VAULT_K8S_SERVICE_ACCOUNT}" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
}

vault_kubernetes_role() {
  local env_name="$1"
  local suffix
  suffix="$(printf '%s' "${env_name}" | tr '[:lower:]' '[:upper:]')"
  local role_var="VAULT_K8S_ROLE_${suffix}"
  printf '%s' "${!role_var:-${VAULT_K8S_ROLE:-let-note-${env_name}}}"
}

vault_login_kubernetes() {
  local env_name="$1"
  local role jwt token error_file

  role="$(vault_kubernetes_role "${env_name}")"
  ensure_vault_service_account "${env_name}"
  jwt="$(kubectl -n "${env_name}" create token "${VAULT_K8S_SERVICE_ACCOUNT}" --duration="${VAULT_K8S_TOKEN_DURATION:-10m}")"
  error_file="$(mktemp)"
  if token="$(vault_exec "${VAULT_ADDR}" "" write -field=token "auth/${VAULT_K8S_AUTH_MOUNT}/login" "role=${role}" "jwt=${jwt}" 2>"${error_file}")"; then
    rm -f "${error_file}"
    [ -n "${token}" ] || { err "Vault Kubernetes auth a retourne un token vide (role ${role})"; exit 1; }
    printf '%s' "${token}"
    return 0
  fi

  err "Authentification Vault Kubernetes impossible (role ${role}, serviceAccount ${VAULT_K8S_SERVICE_ACCOUNT}, namespace ${env_name})"
  while IFS= read -r line; do
    [ -n "${line}" ] && err "Vault: ${line}"
  done < "${error_file}"
  err "Verifie le role Vault:"
  err "vault write auth/${VAULT_K8S_AUTH_MOUNT}/role/${role} bound_service_account_names=${VAULT_K8S_SERVICE_ACCOUNT} bound_service_account_namespaces=${env_name} policies=${role}"
  rm -f "${error_file}"
  exit 1
}

ensure_deploy_vault_access() {
  local env_name="$1"

  if [ -n "${DEPLOY_VAULT_TOKEN}" ]; then
    return
  fi
  case "${VAULT_AUTH_METHOD}" in
    kubernetes)
      DEPLOY_VAULT_TOKEN="$(vault_login_kubernetes "${env_name}")"
      ;;
    *)
      err "VAULT_AUTH_METHOD=${VAULT_AUTH_METHOD} ne permet pas de lire Vault sans VAULT_TOKEN/VAULT_ADMIN_TOKEN."
      exit 1
      ;;
  esac
}

validate_runtime_vault_access() {
  local env_name="$1"
  local env_path="$2"
  local ignored_value

  ignored_value="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_DB)"
  ignored_value="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_USER)"
  ignored_value="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" PS_BDD_PASS)"
  ignored_value="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" S3_ACCESS_KEY)"
  ignored_value="$(vault_read_required_field "${VAULT_KV_MOUNT}/${env_path}" S3_SECRET_KEY)"

  ok "Acces Vault valide pour ${env_name}"
}

deploy_env() {
  local env="$1"
  local chart_dir="${APP_CHART_DIR}"
  local escaped_vault_secret_path escaped_vault_addr escaped_ingress_host upper_env env_path_var vault_secret_path ingress_host
  local backend_expected front_expected backend_images front_images
  local pg_target_image pg_current_image pg_target_major pg_current_major
  local rendered_manifest skip_pg_image_update deploy_id escaped_deploy_id deploy_scope

  [ -d "${chart_dir}" ] || { err "Chart Helm introuvable: ${chart_dir}"; exit 1; }
  [ -f "${chart_dir}/environments/${env}.yaml" ] || { err "Values Helm introuvables: ${chart_dir}/environments/${env}.yaml"; exit 1; }

  deploy_scope="$(deploy_scope_for_env "${env}")"
  if [ "${deploy_scope}" = "full" ]; then
    ensure_cluster_bootstrap
    if [ "${APPLY_ARGOCD}" = "true" ]; then
      apply_argocd_applicationset
    elif kubectl -n argocd get applicationset let-note >/dev/null 2>&1; then
      warn "ApplicationSet ArgoCD let-note existant non modifie."
      warn "Si Git n'est pas a jour, ArgoCD peut retablir l'ancien etat."
    fi
  elif kubectl -n argocd get applicationset let-note >/dev/null 2>&1; then
    warn "Mode app-only: ApplicationSet ArgoCD let-note existant non modifie."
    warn "Si selfHeal est actif, ArgoCD peut retablir l'etat declare dans Git."
  fi

  escaped_vault_addr="$(escape_sed_replacement "${VAULT_ADDR}")"
  upper_env="$(printf '%s' "${env}" | tr '[:lower:]' '[:upper:]')"
  env_path_var="VAULT_SECRET_PATH_${upper_env}"
  vault_secret_path="${!env_path_var:-}"
  if [ -z "${vault_secret_path}" ]; then
    vault_secret_path="${env}/${VAULT_APP_NAME}"
  fi
  if [ "${deploy_scope}" = "full" ]; then
    ensure_deploy_vault_access "${env}"
  fi

  env_path_var="INGRESS_HOST_${upper_env}"
  ingress_host="${!env_path_var:-}"
  if [ -z "${ingress_host}" ] && [ "${deploy_scope}" = "full" ]; then
    ingress_host="$(vault_read_field "${VAULT_KV_MOUNT}/${vault_secret_path}" INGRESS_HOST)"
  fi
  if [ -z "${ingress_host}" ]; then
    ingress_host="${ingress_host:-${env}.app.local}"
  fi
  escaped_vault_secret_path="$(escape_sed_replacement "${vault_secret_path}")"
  escaped_ingress_host="$(escape_sed_replacement "${ingress_host}")"
  deploy_id="${env}-${IMAGE_TAG}-${vault_secret_path}-${ingress_host}"
  if [ "${FORCE_RESTART}" = "true" ] || [ "${deploy_scope}" = "app" ]; then
    deploy_id="${deploy_id}-$(date -u +%Y%m%d%H%M%S)"
  fi
  escaped_deploy_id="$(escape_sed_replacement "${deploy_id}")"

  backend_expected="${BACKEND_IMAGE_REPO}:${IMAGE_TAG}"
  front_expected="${FRONTEND_IMAGE_REPO}:${IMAGE_TAG}"

  title "Deploy ${env}"
  sub "Mode: ${deploy_scope}"
  sub "Image tag: ${IMAGE_TAG}"
  sub "Vault path: ${vault_secret_path}"
  sub "Vault addr: ${VAULT_ADDR}"
  sub "Ingress host: ${ingress_host}"
  sub "Deploy id: ${deploy_id}"

  pg_target_image=""
  pg_current_image=""
  pg_target_major=""
  pg_current_major=""
  skip_pg_image_update="false"

  if [ "${deploy_scope}" = "full" ]; then
    validate_runtime_vault_access "${env}" "${vault_secret_path}"

    if [ "${env}" = "prod" ]; then
      info "TLS local secret skippe pour prod (cert-manager gere app-tls)"
      guard_tls_certificate_change "${env}" "${ingress_host}"
    else
      ensure_https_tls_secret "${env}" "${ingress_host}"
    fi

    pg_target_image="$(get_target_postgres_image)"
    pg_current_image="$(get_current_postgres_image "${env}")"
  fi

  if [ "${deploy_scope}" = "full" ] && [ -n "${pg_target_image}" ] && [ -n "${pg_current_image}" ]; then
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
  render_env_manifest "${chart_dir}" "${env}" "${escaped_vault_addr}" "${escaped_ingress_host}" "${escaped_vault_secret_path}" "${escaped_deploy_id}" "${rendered_manifest}"

  if [ "${skip_pg_image_update}" = "true" ]; then
    sub "Postgres image conservee: ${pg_current_image}"
    sed -i "s|image: ${pg_target_image}|image: ${pg_current_image}|g" "${rendered_manifest}"
  fi

  if [ "${deploy_scope}" = "app" ]; then
    kubectl apply -f "${rendered_manifest}" -l app=backend
    kubectl apply -f "${rendered_manifest}" -l app=front
  else
    kubectl apply -f "${rendered_manifest}"
  fi
  rm -f "${rendered_manifest}"

  if [ "${deploy_scope}" = "full" ]; then
    ensure_runtime_secrets_from_vault "${env}"

    info "Rollout postgres (${env})"
    rollout_status_or_describe "${env}" postgres postgres
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
  fi

  info "Rollout backend/front (${env})"
  rollout_status_or_describe "${env}" backend backend "${backend_expected}"
  rollout_status_or_describe "${env}" front front "${front_expected}"

  backend_images="$(kubectl -n "${env}" get pods -l app=backend -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"
  front_images="$(kubectl -n "${env}" get pods -l app=front -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}' | sort -u)"

  [ "${backend_images}" = "${backend_expected}" ] || { err "Images backend inattendues (${env})"; printf '%s\n' "${backend_images}"; exit 1; }
  [ "${front_images}" = "${front_expected}" ] || { err "Images front inattendues (${env})"; printf '%s\n' "${front_images}"; exit 1; }

  ok "Deploiement valide sur ${env}"
  kubectl -n "${env}" get deploy,pods,svc,ingress
}

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
