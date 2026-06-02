# Vault Secrets a renseigner

Ce fichier liste toutes les donnees Vault necessaires pour deployer Let-Note sans `.env`.

## 1) Secret global de deploiement

Path KVv2: `secret/shared/let-note/deploy`

Champs:

- `LET_NOTE_VERSION`: version image a deployer
  - Exemple: `1.3.0`
- `LET_NOTE_ARCH`: architecture image (`amd64`, `arm64`, `multi`)
  - Exemple: `amd64`
- `VAULT_APP_TOKEN`: token lu par le backend pour recuperer les secrets applicatifs
  - Exemple: `hvs.CAESIExampleTokenForLetNoteApp123456789`

Exemple commande:

```bash
vault kv put secret/shared/let-note/deploy \
  LET_NOTE_VERSION="1.3.0" \
  LET_NOTE_ARCH="amd64" \
  VAULT_APP_TOKEN="hvs.CAESIExampleTokenForLetNoteApp123456789"
```

## 2) Secrets applicatifs par environnement

Paths KVv2:

- `secret/dev/let-note`
- `secret/staging/let-note`
- `secret/prod/let-note`

Champs obligatoires:

- `PS_BDD_DB`: nom de base PostgreSQL
- `PS_BDD_USER`: utilisateur PostgreSQL
- `PS_BDD_PASS`: mot de passe PostgreSQL
- `PS_BDD_SERVER`: host PostgreSQL (souvent `postgres`)
- `PS_BDD_PORT`: port PostgreSQL (souvent `5432`)
- `JWT_SECRET`: secret JWT backend
- `COOKIE_SECURE`: `true` en staging/prod, `false` en dev local
- `ADMIN_EMAIL`: email admin initial
- `ADMIN_PASSWORD`: mot de passe admin initial
- `ADMIN_PRENOM`: prenom admin initial
- `ADMIN_NOM`: nom admin initial
- `S3_ENDPOINT`: endpoint S3 interne
- `S3_REGION`: region S3
- `S3_BUCKET`: bucket S3
- `S3_ACCESS_KEY`: cle d'acces S3
- `S3_SECRET_KEY`: cle secrete S3
- `INGRESS_HOST`: host public de l'environnement (recommande)

### Exemple dev

```bash
vault kv put secret/dev/let-note \
  PS_BDD_DB="let_note_dev" \
  PS_BDD_USER="let_note" \
  PS_BDD_PASS="Dev-Postgres-ChangeMe-123!" \
  PS_BDD_SERVER="postgres" \
  PS_BDD_PORT="5432" \
  JWT_SECRET="dev-jwt-secret-very-long-random-string" \
  COOKIE_SECURE="false" \
  ADMIN_EMAIL="admin-dev@let-note.local" \
  ADMIN_PASSWORD="AdminDev#2026" \
  ADMIN_PRENOM="Super" \
  ADMIN_NOM="Admin" \
  S3_ENDPOINT="http://seaweed-s3:8333" \
  S3_REGION="us-east-1" \
  S3_BUCKET="let-note-dev-files" \
  S3_ACCESS_KEY="letnote-dev-ak" \
  S3_SECRET_KEY="letnote-dev-sk" \
  INGRESS_HOST="dev.app.local"
```

### Exemple staging

```bash
vault kv put secret/staging/let-note \
  PS_BDD_DB="let_note_staging" \
  PS_BDD_USER="let_note" \
  PS_BDD_PASS="Staging-Postgres-ChangeMe-123!" \
  PS_BDD_SERVER="postgres" \
  PS_BDD_PORT="5432" \
  JWT_SECRET="staging-jwt-secret-very-long-random-string" \
  COOKIE_SECURE="true" \
  ADMIN_EMAIL="admin-staging@let-note.local" \
  ADMIN_PASSWORD="AdminStaging#2026" \
  ADMIN_PRENOM="Super" \
  ADMIN_NOM="Admin" \
  S3_ENDPOINT="http://seaweed-s3:8333" \
  S3_REGION="us-east-1" \
  S3_BUCKET="let-note-staging-files" \
  S3_ACCESS_KEY="letnote-staging-ak" \
  S3_SECRET_KEY="letnote-staging-sk" \
  INGRESS_HOST="staging.app.local"
```

### Exemple prod

```bash
vault kv put secret/prod/let-note \
  PS_BDD_DB="let_note_prod" \
  PS_BDD_USER="let_note" \
  PS_BDD_PASS="Prod-Postgres-Strong-ChangeMe-123!" \
  PS_BDD_SERVER="postgres" \
  PS_BDD_PORT="5432" \
  JWT_SECRET="prod-jwt-secret-very-long-random-string" \
  COOKIE_SECURE="true" \
  ADMIN_EMAIL="admin@let-note.polydo.dev" \
  ADMIN_PASSWORD="AdminProd#2026" \
  ADMIN_PRENOM="Super" \
  ADMIN_NOM="Admin" \
  S3_ENDPOINT="http://seaweed-s3:8333" \
  S3_REGION="us-east-1" \
  S3_BUCKET="let-note-prod-files" \
  S3_ACCESS_KEY="letnote-prod-ak" \
  S3_SECRET_KEY="letnote-prod-sk" \
  INGRESS_HOST="let-note.polydo.dev"
```

## 3) Verification rapide

```bash
vault kv get secret/shared/let-note/deploy
vault kv get secret/dev/let-note
vault kv get secret/staging/let-note
vault kv get secret/prod/let-note
```

## 4) Notes securite

- Ne jamais commiter de vraies valeurs dans Git.
- Les valeurs ci-dessus sont des exemples.
- Regenerer `JWT_SECRET`, `ADMIN_PASSWORD`, `PS_BDD_PASS`, `S3_SECRET_KEY` avec des valeurs fortes.
