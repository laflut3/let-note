# Deploiement Vault (Kubernetes)

Ce dossier deploie un Vault **mutualise** reutilisable pour tous les projets.

Objectif:
- 1 Vault pour plusieurs projets
- 1 arborescence de secrets par projet et par environnement

Exemple de convention recommandee:
- `secret/let-note/dev`
- `secret/let-note/staging`
- `secret/let-note/prod`
- `secret/<autre-projet>/dev|staging|prod`

## Structure

- `base/`: ressources communes Vault
- `overlays/shared`: 1 Vault unique partage par tous les environnements

Arborescence de secrets recommandee dans Vault:
- `secret/<projet>/dev`
- `secret/<projet>/staging`
- `secret/<projet>/prod`

## Deployer Vault

```bash
kubectl apply -k infrastructure/deploiement-vault/overlays/shared
```

## Script d'installation + setup

Script fourni: [install-and-setup-vault.sh](/home/ltorres/perso/let-note/infrastructure/deploiement-vault/install-and-setup-vault.sh)

Depuis la racine du repo:

```bash
chmod +x infrastructure/deploiement-vault/install-and-setup-vault.sh
./infrastructure/deploiement-vault/install-and-setup-vault.sh
```

Variables optionnelles:

```bash
PROJECT_NAME=let-note KV_MOUNT=secret APP_TOKEN_TTL=720h ./infrastructure/deploiement-vault/install-and-setup-vault.sh
```

## Setup Let-Note via fichier .env

Fichier de configuration: [\.env](/home/ltorres/perso/let-note/infrastructure/deploiement-vault/.env)

1. Editer les valeurs dans `infrastructure/deploiement-vault/.env`.
2. Charger les variables puis lancer le setup applicatif Vault:

```bash
set -a
source infrastructure/deploiement-vault/.env
set +a

./infrastructure/deploiement-vault/setup-let-note-vault.sh
```

Le script:
- active `kv-v2` sur `secret/` si necessaire
- ecrit `secret/let-note/dev|staging|prod`
- cree la policy `let-note-read`
- cree un token applicatif (`VAULT_APP_TOKEN`)

Verification rapide:

```bash
kubectl -n vault get ns,pods,svc,pvc
```

## Configuration obligatoire apres deploiement

1. Initialiser Vault (premier demarrage)

```bash
kubectl -n vault exec -it statefulset/vault -- sh -c 'export VAULT_ADDR=http://127.0.0.1:8200 && vault operator init'
```

2. Sauvegarder les unseal keys + root token hors Git.

3. Unseal Vault

```bash
kubectl -n vault exec -it statefulset/vault -- sh -c 'export VAULT_ADDR=http://127.0.0.1:8200 && vault operator unseal "KEY_1"'
kubectl -n vault exec -it statefulset/vault -- sh -c 'export VAULT_ADDR=http://127.0.0.1:8200 && vault operator unseal "KEY_2"'
kubectl -n vault exec -it statefulset/vault -- sh -c 'export VAULT_ADDR=http://127.0.0.1:8200 && vault operator unseal "KEY_3"'
```

Note: ne pas utiliser de chevrons `< >` autour des cles dans les commandes shell.

4. Login

```bash
kubectl -n vault exec -it statefulset/vault -- sh -c 'export VAULT_ADDR=http://127.0.0.1:8200 && vault login "ROOT_TOKEN"'
```

5. Activer KV v2 si necessaire

```bash
kubectl -n vault exec -it statefulset/vault -- sh -c 'export VAULT_ADDR=http://127.0.0.1:8200 && vault secrets enable -path=secret kv-v2'
```

## Preparation pour Let-Note

Creer les chemins Let-Note par projet puis par env:

```bash
kubectl -n vault exec -it statefulset/vault -- vault kv put secret/let-note/dev \
  PS_BDD_SERVER='<db-host>' \
  PS_BDD_PORT='5432' \
  PS_BDD_DB='let_note_dev' \
  PS_BDD_USER='let_note' \
  PS_BDD_PASS='<password>' \
  JWT_SECRET='<jwt-secret>' \
  COOKIE_SECURE='false'

kubectl -n vault exec -it statefulset/vault -- vault kv put secret/let-note/staging \
  PS_BDD_SERVER='<db-host>' \
  PS_BDD_PORT='5432' \
  PS_BDD_DB='let_note_staging' \
  PS_BDD_USER='let_note' \
  PS_BDD_PASS='<password>' \
  JWT_SECRET='<jwt-secret>' \
  COOKIE_SECURE='true'

kubectl -n vault exec -it statefulset/vault -- vault kv put secret/let-note/prod \
  PS_BDD_SERVER='<db-host>' \
  PS_BDD_PORT='5432' \
  PS_BDD_DB='let_note_prod' \
  PS_BDD_USER='let_note' \
  PS_BDD_PASS='<password>' \
  JWT_SECRET='<jwt-secret>' \
  COOKIE_SECURE='true'
```

## Policy + token applicatif (par projet)

Policy minimale Let-Note (lecture seulement):

```hcl
path "secret/data/let-note/*" {
  capabilities = ["read"]
}
path "secret/metadata/let-note/*" {
  capabilities = ["read"]
}
```

Creer la policy:

```bash
kubectl -n vault exec -i statefulset/vault -- vault policy write let-note-read - <<'HCL'
path "secret/data/let-note/*" {
  capabilities = ["read"]
}
path "secret/metadata/let-note/*" {
  capabilities = ["read"]
}
HCL
```

Creer un token app:

```bash
kubectl -n vault exec -it statefulset/vault -- vault token create -policy=let-note-read -ttl=720h
```

Ce token doit etre injecte dans le deploiement Let-Note via `VAULT_APP_TOKEN`.

## Depannage

- Si `vault operator init` retourne `HTTP response to HTTPS client`, forcer:
  - `VAULT_ADDR=http://127.0.0.1:8200`
- Si `kubectl` retourne `permission denied` sur `/etc/rancher/k3s/k3s.yaml`, corriger l'acces kubeconfig (sudo/chmod/copie dans `~/.kube/config`).

## Securite recommandee

- En prod: TLS obligatoire + certificat valide.
- Preferer auto-unseal (KMS/HSM).
- Ne jamais utiliser le root token dans une app.
- Activer audit logs Vault.
- Rotation periodique des tokens et secrets.
- Si des cles d'unseal ou le root token sont exposes, les considerer compromis et les regenerer (rekey + nouveaux tokens).
