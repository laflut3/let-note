use lettre::{
  AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
  message::{Mailbox, MultiPart, SinglePart},
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
  let plain = format!(
    "Bonjour,\n\nValidez votre compte Let-Note avec ce lien:\n{}\n\nCe lien expire dans 24 heures.\n",
    link
  );
  let html = verification_email_html(&link);

  send_mail(&cfg, email, "Validez votre compte Let-Note", plain, html).await
}

pub async fn send_password_reset_email(email: &str, token: &str) -> Result<(), ApiError> {
  let cfg = mail_config()?;
  let link = format!(
    "{}/reset-password?token={}",
    cfg.app_public_url.trim_end_matches('/'),
    token
  );
  let plain = format!(
    "Bonjour,\n\nChangez votre mot de passe Let-Note avec ce lien:\n{}\n\nCe lien expire dans 1 heure.\nSi vous n'avez rien demande, ignorez ce message.\n",
    link
  );
  let html = password_reset_email_html(&link);

  send_mail(
    &cfg,
    email,
    "Reinitialisation du mot de passe Let-Note",
    plain,
    html,
  )
  .await
}

async fn send_mail(
  cfg: &MailConfig,
  to: &str,
  subject: &str,
  plain: String,
  html: String,
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
    .multipart(
      MultiPart::alternative()
        .singlepart(SinglePart::plain(plain))
        .singlepart(SinglePart::html(html)),
    )
    .map_err(|_| ApiError::internal("unable to build email"))?;

  let creds = Credentials::new(cfg.username.clone(), cfg.password.clone());
  let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.host)
    .map_err(|_| ApiError::internal("mail service is misconfigured"))?
    .port(cfg.port)
    .credentials(creds)
    .build();

  mailer.send(email).await.map_err(|error| {
    eprintln!("email send failed: {error:#}");
    ApiError::internal("unable to send email")
  })?;

  Ok(())
}

fn verification_email_html(link: &str) -> String {
  let escaped_link = escape_html(link);
  format!(
    r#"<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Validez votre compte Let-Note</title>
  </head>
  <body style="margin:0;background:#f4f7fb;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#17202a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe7ef;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(31,50,74,.12);">
            <tr>
              <td style="background:#14313d;padding:28px 30px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#b8d9df;">Let-Note</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;font-weight:700;">Validez votre compte</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Bonjour,</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#40505f;">Votre compte Let-Note est pret. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre acces.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:12px;background:#1f6f7a;">
                      <a href="{escaped_link}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">Confirmer mon email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#6b7a89;">Ce lien expire dans 24 heures.</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8391a1;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br><a href="{escaped_link}" style="color:#1f6f7a;word-break:break-all;">{escaped_link}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"#
  )
}

fn password_reset_email_html(link: &str) -> String {
  let escaped_link = escape_html(link);
  format!(
    r#"<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reinitialisation Let-Note</title>
  </head>
  <body style="margin:0;background:#f4f7fb;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#17202a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe7ef;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(31,50,74,.12);">
            <tr>
              <td style="background:#14313d;padding:28px 30px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#b8d9df;">Let-Note</div>
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15;font-weight:700;">Reinitialisez votre mot de passe</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#40505f;">Utilisez ce lien pour choisir un nouveau mot de passe. Si vous n'avez rien demande, ignorez simplement ce message.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:12px;background:#1f6f7a;">
                      <a href="{escaped_link}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">Changer mon mot de passe</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#6b7a89;">Ce lien expire dans 1 heure.</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8391a1;">Lien direct:<br><a href="{escaped_link}" style="color:#1f6f7a;word-break:break-all;">{escaped_link}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"#
  )
}

fn escape_html(value: &str) -> String {
  value
    .replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
    .replace('\'', "&#39;")
}

fn mail_config() -> Result<MailConfig, ApiError> {
  let host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
  let port = std::env::var("SMTP_PORT")
    .ok()
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(587);
  let username = required_env("SMTP_USERNAME", "mail service unavailable")?;
  let password = required_env("SMTP_PASSWORD", "mail service unavailable")?;
  let from = std::env::var("SMTP_FROM")
    .ok()
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .unwrap_or_else(|| username.clone());
  let app_public_url = required_env("APP_PUBLIC_URL", "app URL is missing")?;

  Ok(MailConfig {
    host,
    port,
    username,
    password,
    from,
    app_public_url,
  })
}

fn required_env(key: &str, error_message: &'static str) -> Result<String, ApiError> {
  std::env::var(key)
    .ok()
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .ok_or_else(|| ApiError::internal(error_message))
}
