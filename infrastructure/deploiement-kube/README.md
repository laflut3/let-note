# Deploiement Kubernetes Let-Note

Ce dossier contient les manifests Kubernetes de Let-Note pour les environnements `dev`, `staging` et `prod`.

## Prerequis

| Prerequis | Detail |
| --- | --- |
| Kubernetes | Cluster accessible avec `kubectl`. |
| DNS prod | Le host public prod doit pointer vers l'ingress. |
| Vault | Les secrets applicatifs doivent etre renseignes dans Vault. |
| Images | Les images backend/frontend doivent exister dans `ghcr.io/laflut3`. |

## Sources de verite

| Source | Role |
| --- | --- |
| `base/` | Ressources communes a tous les environnements. |
| `environments/dev/` | Overlay Kubernetes dev. |
| `environments/staging/` | Overlay Kubernetes staging. |
| `environments/prod/` | Overlay Kubernetes prod. |
| `deploy-config.toml` | Version et architecture des images applicatives. |
| `vault-secret.md` | Donnees Vault attendues. |
| `script.md` | Commandes, options et variables du script de deploiement. |

## Documentation

| Document | Contenu |
| --- | --- |
| [`script.md`](./script.md) | Utilisation du script de deploiement, commandes, options, variables et garde-fous. |
| [`vault-secret.md`](./vault-secret.md) | Secrets Vault applicatifs et configuration des roles Vault. |

## TLS prod

cert-manager utilise l'Ingress prod pour generer le certificat TLS. Le DNS doit pointer vers l'ingress et les ports 80/443 doivent etre ouverts.

## Cluster

Provisioning K3s: [`cluster/provision-k3s-prod.sh`](./cluster/provision-k3s-prod.sh)
