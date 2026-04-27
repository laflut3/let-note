use axum::{
  body::{Body, to_bytes},
  http::{Request, StatusCode},
};
use let_note_backend::app::create_router;
use tower::ServiceExt;

#[tokio::test]
async fn test_healthcheck_is_ok_when_server_is_launched() {
  let app = create_router();

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
  let app = create_router();

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
  let app = create_router();

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
