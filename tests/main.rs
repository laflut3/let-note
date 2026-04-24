use std::process::Command;

#[test]
fn main_prints_hello_world() {
  let output = Command::new(env!("CARGO_BIN_EXE_rust-based-project"))
    .output()
    .expect("failed to run binary");

  assert!(
    output.status.success(),
    "binary exited with a non-zero status"
  );
  assert_eq!(String::from_utf8_lossy(&output.stdout), "Hello, world!\n");
}
