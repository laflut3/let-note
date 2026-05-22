# Deploiement Let-Note (Kubernetes)

Ce dossier deploie **uniquement l'application Let-Note** (frontend + backend) sur 3 environnements:
- dev
- staging
- prod

Le Vault est deploie separement via `infrastructure/deploiement-vault`.

## Prerequis

1. Vault deploie et configure.
2. Secrets presents dans Vault:
   - `secret/let-note/dev`
   - `secret/let-note/staging`
   - `secret/let-note/prod`
3. Token Vault applicatif cree avec policy read sur `secret/data/let-note/*`.
4. `VAULT_APP_TOKEN` exporte dans votre shell.

## Variables Vault attendues pour chaque env

- `PS_BDD_SERVER`
- `PS_BDD_PORT`
- `PS_BDD_DB`
- `PS_BDD_USER`
- `PS_BDD_PASS`
- `JWT_SECRET`
- `COOKIE_SECURE`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

## Deploy

Depuis la racine du repo:

```bash
# 1) Namespaces / quotas
kubectl apply -f infrastructure/deployment/cluster/namespaces.yaml
kubectl apply -f infrastructure/deployment/cluster/quotas-limits.yaml

# 2) Export du token Vault applicatif
export VAULT_APP_TOKEN='<token-let-note-read>'

# 3) Deploy app par environnement
kubectl apply -k infrastructure/deployment/environments/dev
kubectl apply -k infrastructure/deployment/environments/staging
kubectl apply -k infrastructure/deployment/environments/prod
```

## Scaling par environnement

- `dev`: 1 replica backend, 1 replica frontend
- `staging`: 2 replicas backend, 2 replicas frontend
- `prod`: 3 replicas backend, 3 replicas frontend

## Verification

```bash
kubectl get deploy,pods,svc,ingress -n dev
kubectl get deploy,pods,svc,ingress -n staging
kubectl get deploy,pods,svc,ingress -n prod
```

## Notes

- Le backend lit Vault via:
  - `VAULT_ADDR=http://vault.vault.svc.cluster.local:18200`
  - `VAULT_KV_MOUNT=secret`
  - `VAULT_SECRET_PATH=let-note/<env>`
- Les overlays `staging` et `prod` remplacent `VAULT_SECRET_PATH` automatiquement.

## Script de deploiement rapide

Script: [deploy-app.sh](/home/ltorres/perso/let-note/infrastructure/deployment/deploy-app.sh)

```bash
export VAULT_APP_TOKEN='<token-let-note-read>'

./infrastructure/deployment/deploy-app.sh all
# ou un seul environnement
./infrastructure/deployment/deploy-app.sh dev
./infrastructure/deployment/deploy-app.sh staging
./infrastructure/deployment/deploy-app.sh prod
```

## Deploy versionne (recommande)

Par defaut, le script lit `infrastructure/deployment/config-let-note.toml`:

```toml
[images]
version = "1.0.0"
arch = "amd64"
```

Vous pouvez aussi surcharger a l'execution:

```bash
# Deploy la release multi-arch 1.0.0 en prod
./infrastructure/deployment/deploy-app.sh prod --version 1.0.0 --arch multi

# Deploy une image monoplatforme (si tag suffixe publie)
./infrastructure/deployment/deploy-app.sh staging --version 1.0.0 --arch amd64
```

Priorite des valeurs:
1. arguments CLI `--version/--arch`
2. variables d'environnement `LET_NOTE_VERSION/LET_NOTE_ARCH`
3. `infrastructure/deployment/config-let-note.toml`
