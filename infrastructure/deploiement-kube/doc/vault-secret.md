# Vault Secrets a renseigner

Ce fichier liste toutes les donnees Vault necessaires pour deployer Let-Note sans `.env`.

Note:
- `version` et `arch` ne sont pas stockees dans Vault.
- Elles sont declarees dans les values Helm par environnement et promues par pull request.
- Le workflow Helm direct ne synchronise pas les credentials SeaweedFS depuis Vault. Les exemples utilisent donc les credentials definis dans les values Helm actuelles.

## 1) Secrets applicatifs par environnement

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
- `APP_PUBLIC_URL`: URL publique de la plateforme, utilisee dans les liens email
- `SMTP_HOST`: hote SMTP Gmail (`smtp.gmail.com`)
- `SMTP_PORT`: port SMTP Gmail (`587`)
- `SMTP_USERNAME`: adresse Gmail utilisee pour envoyer
- `SMTP_PASSWORD`: mot de passe d'application Gmail
- `SMTP_FROM`: expediteur affiche, souvent la meme adresse que `SMTP_USERNAME`
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
  S3_ACCESS_KEY="seaweedfs" \
  S3_SECRET_KEY="seaweedfs" \
  APP_PUBLIC_URL="http://dev.app.local" \
  SMTP_HOST="smtp.gmail.com" \
  SMTP_PORT="587" \
  SMTP_USERNAME="votre-compte@gmail.com" \
  SMTP_PASSWORD="mot-de-passe-application-gmail" \
  SMTP_FROM="votre-compte@gmail.com" \
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
  S3_ACCESS_KEY="seaweedfs" \
  S3_SECRET_KEY="seaweedfs" \
  APP_PUBLIC_URL="https://staging.app.local" \
  SMTP_HOST="smtp.gmail.com" \
  SMTP_PORT="587" \
  SMTP_USERNAME="votre-compte@gmail.com" \
  SMTP_PASSWORD="mot-de-passe-application-gmail" \
  SMTP_FROM="votre-compte@gmail.com" \
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
  ADMIN_EMAIL="admin@let-note.prod.polydo.dev" \
  ADMIN_PASSWORD="AdminProd#2026" \
  ADMIN_PRENOM="Super" \
  ADMIN_NOM="Admin" \
  S3_ENDPOINT="http://seaweed-s3:8333" \
  S3_REGION="us-east-1" \
  S3_BUCKET="let-note-prod-files" \
  S3_ACCESS_KEY="seaweedfs" \
  S3_SECRET_KEY="seaweedfs" \
  APP_PUBLIC_URL="https://let-note.prod.polydo.dev" \
  SMTP_HOST="smtp.gmail.com" \
  SMTP_PORT="587" \
  SMTP_USERNAME="votre-compte@gmail.com" \
  SMTP_PASSWORD="mot-de-passe-application-gmail" \
  SMTP_FROM="votre-compte@gmail.com" \
  INGRESS_HOST="let-note.prod.polydo.dev"
```

## 2) Auth Vault Kubernetes/OIDC

Le deploiement utilise un JWT court de ServiceAccount Kubernetes, pas un token Vault statique.
Les roles Vault attendus par defaut sont:

- `let-note-dev`: ServiceAccount `let-note-backend`, namespace `dev`
- `let-note-staging`: ServiceAccount `let-note-backend`, namespace `staging`
- `let-note-prod`: ServiceAccount `let-note-backend`, namespace `prod`

Chaque role doit pouvoir lire le path KVv2 correspondant, par exemple `secret/data/prod/let-note` pour prod.

Exemple de configuration Vault:

```bash
vault policy write let-note-prod - <<'HCL'
path "secret/data/prod/let-note" {
  capabilities = ["read"]
}
HCL

vault write auth/kubernetes/role/let-note-prod \
  bound_service_account_names="let-note-backend" \
  bound_service_account_namespaces="prod" \
  policies="let-note-prod" \
  ttl="1h"
```

Adapter `prod` en `dev` ou `staging` pour creer les roles `let-note-dev` et `let-note-staging`.
Si Vault retourne `service account name not authorized`, le role existe mais son binding ne correspond pas au ServiceAccount ou au namespace.

## 3) Verification rapide

```bash
vault kv get secret/dev/let-note
vault kv get secret/staging/let-note
vault kv get secret/prod/let-note
```

## 4) Notes securite

- Ne jamais commiter de vraies valeurs dans Git.
- Les valeurs ci-dessus sont des exemples.
- Regenerer `JWT_SECRET`, `ADMIN_PASSWORD`, `PS_BDD_PASS`, `S3_SECRET_KEY` avec des valeurs fortes.
