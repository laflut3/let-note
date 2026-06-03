# Deploiement Kubernetes Let-Note

Ce dossier contient le chart Helm et les manifests cluster de Let-Note pour les environnements `dev`, `staging` et `prod`.

## Prerequis

| Prerequis | Detail |
| --- | --- |
| Kubernetes | Cluster accessible avec `kubectl`. |
| Helm | Helm 3 installe pour rendre le chart applicatif. |
| DNS prod | Le host public prod doit pointer vers l'ingress. |
| Vault | Les secrets applicatifs doivent etre renseignes dans Vault. |
| Images | Les images backend/frontend doivent exister dans `ghcr.io/laflut3`. |

## Sources de verite

| Source | Role |
| --- | --- |
| `helm/let-note/` | Chart Helm applicatif, source active du deploiement. |
| `helm/let-note/environments/dev.yaml` | Values Helm dev. |
| `helm/let-note/environments/staging.yaml` | Values Helm staging. |
| `helm/let-note/environments/prod.yaml` | Values Helm prod. |
| `argocd/applicationset.yaml` | ApplicationSet ArgoCD qui genere les Applications `dev`, `staging` et `prod`. |
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

## Rendu Helm

Rendu local d'un environnement:

```bash
helm template let-note-dev ./helm/let-note --namespace dev -f ./helm/let-note/environments/dev.yaml
```

Le script [`deploy-app.sh`](./deploy-app.sh) ajoute automatiquement le tag image lu depuis [`deploy-config.toml`](./deploy-config.toml), le path Vault, le host ingress et le `deploy-id`.

## Cluster

Provisioning K3s: [`cluster/provision-k3s-prod.sh`](./cluster/provision-k3s-prod.sh)
