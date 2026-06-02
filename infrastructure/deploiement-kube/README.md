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
  - `secret/dev/let-note`, `secret/staging/let-note`, `secret/prod/let-note`:
    - `PS_BDD_DB`, `PS_BDD_USER`, `PS_BDD_PASS`
    - `S3_ACCESS_KEY`, `S3_SECRET_KEY`
    - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`
    - `INGRESS_HOST` (optionnel)
- Kubernetes:
  - namespaces/quotas et ressources applicatives gerees par `deploy-app.sh`

Variables shell optionnelles:
- `VAULT_ADDR` (defaut: `http://vault.vault.svc.cluster.local:8200`)
- `VAULT_KV_MOUNT` (defaut: `secret`)
- `VAULT_AUTH_METHOD` (defaut: `kubernetes`)
- `VAULT_K8S_AUTH_MOUNT` (defaut: `kubernetes`)
- `VAULT_K8S_SERVICE_ACCOUNT` (defaut: `let-note-backend`)
- `VAULT_K8S_ROLE_<ENV>` ou `VAULT_K8S_ROLE` (defaut: `let-note-<env>`)

Le script n'a pas besoin de token Vault statique: il cree/utilise un ServiceAccount Kubernetes,
genere un JWT court avec `kubectl create token`, puis s'authentifie a Vault via `auth/<mount>/login`.

Roles Vault attendus par defaut:
- `let-note-dev`: ServiceAccount `let-note-backend`, namespace `dev`
- `let-note-staging`: ServiceAccount `let-note-backend`, namespace `staging`
- `let-note-prod`: ServiceAccount `let-note-backend`, namespace `prod`

Le role Vault doit avoir `bound_service_account_names=let-note-backend` et
`bound_service_account_namespaces=<env>`. Voir `vault-secret.md` pour les commandes completes.

`version` et `arch` sont lues uniquement dans `deploy-config.toml`.

Exemple `deploy-config.toml`:

```toml
[deploy]
version = "1.3.0"
arch = "amd64"
```

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

Pour forcer un nouveau rollout avec le meme tag image:

```bash
./infrastructure/deploiement-kube/deploy-app.sh prod --force-restart
```

## Ordre de setup recommande

1. Renseigner `deploy-config.toml` (`version`, `arch`).
2. Configurer l'auth Vault Kubernetes/OIDC pour les roles `let-note-<env>`.
3. Renseigner Vault:
   - `secret/<env>/let-note` (`dev`, `staging`, `prod`)
4. Lancer `deploy-app.sh <env>`.

## TLS prod

cert-manager en HTTP-01 (pas de Cloudflare API):
- DNS vers ingress
- ports 80/443 ouverts

## Cluster

Provisioning K3s: [`cluster/provision-k3s-prod.sh`](/home/ltorres/perso/let-note/infrastructure/deploiement-kube/cluster/provision-k3s-prod.sh)
