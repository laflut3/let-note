#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-}"
TARGET_MAJOR="${2:-18}"
SWITCH_BACKEND="${SWITCH_BACKEND:-true}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-300s}"

usage() {
  cat <<USAGE
Usage: $0 <dev|staging|prod> [target_major]

Env vars:
  SWITCH_BACKEND=true|false   Basculer app-config PS_BDD_SERVER vers la nouvelle DB (default: true)
  WAIT_TIMEOUT=300s           Timeout kubectl rollout/wait

Example:
  $0 dev 18
  SWITCH_BACKEND=false $0 staging 18
USAGE
}

log() { printf '[INFO] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; }
fail() { printf '[ERR ] %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Commande requise manquante: $1"
}

if [ -z "${TARGET_ENV}" ] || [[ "${TARGET_ENV}" == "-h" ]] || [[ "${TARGET_ENV}" == "--help" ]]; then
  usage
  exit 0
fi

case "${TARGET_ENV}" in
  dev|staging|prod) ;;
  *) fail "Environnement invalide: ${TARGET_ENV}" ;;
esac

if ! [[ "${TARGET_MAJOR}" =~ ^[0-9]+$ ]]; then
  fail "Version majeure cible invalide: ${TARGET_MAJOR}"
fi

require_cmd kubectl
require_cmd sed
require_cmd awk
require_cmd date

NS="${TARGET_ENV}"
SRC_DEPLOY="postgres"
DST_DEPLOY="postgres${TARGET_MAJOR}"
DST_SERVICE="postgres${TARGET_MAJOR}"
DST_PVC="postgres${TARGET_MAJOR}-pvc"
DUMP_FILE="/tmp/letnote_${NS}_pg${TARGET_MAJOR}_$(date +%F_%H%M%S).sql"

log "Namespace: ${NS}"
log "Source: deploy/${SRC_DEPLOY}"
log "Target: deploy/${DST_DEPLOY} (svc/${DST_SERVICE}, pvc/${DST_PVC})"

kubectl -n "${NS}" get deploy "${SRC_DEPLOY}" >/dev/null || fail "Deployment source introuvable: ${SRC_DEPLOY}"
kubectl -n "${NS}" rollout status deploy/"${SRC_DEPLOY}" --timeout="${WAIT_TIMEOUT}"

log "Lecture config actuelle"
SRC_IMAGE="$(kubectl -n "${NS}" get deploy "${SRC_DEPLOY}" -o jsonpath='{.spec.template.spec.containers[?(@.name=="postgres")].image}')"
SRC_MAJOR=""
if [[ "${SRC_IMAGE}" =~ :([0-9]+) ]]; then
  SRC_MAJOR="${BASH_REMATCH[1]}"
fi
log "Image source: ${SRC_IMAGE}"

if [ -z "${SRC_MAJOR}" ]; then
  warn "Impossible d'extraire la version majeure source depuis: ${SRC_IMAGE}"
elif [ "${SRC_MAJOR}" = "${TARGET_MAJOR}" ]; then
  fail "La source et la cible sont identiques (major=${TARGET_MAJOR})."
fi

log "Dump logique de la base applicative depuis ${SRC_DEPLOY}"
kubectl -n "${NS}" exec deploy/"${SRC_DEPLOY}" -- sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' > "${DUMP_FILE}"

if [ ! -s "${DUMP_FILE}" ]; then
  fail "Dump vide: ${DUMP_FILE}"
fi
log "Dump cree: ${DUMP_FILE}"

if kubectl -n "${NS}" get pvc "${DST_PVC}" >/dev/null 2>&1; then
  warn "PVC ${DST_PVC} deja present, reutilisation"
else
  SRC_PVC_SIZE="$(kubectl -n "${NS}" get pvc postgres-pvc -o jsonpath='{.spec.resources.requests.storage}')"
  [ -n "${SRC_PVC_SIZE}" ] || SRC_PVC_SIZE="5Gi"
  log "Creation PVC ${DST_PVC} (${SRC_PVC_SIZE})"
  cat <<YAML | kubectl -n "${NS}" apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${DST_PVC}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${SRC_PVC_SIZE}
YAML
fi

if kubectl -n "${NS}" get deploy "${DST_DEPLOY}" >/dev/null 2>&1; then
  warn "Deployment ${DST_DEPLOY} deja present, patch image/version"
  kubectl -n "${NS}" set image deploy/"${DST_DEPLOY}" postgres="postgres:${TARGET_MAJOR}"
else
  log "Creation deployment/service cible ${DST_DEPLOY}"
  cat <<YAML | kubectl -n "${NS}" apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${DST_DEPLOY}
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: ${DST_DEPLOY}
  template:
    metadata:
      labels:
        app: ${DST_DEPLOY}
    spec:
      securityContext:
        fsGroup: 999
      initContainers:
      - name: init-postgres-permissions
        image: busybox:1.36
        command:
        - sh
        - -c
        - |
          mkdir -p /var/lib/postgresql
          chown -R 999:999 /var/lib/postgresql
        securityContext:
          runAsUser: 0
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql
      containers:
      - name: postgres
        image: postgres:${TARGET_MAJOR}
        securityContext:
          runAsUser: 999
          runAsGroup: 999
        envFrom:
        - configMapRef:
            name: postgres-config
        - secretRef:
            name: postgres-secret
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql
        readinessProbe:
          exec:
            command: ["sh", "-c", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"]
          initialDelaySeconds: 10
          periodSeconds: 10
        livenessProbe:
          exec:
            command: ["sh", "-c", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"]
          initialDelaySeconds: 20
          periodSeconds: 15
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: ${DST_PVC}
---
apiVersion: v1
kind: Service
metadata:
  name: ${DST_SERVICE}
spec:
  selector:
    app: ${DST_DEPLOY}
  ports:
  - port: 5432
    targetPort: 5432
YAML
fi

log "Attente readiness ${DST_DEPLOY}"
kubectl -n "${NS}" rollout status deploy/"${DST_DEPLOY}" --timeout="${WAIT_TIMEOUT}"

log "Restore dump dans ${DST_DEPLOY}"
kubectl -n "${NS}" exec -i deploy/"${DST_DEPLOY}" -- sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${DUMP_FILE}"

log "Alignement mot de passe role applicatif"
kubectl -n "${NS}" exec deploy/"${DST_DEPLOY}" -- sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "ALTER ROLE \"$POSTGRES_USER\" WITH LOGIN PASSWORD '\''$POSTGRES_PASSWORD'\'';"'

log "Verification rapide tables"
kubectl -n "${NS}" exec deploy/"${DST_DEPLOY}" -- sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'

if [ "${SWITCH_BACKEND}" = "true" ]; then
  log "Bascule backend vers ${DST_SERVICE}"
  kubectl -n "${NS}" patch configmap app-config --type merge -p "{\"data\":{\"PS_BDD_SERVER\":\"${DST_SERVICE}\"}}"
  kubectl -n "${NS}" rollout restart deploy/backend
  kubectl -n "${NS}" rollout status deploy/backend --timeout="${WAIT_TIMEOUT}"
  log "Backend bascule sur ${DST_SERVICE}"
else
  warn "SWITCH_BACKEND=false: pas de bascule backend"
fi

cat <<SUMMARY

Migration terminee sans suppression de la BDD source.
- Dump: ${DUMP_FILE}
- Source conservee: deploy/${SRC_DEPLOY} + pvc/postgres-pvc
- Cible: deploy/${DST_DEPLOY} + svc/${DST_SERVICE} + pvc/${DST_PVC}

SUMMARY
