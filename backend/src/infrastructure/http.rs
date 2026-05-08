use std::net::SocketAddr;

use clap::Parser;

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

#[derive(Debug, Clone)]
pub struct AppConfig {
  pub host: String,
  pub port: u16,
}

pub fn read_app_config() -> AppConfig {
  let args = Args::parse();
  AppConfig {
    host: args.host,
    port: args.port,
  }
}

pub async fn serve_http(app: axum::Router, config: &AppConfig) -> anyhow::Result<()> {
  let socket_addr = format!("{}:{}", config.host, config.port)
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
