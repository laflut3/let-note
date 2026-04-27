use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

const ADDRESS: &str = "127.0.0.1:8080";

fn main() -> std::io::Result<()> {
  let listener = TcpListener::bind(ADDRESS)?;
  println!("Backend running on http://{ADDRESS}");

  for stream in listener.incoming() {
    match stream {
      Ok(stream) => {
        if let Err(error) = handle_connection(stream) {
          eprintln!("connection error: {error}");
        }
      }
      Err(error) => eprintln!("incoming connection failed: {error}"),
    }
  }

  Ok(())
}

fn handle_connection(mut stream: TcpStream) -> std::io::Result<()> {
  let mut buffer = [0_u8; 1024];
  let _ = stream.read(&mut buffer)?;

  let request = String::from_utf8_lossy(&buffer);
  let first_line = request.lines().next().unwrap_or_default();
  let path = first_line
    .split_whitespace()
    .nth(1)
    .unwrap_or("/");

  let (status_line, content_type, body) = response_for_path(path);
  let response = format!(
    "{status_line}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n{body}",
    body.len()
  );

  stream.write_all(response.as_bytes())?;
  stream.flush()?;

  Ok(())
}

fn response_for_path(path: &str) -> (&'static str, &'static str, &'static str) {
  match path {
    "/api/health" => (
      "HTTP/1.1 200 OK",
      "application/json",
      r#"{"status":"ok"}"#,
    ),
    "/" => (
      "HTTP/1.1 200 OK",
      "text/plain; charset=utf-8",
      "Let Note backend is running.",
    ),
    _ => (
      "HTTP/1.1 404 Not Found",
      "application/json",
      r#"{"error":"not found"}"#,
    ),
  }
}

#[cfg(test)]
mod tests {
  use super::response_for_path;

  #[test]
  fn health_endpoint_returns_ok() {
    let (status, content_type, body) = response_for_path("/api/health");

    assert_eq!(status, "HTTP/1.1 200 OK");
    assert_eq!(content_type, "application/json");
    assert_eq!(body, r#"{"status":"ok"}"#);
  }

  #[test]
  fn unknown_endpoint_returns_not_found() {
    let (status, _, body) = response_for_path("/missing");

    assert_eq!(status, "HTTP/1.1 404 Not Found");
    assert_eq!(body, r#"{"error":"not found"}"#);
  }
}
