# Deploiement Vault (rapide)

Ce dossier est pilote par scripts.

## 1) Installer + initialiser Vault

Depuis la racine du repo:

```bash
./infrastructure/deploiement-vault/install-and-setup-vault.sh
```

Le script:
- deploye Vault (`overlays/shared`)
- initialise Vault si necessaire
- demande 3 unseal keys
- demande le root token
- active `kv-v2` si necessaire
- active l'audit log
- cree une policy read + token app

## 2) Configurer les secrets Let-Note via `.env`

Edite:
- [`.env`](/home/ltorres/perso/let-note/infrastructure/deploiement-vault/.env)
- modele: [`.env.example`](/home/ltorres/perso/let-note/infrastructure/deploiement-vault/.env.example)

Puis lance:

```bash
./infrastructure/deploiement-vault/setup-let-note-vault.sh
```

Le script charge automatiquement `.env`, ecrit:
- `secret/let-note/dev`
- `secret/let-note/staging`
- `secret/let-note/prod`

et affiche `VAULT_APP_TOKEN`.

## 3) Deployer l'application

```bash
export VAULT_APP_TOKEN='<token-affiche-par-le-script>'
./infrastructure/deployment/deploy-app.sh all
```

## Commandes brutes (manuel, minimum)

```bash
kubectl apply -k infrastructure/deploiement-vault/overlays/shared
kubectl -n vault rollout restart statefulset vault
kubectl -n vault get pods,svc,ingress,networkpolicy
```
