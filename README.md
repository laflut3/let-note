# Let Note

Application composee d'un frontend React (Vite) et d'un backend Rust.

## Documentation

- Infrastructure overview: `infrastructure/README.md`
- Deploiement local complet: `infrastructure/deploiement-local/README.md`
- Deploiement Let-Note Kubernetes (dev/staging/prod): `infrastructure/deploiement-kube/README.md`

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
