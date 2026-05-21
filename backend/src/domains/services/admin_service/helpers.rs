fn years_bounds(annee_arrivee: i32, annee_depart: i32) -> Result<(NaiveDate, NaiveDate), ApiError> {
  if !(1900..=3000).contains(&annee_arrivee) || !(1900..=3000).contains(&annee_depart) {
    return Err(ApiError::bad_request("invalid years"));
  }
  if annee_arrivee > annee_depart {
    return Err(ApiError::bad_request(
      "arrival year must be less than or equal to departure year",
    ));
  }

  let start = NaiveDate::from_ymd_opt(annee_arrivee, 1, 1)
    .ok_or_else(|| ApiError::bad_request("invalid arrival year"))?;
  let end = NaiveDate::from_ymd_opt(annee_depart, 12, 31)
    .ok_or_else(|| ApiError::bad_request("invalid departure year"))?;

  Ok((start, end))
}

fn map_student_assignment_error(error: sqlx::Error) -> ApiError {
  match error {
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23503") => {
      ApiError::bad_request("one or more students do not exist")
    }
    _ => ApiError::internal("unable to assign students to promotion"),
  }
}

fn map_schema_error(message: &'static str) -> impl Fn(sqlx::Error) -> ApiError {
  move |error| match error {
    sqlx::Error::Database(db_err)
      if matches!(db_err.code().as_deref(), Some("42P01") | Some("42703")) =>
    {
      ApiError::internal("database schema is outdated")
    }
    sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23503") => {
      ApiError::bad_request("invalid foreign key reference")
    }
    _ => ApiError::internal(message),
  }
}

fn sanitize_file_name(name: &str) -> String {
  let candidate = name.trim();
  if candidate.is_empty() {
    return "file.bin".to_string();
  }
  candidate
    .chars()
    .map(|c| {
      if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' {
        c
      } else {
        '_'
      }
    })
    .collect()
}
