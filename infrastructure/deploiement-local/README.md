# Deploiement Local (Docker Compose)

Ce dossier lance un environnement local complet pour developper rapidement:
- PostgreSQL
- Migration SQL automatique
- Backend
- Frontend

## Prerequis

- Docker et Docker Compose
- Ports libres:
  - `5432` (PostgreSQL)
  - `8081` (Backend)
  - `5173` (Frontend)

## Fichiers

- `compose.yml`: definition des services
- `.env.example`: valeurs par defaut pour le local
- `.env`: fichier local reel (a creer depuis `.env.example`)

## Demarrage

```bash
cd infrastructure/deploiement-local
cp .env.example .env
docker compose up -d --build
```

## Arret

```bash
docker compose down
```

## Reset complet (BDD incluse)

```bash
docker compose down -v
docker compose up -d --build
```

## URLs

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8081`
- Healthcheck backend: `http://127.0.0.1:8081/api/health`

## Variables importantes (`.env`)

- `PS_BDD_DB`: nom de base PostgreSQL
- `PS_BDD_USER`: utilisateur PostgreSQL
- `PS_BDD_PASS`: mot de passe PostgreSQL
- `PS_BDD_PORT`: port expose PostgreSQL (hote)
- `BACKEND_PORT`: port expose backend (hote)
- `FRONTEND_PORT`: port expose frontend (hote)
- `VITE_API_BASE_URL`: URL API injectee au build frontend

## Migrations SQL

Les migrations dans `infrastructure/BDD/migration` sont executees automatiquement au demarrage par le service `db-migrate`.

Pour verifier:

```bash
docker compose logs --tail=200 db-migrate
```

## Verification rapide

```bash
docker compose ps
docker compose logs --tail=200 backend frontend
curl http://127.0.0.1:8081/api/health
```

## Depannage

- Backend ne demarre pas:
  - verifier `docker compose logs backend`
  - verifier que PostgreSQL est `healthy` avec `docker compose ps`
- Frontend ne joint pas l'API:
  - verifier `VITE_API_BASE_URL` dans `.env`
  - rebuild frontend: `docker compose up -d --build frontend`
- Migrations rejouees proprement:
  - `docker compose down -v` puis `docker compose up -d --build`

## Note Vault

Ce deploiement local n'injecte pas automatiquement de variables Vault.
Il est destine au developpement local avec les valeurs `.env` de ce dossier.
