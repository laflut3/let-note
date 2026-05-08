# Let Note

Application composee d'un frontend React (Vite) et d'un backend Rust.

## Documentation

- Infrastructure overview: `infrastructure/README.md`
- Deploiement local complet: `infrastructure/deploiement-local/README.md`
- Deploiement Vault Kubernetes: `infrastructure/deploiement-vault/README.md`
- Deploiement Let-Note Kubernetes (dev/staging/prod): `infrastructure/deployment/README.md`

## Developpement rapide

### Backend

```bash
cargo run -p let-note-backend
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
cargo test --workspace
```

## Deploiement vault

### Installer HELM

```bash
sudo apt-get install curl gpg apt-transport-https --yes

curl -fsSL https://packages.buildkite.com/helm-linux/helm-debian/gpgkey | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/helm.gpg] https://packages.buildkite.com/helm-linux/helm-debian/any/ any main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list

sudo apt-get update
sudo apt-get install helm
```

### Récupérer le REPO

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm search repo hashicorp/vault
```

### Deploy vault

```bash
helm install vault hashicorp/vault
kubectl get pods -l app.kubernetes.io/name=vault
```

### Supprimer vault

```bash
helm uninstall vault
kubectl delete pvc -l app.kubernetes.io/name=vault
```

Si le chart a ete installe dans un namespace dedie (ex: `vault`), utiliser:

```bash
helm uninstall vault -n vault
kubectl delete pvc -n vault -l app.kubernetes.io/name=vault
```

### Recup clé UNSEAL et TOKEN

```bash
kubectl exec -ti vault-0 -- vault operator init
```

Résult :
```bash
Unseal Key 1: ...
Unseal Key 2: ...
Unseal Key 3: ...
Unseal Key 4: ...
Unseal Key 5: ...

Initial Root Token: hvs.[...]
...
```

### Config VAULT

prendre 3 Unseal Key parmis les 3 récupérés :

```bash
kubectl exec -ti vault-0 -- vault operator unseal <KEY 1>
kubectl exec -ti vault-0 -- vault operator unseal <KEY 2>
kubectl exec -ti vault-0 -- vault operator unseal <KEY 3>
```

setup le token :

```bash
kubectl exec -ti vault-0 -- vault login 'hvs.<...>'
```

### Set env Var

creer le dossier secret dans vault si il n'existe pas

```bash
kubectl exec -i -n default vault-0 -- env VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN="hvs.[...]" vault secrets list
```

Variables Vault multi-environnements:

```bash
cd infrastructure/envirronnement_variable
cp .env.exemple .env
./set_vault_vars.sh [all|dev|staging|prod]
```

## Tagger une version (release)

Le workflow GitHub `release.yml` se declenche sur un tag `v*` (ex: `v0.1.1`).

```bash
# 1) verifier que la branche principale est a jour
git checkout main
git pull

# 2) creer le tag de release
git tag -a v0.1.1 -m "Release v0.1.1"

# 3) pousser le tag vers GitHub (declenche la release)
git push origin v0.1.1
```

Verifier ensuite dans GitHub Actions que le workflow `Release` est termine.
