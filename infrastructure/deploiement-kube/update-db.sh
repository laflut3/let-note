#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TARGET="${1:-}"
MIGRATIONS_DIR="${REPO_ROOT}/infrastructure/BDD/migration"

if [ -t 1 ]; then
  C_RESET="$(printf '\033[0m')"
  C_INFO="$(printf '\033[36m')"
  C_WARN="$(printf '\033[33m')"
  C_ERR="$(printf '\033[31m')"
  C_OK="$(printf '\033[32m')"
  C_DIM="$(printf '\033[2m')"
else
  C_RESET=""
  C_INFO=""
  C_WARN=""
  C_ERR=""
  C_OK=""
  C_DIM=""
fi

info() { printf '%b\n' "${C_INFO}[INFO]${C_RESET} $*"; }
warn() { printf '%b\n' "${C_WARN}[WARN]${C_RESET} $*"; }
err() { printf '%b\n' "${C_ERR}[ERR ]${C_RESET} $*" >&2; }
ok() { printf '%b\n' "${C_OK}[ OK ]${C_RESET} $*"; }
sub() { printf '%b\n' "${C_DIM}  -> $*${C_RESET}"; }

usage() {
  cat <<USAGE
Usage: $0 <dev|staging|prod|all>

Examples:
  $0 dev
  $0 all
USAGE
}

apply_migrations() {
  local env="$1"
  info "Apply migrations (${env})"
  kubectl -n "${env}" rollout status deploy/postgres --timeout="${WAIT_TIMEOUT:-180s}"

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

  ok "Migrations appliquees (${env})"
}

case "${TARGET}" in
  dev|staging|prod)
    apply_migrations "${TARGET}"
    ;;
  all)
    apply_migrations dev
    apply_migrations staging
    apply_migrations prod
    ;;
  *)
    usage
    exit 1
    ;;
esac
