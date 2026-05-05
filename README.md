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
