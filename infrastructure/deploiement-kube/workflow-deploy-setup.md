# Mise en place du deploy GitHub Actions

Ce guide prepare un cluster Kubernetes pour le workflow GitHub Actions `Deploy`.

## 1. Prerequis cluster

Installer ou verifier sur chaque cluster cible (`amd64` et `arm64`):

- Traefik avec une `IngressClass` nommee `traefik`.
- Un provisioner compatible avec la `StorageClass` `local-path`.
- Metrics Server pour les HPA backend/frontend actives en prod.
- cert-manager et le `ClusterIssuer` `letsencrypt-prod` pour la prod.
- Vault accessible depuis le cluster si le backend utilise l'auth Kubernetes Vault.
- Une API Kubernetes joignable depuis le runner GitHub Actions, ou un runner self-hosted dans le reseau du cluster.

## 2. Compte de deploy Kubernetes

Appliquer sur chaque cluster:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: github-let-note-deploy
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: let-note-deployer
rules:
  - apiGroups: [""]
    resources:
      - namespaces
      - resourcequotas
      - limitranges
      - services
      - configmaps
      - secrets
      - persistentvolumeclaims
      - serviceaccounts
      - pods
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["cert-manager.io"]
    resources: ["certificates"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: let-note-deployer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: let-note-deployer
subjects:
  - kind: ServiceAccount
    name: github-let-note-deploy
    namespace: kube-system
```

## 3. Kubeconfig GitHub Actions

Generer un kubeconfig par cluster:

```bash
TOKEN="$(kubectl -n kube-system create token github-let-note-deploy --duration=8760h)"
SERVER="$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')"
CA_DATA="$(kubectl config view --raw --minify --flatten -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')"

cat > kubeconfig-let-note.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: let-note
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${CA_DATA}
users:
  - name: github-let-note-deploy
    user:
      token: ${TOKEN}
contexts:
  - name: let-note
    context:
      cluster: let-note
      user: github-let-note-deploy
current-context: let-note
EOF
```

Ajouter le contenu brut du fichier dans les secrets GitHub:

- `KUBE_CONFIG_AMD64` pour le cluster amd64.
- `KUBE_CONFIG_ARM64` pour le cluster arm64.

Si la lame serveur ne contient qu'un cluster `amd64`, seul `KUBE_CONFIG_AMD64` est requis et il faut selectionner `amd64` au lancement du workflow. Ne pas selectionner `both` sans avoir configure les deux secrets.

## 4. Secrets Kubernetes runtime

Le workflow force `secrets.create=false`, donc le secret PostgreSQL doit exister avant le deploy.

Pour chaque environnement:

```bash
ENV_NAME=dev
POSTGRES_PASSWORD='change-me'

kubectl create namespace "${ENV_NAME}" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "${ENV_NAME}" create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Repeter pour `dev`, `staging` et `prod` avec des mots de passe differents.
La valeur `POSTGRES_PASSWORD` doit correspondre au `PS_BDD_PASS` stocke dans Vault pour le meme environnement.

## 5. Secrets Vault applicatifs

Le backend lit ses secrets applicatifs via Vault avec les chemins:

- `secret/dev/let-note`
- `secret/staging/let-note`
- `secret/prod/let-note`

Chaque chemin doit contenir au minimum les variables documentees dans [`vault-secret.md`](./vault-secret.md), notamment `PS_BDD_DB`, `PS_BDD_USER`, `PS_BDD_PASS`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` et `JWT_SECRET`.

Le workflow Helm ne synchronise pas les credentials SeaweedFS depuis Vault. Avec les values actuelles, definir `S3_ACCESS_KEY=seaweedfs` et `S3_SECRET_KEY=seaweedfs` dans Vault, ou remplacer la gestion du `seaweed-s3-config` par un Secret externe avant d'utiliser d'autres credentials.

Creer aussi les roles Kubernetes Vault:

```bash
vault write auth/kubernetes/role/let-note-dev \
  bound_service_account_names=let-note-backend \
  bound_service_account_namespaces=dev \
  policies=let-note-dev \
  ttl=24h

vault write auth/kubernetes/role/let-note-staging \
  bound_service_account_names=let-note-backend \
  bound_service_account_namespaces=staging \
  policies=let-note-staging \
  ttl=24h

vault write auth/kubernetes/role/let-note-prod \
  bound_service_account_names=let-note-backend \
  bound_service_account_namespaces=prod \
  policies=let-note-prod \
  ttl=24h
```

## 6. Migrations BDD

Les migrations du projet sont centralisees dans le chart:

- Source unique: `infrastructure/deploiement-kube/charts/let-note/migrations/*.up.sql`

Le chart cree:

- un `ConfigMap` `db-migrations` contenant les SQL;
- un `Job` `db-migration-<env>-<revision>` qui attend PostgreSQL, cree la table `schema_migrations`, puis applique uniquement les migrations non marquees comme appliquees.

Le workflow utilise `helm upgrade --install --wait --wait-for-jobs`; une migration en erreur bloque le deploy.

Quand une migration est ajoutee, la creer directement dans `charts/let-note/migrations/`.

## 7. Lancer un deploy

1. Creer et pousser un tag valide par le workflow `release`.
2. Ouvrir GitHub Actions.
3. Lancer manuellement le workflow `Deploy` depuis ce tag.
4. Choisir un seul environnement: `dev`, `staging` ou `prod`.
5. Choisir `amd64`, `arm64` ou `both`. Pour une lame serveur classique, choisir uniquement son architecture.
6. Verifier les Jobs:

```bash
kubectl -n dev get jobs,pods
kubectl -n staging get jobs,pods
kubectl -n prod get jobs,pods
```

Logs de migration:

```bash
kubectl -n prod get jobs -l app=db-migration --sort-by=.metadata.creationTimestamp
kubectl -n prod logs job/<job-name>
```

## 8. Nettoyer les anciens ReplicaSets

Le chart limite `revisionHistoryLimit` a `1` pour eviter l'accumulation de ReplicaSets dans ArgoCD. Apres la premiere synchro avec cette version, Kubernetes supprime automatiquement les anciens ReplicaSets inutiles.

Si un namespace est deja sature par de vieux rollouts, verifier d'abord que les ReplicaSets ont `DESIRED=0`, puis supprimer uniquement ceux-la:

```bash
kubectl -n prod get rs
kubectl -n prod delete rs <old-replicaset-with-desired-0>
```

Ne pas supprimer le ReplicaSet actif qui porte les pods courants.

## 9. Configuration GitHub recommandee

Creer les GitHub Environments correspondant aux cibles utilisees:

- `dev-amd64`, `staging-amd64`, `prod-amd64`;
- `dev-arm64`, `staging-arm64`, `prod-arm64` uniquement si un cluster ARM est deploye.

Configurer au minimum:

- le secret repository `KUBE_CONFIG_AMD64` et/ou `KUBE_CONFIG_ARM64`;
- une protection avec approbation obligatoire sur `prod-amd64` et `prod-arm64`;
- la branche `main` protegee avec les workflows de tests, qualite, securite et `Kubernetes manifests` obligatoires;
- les packages GHCR backend/frontend lisibles par les clusters, ou publics.

Si les packages GHCR sont prives, creer un secret pull dans chaque namespace puis le declarer dans les values Helm:

```bash
kubectl -n prod create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username='<github-user>' \
  --docker-password='<github-pat-read-packages>'
```

```yaml
global:
  imagePullSecrets:
    - name: ghcr-pull
```

Pour une API Kubernetes privee, utiliser un runner GitHub Actions self-hosted sur la lame ou dans son reseau. Dans ce cas, remplacer `runs-on: ubuntu-24.04` du job `deploy` par les labels du runner.

## 10. Argo CD

Le workflow `Deploy` n'installe pas Argo CD et n'applique pas l'ApplicationSet. Il deploie directement avec Helm.

Le fichier `gitops/argocd/applicationset.yaml` est optionnel et suppose qu'Argo CD est deja installe. Ne pas activer l'auto-sync Argo CD sur les memes releases tout en continuant les deploiements directs Helm: choisir un seul proprietaire des ressources applicatives.

## 11. Limites de disponibilite

Le backend et le frontend prod utilisent HPA, deux replicas minimum, PDB et rolling update sans indisponibilite. Sur une lame unique, cela protege contre un redemarrage de pod, pas contre une panne materielle.

PostgreSQL et SeaweedFS restent mono-replica sur des volumes `local-path`. Ils ne sont pas hautement disponibles et ne doivent pas etre scales horizontalement avec cette configuration. Mettre en place des sauvegardes hors machine et tester leur restauration avant la mise en production.
