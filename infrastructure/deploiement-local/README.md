# Deploiement Local (Docker Compose)

Ce dossier permet de lancer localement:
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

## Migrations BDD

Les scripts SQL de `infrastructure/BDD/migration` sont appliques automatiquement par le service `db-migrate` au demarrage.

### Rejouer les migrations depuis zero

```bash
docker compose down -v
docker compose up -d --build
```

## Verification rapide

```bash
docker compose logs --tail=100 db-migrate backend
curl http://127.0.0.1:8081/api/health
```

## Notes

- Le backend lit les secrets sensibles depuis Vault (`secret/let-note/dev`).
- Vault n'est pas deploie localement ici. Renseigner `VAULT_ADDR` et `VAULT_TOKEN` dans `.env`.
