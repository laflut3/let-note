use axum::{
  body::{Body, to_bytes},
  http::{Request, StatusCode},
};
use let_note_backend::app::create_router;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

fn test_router() -> axum::Router {
  let pool = PgPoolOptions::new()
    .connect_lazy("postgres://let_note:LetNote-Dev-Pg-2026!@127.0.0.1:5432/let_note_dev")
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
async fn test_login_returns_token() {
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
  let bytes = to_bytes(response.into_body(), usize::MAX)
    .await
    .expect("unable to read response body");
  let payload: serde_json::Value =
    serde_json::from_slice(&bytes).expect("response body is not valid JSON");
  let token = payload["token"]
    .as_str()
    .expect("token field should be a string");
  assert!(!token.is_empty());
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
async fn test_logout_returns_no_content() {
  let app = test_router();

  let login_response = app
    .clone()
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

  let login_body = to_bytes(login_response.into_body(), usize::MAX)
    .await
    .expect("unable to read login response");
  let login_payload: serde_json::Value =
    serde_json::from_slice(&login_body).expect("invalid login JSON");
  let token = login_payload["token"]
    .as_str()
    .expect("token should be present")
    .to_string();

  let response = app
    .oneshot(
      Request::builder()
        .method("POST")
        .uri("/api/auth/logout")
        .header("authorization", format!("Bearer {token}"))
        .body(Body::empty())
        .expect("request build failed"),
    )
    .await
    .expect("request execution failed");

  assert_eq!(response.status(), StatusCode::NO_CONTENT);
}
