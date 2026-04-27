use std::net::SocketAddr;

use clap::Parser;

use crate::app::create_router;

pub mod app;

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

  #[arg(
    short = 'P',
    long = "port",
    env = "APP_PORT",
    default_value_t = 8080
  )]
  port: u16,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
  let args = Args::parse();

  let app = create_router();

  let socket_addr = format!("{}:{}", args.host, args.port)
    .parse::<SocketAddr>()
    .expect("Invalid socket address.");

  let listener = tokio::net::TcpListener::bind(socket_addr).await?;
  axum::serve(listener, app)
    .with_graceful_shutdown(shutdown_signal())
    .await?;

  Ok(())
}

pub async fn shutdown_signal() {
  tokio::signal::ctrl_c()
    .await
    .expect("Failed to install CTRL+C signal handler");
}
