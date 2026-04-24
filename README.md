# Rust-based-project
rust based project

## Template changes

When creating a new repository from this template, complete this checklist before the first merge:

- [ ] Rename the project in `Cargo.toml` (`[package].name`) and adjust `version` if needed.
- [ ] Update the binary name in `Dockerfile`:
  - [ ] `COPY --from=builder /app/target/release/<binary-name> /usr/local/bin`
  - [ ] `ENTRYPOINT ["/usr/local/bin/<binary-name>"]`
- [ ] Update OCI labels in `Dockerfile` (`title`, `description`) to match the new project.
- [ ] Update the image tag in `.github/workflows/build.yml` (replace `laflut3/rust-based-project` with `<owner>/<repo>`).
- [ ] Update the `README.md` title and description.
- [ ] Update `SECURITY.md` with the real vulnerability disclosure process (contact details, response times).
- [ ] Review CI tool versions in `.github/workflows/*.yml` (Rust, Python, action versions).
- [ ] Configure required CI secrets/settings if you publish container images (registry/package permissions).
- [ ] Review `LICENSE` and attribution if the new project requires a different setup.
- [ ] Create and document a `.env` file (or `.env.example`) if the application depends on environment variables.
- [ ] Run quality checks and tests locally before the first push:
  - [ ] `pre-commit run --all-files`
  - [ ] `cargo test`

## Development

### Development compose

In the included compose file is included a Postgres 18 instance.

### Pre-commit

```sh
uv tool install pre-commit
pre-commit install
```

## Tests

Make sure you ran the migration and the .env is setup correctly.

### Run the tests
```sh
cargo test
```
