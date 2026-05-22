# Deploiement Kube Let-Note

Un seul script orchestre tout:
1. applique namespaces/quotas
2. synchronise automatiquement les variables applicatives dans Vault (`kv put`)
3. deploie backend/frontend/postgres/seaweed
4. applique les migrations SQL
5. verifie les images deployees

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

## Options

- `--skip-vault-sync`: saute la phase d'ecriture des variables dans Vault

Exemple:

```bash
./infrastructure/deploiement-kube/deploy-app.sh dev --skip-vault-sync
```
