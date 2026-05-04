use std::net::SocketAddr;

use clap::Parser;
use sqlx::postgres::PgPoolOptions;

use crate::app::create_router;

pub mod app;
pub mod domains;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
  #[arg(
    short = 'H',
    long = "host",
    env = "APP_HOST",
    default_value = "127.0.0.1"
  )]
  host: String,

  #[arg(short = 'P', long = "port", env = "APP_PORT", default_value_t = 8080)]
  port: u16,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
  let args = Args::parse();

  let database_url = build_database_url()?;
  let db_pool = PgPoolOptions::new()
    .max_connections(5)
    .connect(&database_url)
    .await?;
  let app = create_router().with_state(db_pool);

  let socket_addr = format!("{}:{}", args.host, args.port)
    .parse::<SocketAddr>()
    .expect("Invalid socket address.");

  let listener = tokio::net::TcpListener::bind(socket_addr).await?;
  axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal())
    .await?;

  Ok(())
}

fn build_database_url() -> anyhow::Result<String> {
  if let Ok(url) = std::env::var("DATABASE_URL") {
    return Ok(url);
  }

  let host = std::env::var("PS_BDD_SERVER").unwrap_or_else(|_| "127.0.0.1".to_string());
  let port = std::env::var("PS_BDD_PORT").unwrap_or_else(|_| "5432".to_string());
  let db = std::env::var("PS_BDD_DB").unwrap_or_else(|_| "let_note_dev".to_string());
  let user = std::env::var("PS_BDD_USER").unwrap_or_else(|_| "let_note".to_string());
  let pass = std::env::var("PS_BDD_PASS")
    .map_err(|_| anyhow::anyhow!("PS_BDD_PASS is required when DATABASE_URL is not set"))?;

  Ok(format!("postgres://{user}:{pass}@{host}:{port}/{db}"))
}

pub async fn shutdown_signal() {
  tokio::signal::ctrl_c()
    .await
    .expect("Failed to install CTRL+C signal handler");
}
