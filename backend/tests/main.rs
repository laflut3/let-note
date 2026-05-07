use argon2::{
  Argon2,
  password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use axum::{
  body::{Body, to_bytes},
  http::{Request, StatusCode},
};
use let_note_backend::app::create_router;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

fn test_router() -> axum::Router {
  let database_url = std::env::var("DATABASE_URL_TEST")
    .unwrap_or_else(|_| "postgres://127.0.0.1:5432/let_note_dev".to_string());

  let pool = PgPoolOptions::new()
    .connect_lazy(&database_url)
    .expect("failed to create lazy pool");
  create_router().with_state(pool)
}

#[tokio::test]
async fn test_healthcheck_is_ok_when_server_is_launched() {
  let app = test_router();

  let response = app
    .oneshot(
      Request::builder()
        .uri("/_health")
        .body(Body::empty())
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn test_api_health_returns_ok_payload() {
  let app = test_router();

  let response = app
    .oneshot(
      Request::builder()
        .uri("/api/health")
        .body(Body::empty())
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::OK);
  let bytes = to_bytes(response.into_body(), usize::MAX)
    .await
    .expect("unable to read response body");
  let payload: serde_json::Value =
    serde_json::from_slice(&bytes).expect("response body is not valid JSON");
  assert_eq!(payload["status"], "ok");
}

#[tokio::test]
async fn test_unknown_route_returns_not_found() {
  let app = test_router();

  let response = app
    .oneshot(
      Request::builder()
        .uri("/unknown")
        .body(Body::empty())
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::NOT_FOUND);
  let bytes = to_bytes(response.into_body(), usize::MAX)
    .await
    .expect("unable to read response body for unknown route");
  let body = String::from_utf8(bytes.to_vec()).expect("body is not valid UTF-8");
  assert_eq!(body, "Not Found");
}

#[tokio::test]
async fn test_login_sets_cookie() {
  let database_url = std::env::var("DATABASE_URL_TEST")
    .unwrap_or_else(|_| "postgres://127.0.0.1:5432/let_note_dev".to_string());
  let pool = PgPoolOptions::new()
    .connect(&database_url)
    .await
    .expect("failed to connect to test database");

  sqlx::query(
    r#"
    CREATE TABLE IF NOT EXISTS etudiant (
      email TEXT PRIMARY KEY,
      mot_de_passe TEXT NOT NULL
    )
    "#,
  )
  .execute(&pool)
  .await
  .expect("failed to ensure etudiant table exists");

  let salt = SaltString::generate(&mut OsRng);
  let password_hash = Argon2::default()
    .hash_password("secret".as_bytes(), &salt)
    .expect("failed to hash test password")
    .to_string();

  sqlx::query(
    r#"
    INSERT INTO etudiant (email, mot_de_passe)
    VALUES ($1, $2)
    ON CONFLICT (email) DO UPDATE SET mot_de_passe = EXCLUDED.mot_de_passe
    "#,
  )
  .bind("john@doe.com")
  .bind(password_hash)
  .execute(&pool)
  .await
  .expect("failed to seed test user");

  // Ensure auth route can sign JWT in CI/local test runs.
  // SAFETY: set during test setup before request handling.
  unsafe {
    std::env::set_var("JWT_SECRET", "test-jwt-secret");
  }

  let app = test_router();

  let response = app
    .oneshot(
      Request::builder()
        .method("POST")
        .uri("/api/auth/login")
        .header("content-type", "application/json")
        .body(Body::from(
          r#"{"email":"john@doe.com","password":"secret"}"#,
        ))
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::OK);
  let set_cookie = response
    .headers()
    .get("set-cookie")
    .expect("set-cookie should exist")
    .to_str()
    .expect("set-cookie should be valid utf-8");

  assert!(set_cookie.contains("let_note_auth="));
  assert!(set_cookie.contains("HttpOnly"));
}

#[tokio::test]
async fn test_login_rejects_empty_fields() {
  let app = test_router();

  let response = app
    .oneshot(
      Request::builder()
        .method("POST")
        .uri("/api/auth/login")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"email":"","password":""}"#))
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_me_requires_cookie() {
  let app = test_router();

  let response = app
    .oneshot(
      Request::builder()
        .method("GET")
        .uri("/api/auth/me")
        .body(Body::empty())
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_logout_clears_cookie() {
  let app = test_router();

  let response = app
    .oneshot(
      Request::builder()
        .method("POST")
        .uri("/api/auth/logout")
        .body(Body::empty())
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::NO_CONTENT);
  let set_cookie = response
    .headers()
    .get("set-cookie")
    .expect("set-cookie should exist")
    .to_str()
    .expect("set-cookie should be valid utf-8");

  assert!(set_cookie.contains("let_note_auth="));
  assert!(set_cookie.contains("Max-Age=0"));
}
