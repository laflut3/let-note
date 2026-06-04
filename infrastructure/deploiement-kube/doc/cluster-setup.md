# Activation GitOps Argo CD

Le cluster possede deja Argo CD, Traefik, `local-path`, Metrics Server, cert-manager et Vault. GitHub Actions ne doit plus acceder directement a Kubernetes.

## 1. Prerequis runtime

Verifier uniquement que les secrets requis existent:

```bash
kubectl -n prod get secret postgres-secret
kubectl -n vault get pod vault-0
kubectl get clusterissuer letsencrypt-prod
```

Repeter la verification de `postgres-secret` pour `dev` et `staging` uniquement avant de les ajouter a l'ApplicationSet.

Les valeurs Vault attendues sont documentees dans [`vault-secret.md`](./vault-secret.md).

## 2. Activer l'ApplicationSet

Depuis la racine du depot, apres avoir pousse cette configuration sur `main`:

```bash
kubectl apply -f infrastructure/deploiement-kube/gitops/argocd/applicationset.yaml
```

Verifier les Applications generees:

```bash
kubectl -n argocd get applications,applicationsets
kubectl -n argocd get application let-note-prod
```

L'ApplicationSet genere actuellement uniquement `let-note-prod`, pour correspondre au cluster existant. L'Application suit `main` et synchronise automatiquement `environments/prod.yaml`.

Pour activer ensuite `dev` ou `staging`, creer d'abord leurs secrets runtime, puis ajouter leur entree dans `gitops/argocd/applicationset.yaml`:

```yaml
- env: dev
- env: staging
```

## 3. Configurer GitHub

Le workflow `Promote release` ouvre une pull request qui modifie uniquement les tags multi-architecture de l'environnement selectionne. Kubernetes choisit automatiquement l'image correspondant a l'architecture du noeud.

Configurer:

- un secret repository `GITOPS_TOKEN`: token fine-grained limite a ce repository avec `Contents: Read and write` et `Pull requests: Read and write`;
- GitHub Environment `prod`;
- une approbation obligatoire sur l'environnement `prod`;
- une protection de `main` exigeant les checks avant merge.

Aucun `KUBE_CONFIG_AMD64`, `KUBE_CONFIG_ARM64` ou acces au port Kubernetes `6443` n'est necessaire dans GitHub. Le token GitOps permet aux pull requests de promotion de declencher normalement les checks CI.

## 4. Revoquer l'ancien acces Kubernetes GitHub

Supprimer le compte de deploiement direct precedemment cree:

```bash
kubectl delete clusterrolebinding let-note-deployer --ignore-not-found
kubectl delete clusterrole let-note-deployer --ignore-not-found
kubectl -n kube-system delete serviceaccount github-let-note-deploy --ignore-not-found
```

Supprimer aussi les anciens secrets GitHub `KUBE_CONFIG_AMD64` et `KUBE_CONFIG_ARM64` s'ils existent.

## 5. Promouvoir une release

1. Creer et pousser un tag `vX.Y.Z`.
2. Attendre la fin du workflow `Release`.
3. Lancer manuellement `Promote release` depuis ce tag.
4. Choisir l'environnement.
5. Relire et merger la pull request creee.
6. Argo CD detecte le merge et synchronise le cluster.

Verifier:

```bash
kubectl -n argocd get applications
kubectl -n prod get deploy,pods,hpa,pdb,job
curl -fsS https://let-note.prod.polydo.dev/api/health
```

## 6. Rollback

Pour revenir a une release precedente, revert la pull request de promotion ou remets les anciens tags dans `charts/let-note/environments/<env>.yaml`, puis merge. Argo CD restaurera automatiquement cet etat.
