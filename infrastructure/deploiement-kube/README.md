# Deploiement Kubernetes Let-Note

Ce dossier contient les charts Helm et la configuration GitOps de Let-Note pour les environnements `dev`, `staging` et `prod`.

## Prerequis

| Prerequis | Detail |
| --- | --- |
| Kubernetes | Cluster accessible avec `kubectl`. |
| Helm | Helm 3 installe pour rendre les charts. |
| DNS prod | Le host public prod doit pointer vers l'ingress. |
| Vault | Les secrets applicatifs doivent etre renseignes dans Vault. |
| Images | Les images backend/frontend doivent exister dans `ghcr.io/laflut3`. |

## Sources de verite

| Source | Role |
| --- | --- |
| `charts/cluster/` | Chart Helm des ressources cluster: namespaces, quotas et limites. |
| `charts/let-note/` | Chart Helm applicatif, source active du deploiement. |
| `charts/let-note/environments/dev.yaml` | Values Helm dev. |
| `charts/let-note/environments/staging.yaml` | Values Helm staging. |
| `charts/let-note/environments/prod.yaml` | Values Helm prod. |
| `gitops/argocd/applicationset.yaml` | ApplicationSet ArgoCD qui genere les Applications `dev`, `staging` et `prod`. |
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

## Deploiement par tag

Le deploiement prod courant passe par le workflow GitHub Actions `Deploy`.

| Secret GitHub | Role |
| --- | --- |
| `KUBE_CONFIG_AMD64_B64` | Kubeconfig base64 du cluster prod amd64. |
| `KUBE_CONFIG_ARM64_B64` | Kubeconfig base64 du cluster prod arm64. |

Le workflow est declenchable uniquement manuellement (`workflow_dispatch`) depuis un tag SemVer `v*`. Il propose trois cases `dev`, `staging` et `prod`; chaque environnement selectionne lance un job `amd64` et un job `arm64`.

Le tag `vx.y.z` deploie les images `x.y.z-amd64` et `x.y.z-arm64`.

Le workflow applique directement Helm avec `helm upgrade --install`; il n'appelle pas [`deploy-app.sh`](./deploy-app.sh).

## Rendu Helm

Rendu local d'un environnement:

```bash
helm template let-note-dev ./charts/let-note --namespace dev -f ./charts/let-note/environments/dev.yaml
```

Le script [`deploy-app.sh`](./deploy-app.sh) ajoute automatiquement le tag image lu depuis [`deploy-config.toml`](./deploy-config.toml), le path Vault, le host ingress et le `deploy-id`.

Rendu local des ressources cluster:

```bash
helm template let-note-cluster ./charts/cluster
```
