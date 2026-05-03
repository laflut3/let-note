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

## Installer pre-commit

```sh
python3 -m pip install --user pre-commit
pre-commit install
pre-commit run --all-files
```

## Deploiement des ressources Kubernetes

Prerequis:
- `kubectl` configure sur le cluster cible
- support Kustomize (integre a `kubectl`)

Depuis la racine du projet (`~/perso/let-note`):

```sh
# 1) Namespaces + quotas/limites
kubectl apply -f infrastructure/deployment/cluster/namespaces.yaml
kubectl apply -f infrastructure/deployment/cluster/quotas-limits.yaml

# 2) Deploiement applicatif
kubectl apply -k infrastructure/deployment/environments/dev
kubectl apply -k infrastructure/deployment/environments/staging
kubectl apply -k infrastructure/deployment/environments/prod
```
