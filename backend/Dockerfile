FROM lukemathwalker/cargo-chef:0.1.77-rust-1.95@sha256:00c3c07c51d092325df88f0df2d626cd4302e12933f179ba154509cc314d6c2a AS chef
ARG TARGETARCH
RUN apt-get update \
  && apt-get install -y --no-install-recommends musl-tools=* pkg-config=* \
  && rm -rf /var/lib/apt/lists/*
RUN case "$TARGETARCH" in \
  "arm64") echo "aarch64-unknown-linux-musl" ;; \
  "amd64"|"") echo "x86_64-unknown-linux-musl" ;; \
  *) echo "Unsupported TARGETARCH=$TARGETARCH" >&2; exit 1 ;; \
  esac > /rust-target
RUN rustup target add "$(cat /rust-target)"
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json ./
RUN cargo chef cook --release --target "$(cat /rust-target)" --recipe-path recipe.json
COPY . .
RUN cargo build --release --target "$(cat /rust-target)"
RUN cp "/app/target/$(cat /rust-target)/release/let-note-backend" /app/let-note-backend

FROM gcr.io/distroless/static-debian13@sha256:47b2d72ff90843eb8a768b5c2f89b40741843b639d065b9b937b07cd59b479c6 AS runtime

LABEL org.opencontainers.image.title="let-note-backend"
LABEL org.opencontainers.image.description="Backend service for let-note, written in Rust."
LABEL org.opencontainers.image.base.name="gcr.io/distroless/static-debian13"

USER nonroot:nonroot
COPY --from=builder /app/let-note-backend /usr/local/bin/let-note-backend
EXPOSE 8080
ENTRYPOINT [ "/usr/local/bin/let-note-backend" ]
