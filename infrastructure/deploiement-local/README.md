# Deploiement Local (Docker Compose)

Ce dossier permet de lancer localement:
- Vault
- Backend
- Frontend
- PostgreSQL
- Migrations BDD automatiques

## Fichiers

- `compose.yml`
- `.env.example`

## Demarrage

```bash
cd infrastructure/deploiement-local
cp .env.example .env
docker compose up -d --build
```

## URLs

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8081`
- Vault UI: `http://127.0.0.1:8200`

## Migrations BDD

Les scripts SQL de `infrastructure/BDD/migration` sont appliques automatiquement par le service `db-migrate` au demarrage.

### Rejouer les migrations depuis zero

```bash
docker compose down -v
docker compose up -d --build
```

## Donnees Vault initialisees automatiquement

Au demarrage, `vault-init` ecrit `secret/let-note/dev` avec:
- `PS_BDD_DB`
- `PS_BDD_USER`
- `PS_BDD_PASS`
- `JWT_SECRET`
- `COOKIE_SECURE`

## Verification rapide

```bash
docker compose logs --tail=100 db-migrate vault-init backend
curl http://127.0.0.1:8081/api/health
```

## Notes

- Le backend lit les secrets sensibles depuis Vault (`secret/let-note/dev`).
- Ce setup est pour dev local (Vault en mode `-dev`).
