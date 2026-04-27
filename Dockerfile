FROM rust:1.95-slim-bookworm AS builder
WORKDIR /app

COPY Cargo.toml ./
COPY backend ./backend
RUN cargo build --release -p let-note-backend

FROM docker.io/library/debian:trixie-slim@sha256:cedb1ef40439206b673ee8b33a46a03a0c9fa90bf3732f54704f99cb061d2c5a AS runtime

LABEL org.opencontainers.image.title="let-note backend"
LABEL org.opencontainers.image.description="Rust backend for the Let Note monolith."
LABEL org.opencontainers.image.base.name="docker.io/library/debian:trixie-slim"

WORKDIR /app

COPY --from=builder /app/target/release/let-note-backend /usr/local/bin/let-note-backend

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/let-note-backend"]
