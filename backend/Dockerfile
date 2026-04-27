FROM rust:1.95-slim-bookworm AS builder
WORKDIR /app

COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

FROM docker.io/library/debian:trixie-slim@sha256:cedb1ef40439206b673ee8b33a46a03a0c9fa90bf3732f54704f99cb061d2c5a AS runtime

LABEL org.opencontainers.image.title="let-note backend"
LABEL org.opencontainers.image.description="Rust backend service for Let Note."
LABEL org.opencontainers.image.base.name="docker.io/library/debian:trixie-slim"

COPY --from=builder /app/target/release/let-note-backend /usr/local/bin/let-note-backend

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/let-note-backend"]
