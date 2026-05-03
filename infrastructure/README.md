# Let Note - Infrastructure

Cette section contient l'infrastructure de l'app (BDD, Kubernetes, déploiement).

## Structure

- `BDD/`: base de donnée
- `deployment/`: manifests Kubernetes (base + environnements)

## Prérequis

- `kubectl` configuré sur ton cluster
- support Kustomize (intégré dans `kubectl`)

## Commandes de déploiement

### 1) Créer namespaces + quotas

```sh
kubectl apply -f deployment/cluster/namespaces.yaml
kubectl apply -f deployment/cluster/quotas-limits.yaml
```

### 2) Déployer par environnement

```sh
# dev
kubectl apply -k deployment/environments/dev

# staging
kubectl apply -k deployment/environments/staging

# prod
kubectl apply -k deployment/environments/prod
```

### 3) Vérifier le déploiement

```sh
kubectl get pods -n dev
kubectl get pods -n staging
kubectl get pods -n prod

kubectl get svc -n dev
kubectl get ingress -n dev
```

### 4) Supprimer un environnement

```sh
# exemple pour dev
kubectl delete -k deployment/environments/dev
```

## Tout supprimer

### 1) Supprimer les apps déployées (dev, staging, prod)

```sh
kubectl delete -k deployment/environments/dev
kubectl delete -k deployment/environments/staging
kubectl delete -k deployment/environments/prod
```

### 2) Supprimer quotas + limites

```sh
kubectl delete -f deployment/cluster/quotas-limits.yaml
```

### 3) Supprimer les namespaces

```sh
kubectl delete -f deployment/cluster/namespaces.yaml
```
