# Let Note

Application d'exemple avec un frontend React et un backend Rust.

## Structure

- `frontend/`: application React (Vite)
- `backend/`: serveur backend Rust

## Lancer le backend

```sh
cargo run -p let-note-backend
```

Backend disponible sur `http://127.0.0.1:8080`.

## Lancer le frontend

```sh
cd frontend
npm install
npm run dev
```

Frontend disponible sur `http://127.0.0.1:5173`.

## Tests backend

```sh
cargo test --workspace
```

## Base de donnees de dev (Docker Compose)

Le fichier `compose.yml` a la racine lance un Postgres de dev.

### 1) Lancer Postgres

```sh
docker compose up -d postgres
```

### 2) Initialiser la BDD avec `sqlx migrate run`

```sh
DATABASE_URL=postgres://<user>:<password>@localhost:5432/<db> sqlx migrate run --source infrastructure/BDD/migration
```

### 3) Lancer le backend connecte a la BDD

```sh
PS_BDD_SERVER=127.0.0.1 \
PS_BDD_PORT=5432 \
PS_BDD_DB=let-note \
PS_BDD_USER=postgres \
PS_BDD_PASS=<password> \
JWT_SECRET=<jwt-secret> \
cargo run -p let-note-backend
```

### 4) Arreter l'environnement BDD

```sh
docker compose down
```

## Vault avec Docker Compose

### Lancer Vault local (mode dev)

```sh
VAULT_DEV_ROOT_TOKEN_ID=root \
PS_BDD_PASS=<password> \
JWT_SECRET=<jwt-secret> \
docker compose --profile vault up -d vault vault-init
```

Le secret applicatif est ecrit dans `secret/let-note` avec les cles:
- `PS_BDD_DB`
- `PS_BDD_USER`
- `PS_BDD_PASS`
- `JWT_SECRET`
- `COOKIE_SECURE`

## Deploiement des ressources Kubernetes

Prerequis:
- `kubectl` configure sur le cluster cible
- support Kustomize (integre a `kubectl`)
- External Secrets Operator installe si vous utilisez l'overlay Vault

Depuis la racine du projet (`~/perso/let-note`):

```sh
# 1) Namespaces + quotas/limites
kubectl apply -f infrastructure/deployment/cluster/namespaces.yaml
kubectl apply -f infrastructure/deployment/cluster/quotas-limits.yaml

# 2) Deploiement applicatif standard
kubectl apply -k infrastructure/deployment/environments/dev
kubectl apply -k infrastructure/deployment/environments/staging
kubectl apply -k infrastructure/deployment/environments/prod
```

## Kubernetes + Vault

Des overlays dedies sont disponibles:
- `infrastructure/deployment/environments/dev-vault`
- `infrastructure/deployment/environments/staging-vault`
- `infrastructure/deployment/environments/prod-vault`

Ces overlays ajoutent:
- `SecretStore` Vault (`vault-backend`)
- `ExternalSecret` qui hydrate `postgres-secret` depuis `secret/let-note`

Exemple:

```sh
kubectl apply -k infrastructure/deployment/environments/staging-vault
```

Avant application, remplacez `REPLACE_WITH_VAULT_TOKEN` dans l'overlay cible par un secret/token Vault adapte.

## Installer pre-commit

```sh
python3 -m pip install --user pre-commit
pre-commit install
pre-commit run --all-files
```
