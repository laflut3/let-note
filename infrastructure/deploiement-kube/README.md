# Deploiement Kube Let-Note

## But

Deployer Let-Note sur Kubernetes (`dev`, `staging`, `prod`) avec un seul script:
[`deploy-app.sh`](/home/ltorres/perso/let-note/infrastructure/deploiement-kube/deploy-app.sh)

## Prerequis

- `kubectl`
- cluster accessible
- DNS prod vers l'ingress (`let-note.polydo.dev`)
- Vault configure (voir [`vault.md`](/home/ltorres/perso/let-note/infrastructure/deploiement-kube/vault.md))

## Configuration

Le deploiement ne depend plus de fichier `.env`.

Sources de verite:
- Fichier TOML local pour le choix de version/arch:
  - `infrastructure/deploiement-kube/deploy-config.toml`:
    - `[deploy].version`
    - `[deploy].arch` (`amd64`, `arm64`, `multi`)
- Vault KVv2:
  - `secret/shared/let-note/deploy`:
    - `LET_NOTE_VERSION`
    - `LET_NOTE_ARCH` (optionnel, `amd64` par defaut)
    - `VAULT_APP_TOKEN`
  - `secret/dev/let-note`, `secret/staging/let-note`, `secret/prod/let-note`:
    - `PS_BDD_DB`, `PS_BDD_USER`, `PS_BDD_PASS`
    - `S3_ACCESS_KEY`, `S3_SECRET_KEY`
    - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`
    - `INGRESS_HOST` (optionnel)
- Kubernetes:
  - namespaces/quotas et ressources applicatives gerees par `deploy-app.sh`

Variables shell optionnelles:
- `VAULT_ADDR` (defaut: `http://vault.vault.svc.cluster.local:8200`)
- `VAULT_TOKEN` ou session `vault login`
- `VAULT_KV_MOUNT` (defaut: `secret`)

Priorite de resolution pour `version`/`arch`:
1. options CLI `--version` / `--arch`
2. `deploy-config.toml`
3. Vault (`secret/shared/let-note/deploy`)

## Deploiement

```bash
./infrastructure/deploiement-kube/deploy-app.sh dev
./infrastructure/deploiement-kube/deploy-app.sh staging
./infrastructure/deploiement-kube/deploy-app.sh prod
./infrastructure/deploiement-kube/deploy-app.sh all
```

Mode Vault:
- strict: lecture Vault uniquement (aucune ecriture/sync vers Vault par le script)

Exemple:

```bash
./infrastructure/deploiement-kube/deploy-app.sh prod
```

## TLS prod

cert-manager en HTTP-01 (pas de Cloudflare API):
- DNS vers ingress
- ports 80/443 ouverts

## Cluster

Provisioning K3s: [`cluster/provision-k3s-prod.sh`](/home/ltorres/perso/let-note/infrastructure/deploiement-kube/cluster/provision-k3s-prod.sh)
