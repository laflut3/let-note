use lettre::{
  AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor, message::Mailbox,
  transport::smtp::authentication::Credentials,
};

use crate::domains::error::ApiError;

#[derive(Debug, Clone)]
struct MailConfig {
  host: String,
  port: u16,
  username: String,
  password: String,
  from: String,
  app_public_url: String,
}

pub async fn send_verification_email(email: &str, token: &str) -> Result<(), ApiError> {
  let cfg = mail_config()?;
  let link = format!(
    "{}/verify-email?token={}",
    cfg.app_public_url.trim_end_matches('/'),
    token
  );
  let body = format!(
    "Bonjour,\n\nValidez votre compte Let-Note avec ce lien:\n{}\n\nCe lien expire dans 24 heures.\n",
    link
  );

  send_mail(&cfg, email, "Validez votre compte Let-Note", body).await
}

pub async fn send_password_reset_email(email: &str, token: &str) -> Result<(), ApiError> {
  let cfg = mail_config()?;
  let link = format!(
    "{}/reset-password?token={}",
    cfg.app_public_url.trim_end_matches('/'),
    token
  );
  let body = format!(
    "Bonjour,\n\nChangez votre mot de passe Let-Note avec ce lien:\n{}\n\nCe lien expire dans 1 heure.\nSi vous n'avez rien demande, ignorez ce message.\n",
    link
  );

  send_mail(
    &cfg,
    email,
    "Reinitialisation du mot de passe Let-Note",
    body,
  )
  .await
}

async fn send_mail(
  cfg: &MailConfig,
  to: &str,
  subject: &str,
  body: String,
) -> Result<(), ApiError> {
  let from: Mailbox = cfg
    .from
    .parse()
    .map_err(|_| ApiError::internal("mail service is misconfigured"))?;
  let to: Mailbox = to
    .parse()
    .map_err(|_| ApiError::bad_request("invalid email address"))?;

  let email = Message::builder()
    .from(from)
    .to(to)
    .subject(subject)
    .body(body)
    .map_err(|_| ApiError::internal("unable to build email"))?;

  let creds = Credentials::new(cfg.username.clone(), cfg.password.clone());
  let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.host)
    .map_err(|_| ApiError::internal("mail service is misconfigured"))?
    .port(cfg.port)
    .credentials(creds)
    .build();

  mailer
    .send(email)
    .await
    .map_err(|_| ApiError::internal("unable to send email"))?;

  Ok(())
}

fn mail_config() -> Result<MailConfig, ApiError> {
  let host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
  let port = std::env::var("SMTP_PORT")
    .ok()
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(587);
  let username =
    std::env::var("SMTP_USERNAME").map_err(|_| ApiError::internal("mail service unavailable"))?;
  let password =
    std::env::var("SMTP_PASSWORD").map_err(|_| ApiError::internal("mail service unavailable"))?;
  let from = std::env::var("SMTP_FROM").unwrap_or_else(|_| username.clone());
  let app_public_url =
    std::env::var("APP_PUBLIC_URL").map_err(|_| ApiError::internal("app URL is missing"))?;

  Ok(MailConfig {
    host,
    port,
    username,
    password,
    from,
    app_public_url,
  })
}
