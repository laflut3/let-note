use argon2::{
  Argon2,
  password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use sqlx::{PgPool, postgres::PgPoolOptions};

pub async fn create_db_pool() -> anyhow::Result<PgPool> {
  let database_url = build_database_url()?;
  let pool = PgPoolOptions::new()
    .max_connections(5)
    .connect(&database_url)
    .await?;

  bootstrap_roles_and_admin(&pool).await?;
  Ok(pool)
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

async fn bootstrap_roles_and_admin(pool: &PgPool) -> anyhow::Result<()> {
  sqlx::query("INSERT INTO role (role) VALUES ('eleve') ON CONFLICT (role) DO NOTHING")
    .execute(pool)
    .await?;
  sqlx::query("INSERT INTO role (role) VALUES ('delegue') ON CONFLICT (role) DO NOTHING")
    .execute(pool)
    .await?;
  sqlx::query("INSERT INTO role (role) VALUES ('admin') ON CONFLICT (role) DO NOTHING")
    .execute(pool)
    .await?;

  let admin_exists = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM etudiant e
    JOIN role_etu re ON re.id_etu = e.id
    JOIN role r ON r.id = re.id_role
    WHERE r.role = 'admin'
    "#,
  )
  .fetch_one(pool)
  .await?
    > 0;

  if admin_exists {
    return Ok(());
  }

  let admin_email = required_env("ADMIN_EMAIL")?;
  let admin_password = required_env("ADMIN_PASSWORD")?;
  validate_admin_password(&admin_password)?;
  let admin_prenom = std::env::var("ADMIN_PRENOM").unwrap_or_else(|_| "Super".to_string());
  let admin_nom = std::env::var("ADMIN_NOM").unwrap_or_else(|_| "Admin".to_string());

  let password_hash = hash_password(&admin_password)?;
  let mut tx = pool.begin().await?;

  let admin_id = sqlx::query_scalar::<_, uuid::Uuid>(
    r#"
    INSERT INTO etudiant (nom, prenom, email, date_naissance, mot_de_passe)
    VALUES ($1, $2, $3, CURRENT_DATE, $4)
    ON CONFLICT (email) DO UPDATE SET mot_de_passe = EXCLUDED.mot_de_passe
    RETURNING id
    "#,
  )
  .bind(&admin_nom)
  .bind(&admin_prenom)
  .bind(&admin_email)
  .bind(password_hash)
  .fetch_one(&mut *tx)
  .await?;

  sqlx::query(
    r#"
    INSERT INTO role_etu (id_role, id_etu)
    SELECT id, $1 FROM role WHERE role = 'admin'
    ON CONFLICT DO NOTHING
    "#,
  )
  .bind(admin_id)
  .execute(&mut *tx)
  .await?;

  tx.commit().await?;
  Ok(())
}

fn required_env(name: &str) -> anyhow::Result<String> {
  let value = std::env::var(name)
    .map_err(|_| anyhow::anyhow!("{name} is required to bootstrap the first admin account"))?;

  if value.trim().is_empty() {
    anyhow::bail!("{name} must not be empty when bootstrapping the first admin account");
  }

  Ok(value)
}

fn validate_admin_password(password: &str) -> anyhow::Result<()> {
  const MIN_ADMIN_PASSWORD_LENGTH: usize = 12;

  if password.chars().count() < MIN_ADMIN_PASSWORD_LENGTH {
    anyhow::bail!(
      "ADMIN_PASSWORD must be at least {MIN_ADMIN_PASSWORD_LENGTH} characters long when bootstrapping the first admin account"
    );
  }

  Ok(())
}

fn hash_password(password: &str) -> anyhow::Result<String> {
  let salt = SaltString::generate(&mut OsRng);
  Argon2::default()
    .hash_password(password.as_bytes(), &salt)
    .map(|hash| hash.to_string())
    .map_err(|e| anyhow::anyhow!("failed to hash admin password: {e}"))
}
