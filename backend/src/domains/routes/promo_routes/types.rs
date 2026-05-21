#[derive(Debug, Clone, serde::Deserialize)]
struct ResourceFileQuery {
  download: Option<bool>,
}
