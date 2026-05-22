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
