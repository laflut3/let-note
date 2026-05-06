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
