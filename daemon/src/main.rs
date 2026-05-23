use anyhow::{Result, Context};
use std::env;
use std::io::{self, Write};

#[tokio::main]
async fn main() -> Result<()> {
    println!("=== CipherLink Secure Daemon (cipherlinkd) ===");

    let args: Vec<String> = env::args().collect();
    let is_check_mode = args.iter().any(|arg| arg == "--check" || arg == "-c");
    let user = env::var("CIPHERLINK_USER").unwrap_or_else(|_| "testuser".to_string());

    if is_check_mode {
        println!("Checking session file integrity for user: {}", user);
        let session_pass = match env::var("CIPHERLINK_SESSION_PASS") {
            Ok(pass) => pass,
            Err(_) => {
                print!("Enter session encryption passphrase: ");
                io::stdout().flush().context("Failed to flush stdout")?;
                rpassword::read_password().context("Failed to read session passphrase")?
            }
        };

        match daemon::check_session_integrity(&user, &session_pass) {
            Ok(_) => {
                println!("Session file integrity check: OK");
                std::process::exit(0);
            }
            Err(e) => {
                eprintln!("Session file integrity check: FAILED ({})", e);
                std::process::exit(1);
            }
        }
    }

    // Get database passphrase
    let db_pass = match env::var("CIPHERLINK_DB_PASS") {
        Ok(pass) => pass,
        Err(_) => {
            print!("Enter SQLite database passphrase: ");
            io::stdout().flush().context("Failed to flush stdout")?;
            rpassword::read_password().context("Failed to read database passphrase")?
        }
    };

    // Get session passphrase
    let session_pass = match env::var("CIPHERLINK_SESSION_PASS") {
        Ok(pass) => pass,
        Err(_) => {
            print!("Enter session encryption passphrase [press Enter to use database passphrase]: ");
            io::stdout().flush().context("Failed to flush stdout")?;
            let pass = rpassword::read_password().context("Failed to read session passphrase")?;
            if pass.is_empty() {
                db_pass.clone()
            } else {
                pass
            }
        }
    };

    let homeserver_url = env::var("CIPHERLINK_HOMESERVER").unwrap_or_else(|_| "https://localhost:8443".to_string());
    let socket_path_str = env::var("CIPHERLINK_SOCK").unwrap_or_else(|_| "/tmp/cipherlink.sock".to_string());

    daemon::start_daemon_with_config(db_pass, session_pass, homeserver_url, user, socket_path_str).await
}
