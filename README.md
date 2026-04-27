# Let Note

Monolithe avec un frontend React et un backend Rust.

## Structure

- `frontend/`: application React (Vite)
- `backend/`: serveur backend Rust

## Lancer le backend

```sh
cargo run -p let-note-backend
```

Backend disponible sur `http://127.0.0.1:8080`.
Endpoint santé: `GET /api/health`

## Lancer le frontend

```sh
cd frontend
npm install
npm run dev
```

Frontend disponible sur `http://127.0.0.1:5173`.

## Tests backend

```sh
cargo test --workspace
```
