# Deploiement Kube Let-Note

Un seul script orchestre tout:
1. applique namespaces/quotas
2. synchronise automatiquement les variables applicatives dans Vault (`kv put`) uniquement si le path n'existe pas deja
3. deploie backend/frontend/postgres/seaweed
4. applique les migrations SQL
5. prepare HTTPS automatiquement (mkcert si disponible, sinon auto-signe)
6. verifie les images deployees

Script principal: [`deploy-app.sh`](/home/ltorres/perso/let-note/infrastructure/deploiement-kube/deploy-app.sh)

## Configuration

Copier le template puis remplir les valeurs:

```bash
cp infrastructure/deploiement-kube/.env.exemple infrastructure/deploiement-kube/.env
```

Variables critiques dans `.env`:
- `VAULT_ADMIN_TOKEN`: token Vault avec droits d'ecriture sur `secret/data/let-note/*`
- `VAULT_APP_TOKEN`: token injecte dans `secret/vault-app-auth` pour le backend
- `LET_NOTE_VERSION`, `LET_NOTE_ARCH`
- toutes les variables `PS_BDD_*`, `JWT_SECRET_*`, `S3_*` par environnement
- `ADMIN_EMAIL_*`, `ADMIN_PASSWORD_*`, `ADMIN_PRENOM_*`, `ADMIN_NOM_*` pour le bootstrap du premier compte admin
- `ENABLE_HTTPS=true` pour generer le secret TLS automatiquement
- `TLS_MODE=auto|mkcert|selfsigned` (recommande: `auto`)
- `MKCERT_INSTALL_CA=true|false` (recommande: `true`)
- `INGRESS_HOST_DEV|STAGING|PROD` pour les hosts exposes

## IMPORTANT: recuperer / regenerer VAULT_APP_TOKEN

Lire le token actuellement injecte dans Kubernetes:

```bash
kubectl -n dev get secret vault-app-auth -o jsonpath='{.data.token}' | base64 -d; echo
```

Regenerer un token d'app (recommande):

```bash
export VAULT_ADDR='http://10.42.0.7:8200'
export VAULT_TOKEN='<TOKEN_ADMIN>'

cat > /tmp/let-note-dev-read.hcl <<'EOF'
path "secret/data/let-note/dev" { capabilities = ["read"] }
path "secret/metadata/let-note/dev" { capabilities = ["read"] }
EOF

vault policy write let-note-dev-read /tmp/let-note-dev-read.hcl
APP_TOKEN="$(vault token create -policy=let-note-dev-read -field=token)"
echo "$APP_TOKEN"
```

Si la commande `vault` n'est pas installee localement, utiliser le pod Vault:

```bash
kubectl -n default exec -i vault-0 -- env VAULT_ADDR='http://127.0.0.1:8200' VAULT_TOKEN='<TOKEN_ADMIN>' \
  vault policy write let-note-dev-read - <<'EOF'
path "secret/data/let-note/dev" { capabilities = ["read"] }
path "secret/metadata/let-note/dev" { capabilities = ["read"] }
EOF

APP_TOKEN="$(
  kubectl -n default exec -i vault-0 -- env VAULT_ADDR='http://127.0.0.1:8200' VAULT_TOKEN='<TOKEN_ADMIN>' \
    vault token create -policy=let-note-dev-read -field=token
)"
echo "$APP_TOKEN"
```

Puis mettre ce token dans `infrastructure/deploiement-kube/.env`:

```bash
VAULT_APP_TOKEN=<APP_TOKEN>
```

Appliquer ensuite le token dans Kubernetes:

```bash
kubectl -n dev create secret generic vault-app-auth \
  --from-literal=token="$APP_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Usage

```bash
# tous les environnements
./infrastructure/deploiement-kube/deploy-app.sh all

# un environnement
./infrastructure/deploiement-kube/deploy-app.sh dev
./infrastructure/deploiement-kube/deploy-app.sh staging
./infrastructure/deploiement-kube/deploy-app.sh prod

# override version/arch
./infrastructure/deploiement-kube/deploy-app.sh prod --version 1.0.0 --arch multi
```

## HTTPS local automatique

Le script gere automatiquement TLS:
- `TLS_MODE=auto`:
  - utilise `mkcert` si la commande existe sur la machine
  - sinon fallback auto-signe
- `TLS_MODE=mkcert`: force `mkcert` (fallback auto-signe si echec)
- `TLS_MODE=selfsigned`: force certificat auto-signe

Pre-requis conseilles pour un cadenas vert local:

```bash
sudo apt install -y mkcert libnss3-tools
```

Avec `MKCERT_INSTALL_CA=true`, le script tente `mkcert -install` automatiquement.
Ensuite il cree le secret TLS Kubernetes et affiche dans les logs:
- `subject`
- `issuer`
- dates de validite
- mode de confiance (`TRUSTED_LOCAL_CA` ou `NON_TRUSTED`)

## Script update BDD uniquement

Script dedie: [`update-db.sh`](/home/ltorres/perso/let-note/infrastructure/deploiement-kube/update-db.sh)

```bash
./infrastructure/deploiement-kube/update-db.sh dev
./infrastructure/deploiement-kube/update-db.sh staging
./infrastructure/deploiement-kube/update-db.sh prod
./infrastructure/deploiement-kube/update-db.sh all
```

## Options

- `--skip-vault-sync`: saute la phase d'ecriture des variables dans Vault
- `--force-vault-sync`: force la reecriture Vault meme si les donnees existent deja

Exemple:

```bash
./infrastructure/deploiement-kube/deploy-app.sh dev --skip-vault-sync
./infrastructure/deploiement-kube/deploy-app.sh dev --force-vault-sync
```
