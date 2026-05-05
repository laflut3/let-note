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

## Configuration obligatoire apres deploiement

1. Initialiser Vault (premier demarrage)

```bash
kubectl -n vault exec -it statefulset/vault -- vault operator init
```

2. Sauvegarder les unseal keys + root token hors Git.

3. Unseal Vault

```bash
kubectl -n vault exec -it statefulset/vault -- vault operator unseal <KEY_1>
kubectl -n vault exec -it statefulset/vault -- vault operator unseal <KEY_2>
kubectl -n vault exec -it statefulset/vault -- vault operator unseal <KEY_3>
```

4. Login

```bash
kubectl -n vault exec -it statefulset/vault -- vault login <ROOT_TOKEN>
```

5. Activer KV v2 si necessaire

```bash
kubectl -n vault exec -it statefulset/vault -- vault secrets enable -path=secret kv-v2
```

## Preparation pour Let-Note

Creer les "dossiers" (chemins) Let-Note par projet puis par env:

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

## Securite recommandee

- En prod: TLS obligatoire + certificat valide.
- Preferer auto-unseal (KMS/HSM).
- Ne jamais utiliser le root token dans une app.
- Activer audit logs Vault.
- Rotation periodique des tokens et secrets.
