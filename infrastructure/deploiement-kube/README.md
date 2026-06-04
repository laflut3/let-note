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
| `gitops/argocd/applicationset.yaml` | ApplicationSet ArgoCD; `prod` est active par defaut, `dev` et `staging` sont activables apres preparation de leurs secrets. |
| `doc/vault-secret.md` | Donnees Vault attendues. |

## Documentation

| Document | Contenu |
| --- | --- |
| [`doc/vault-secret.md`](./doc/vault-secret.md) | Secrets Vault applicatifs et configuration des roles Vault. |
| [`doc/cluster-setup.md`](./doc/cluster-setup.md) | Activation du deploiement GitOps Argo CD et configuration GitHub minimale. |

## TLS prod

cert-manager utilise l'Ingress prod pour generer le certificat TLS. Le DNS doit pointer vers l'ingress et les ports 80/443 doivent etre ouverts.

## Promotion GitOps par tag

Le workflow GitHub Actions `Promote release` est lance manuellement depuis un tag Git. Il verifie les images multi-architecture, ouvre une pull request modifiant le fichier Helm de l'environnement selectionne, puis Argo CD synchronise automatiquement apres merge.

GitHub Actions n'a aucun kubeconfig et n'accede jamais directement a Kubernetes.

Guide de mise en place minimal: [`doc/cluster-setup.md`](./doc/cluster-setup.md).

## Rendu Helm

Rendu local d'un environnement:

```bash
helm template let-note-dev ./charts/let-note --namespace dev -f ./charts/let-note/environments/dev.yaml
```

Rendu local des ressources cluster:

```bash
helm template let-note-cluster ./charts/cluster
```
