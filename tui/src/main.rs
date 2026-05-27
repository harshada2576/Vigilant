mod app;
mod ui;

use anyhow::Result;
use std::{
    io::{self, Write},
    path::Path,
    sync::{Arc, Mutex},
};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    net::UnixStream,
};
use crossterm::{
    event::{self, DisableMouseCapture, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use app::{AppState, IpcRequest, IpcResponse};
use ui::draw_ui;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Config {
    username: String,
    homeserver_url: String,
}

async fn run_setup_wizard(config_path: &str) -> Result<Config> {
    println!("=========================================");
    println!("      Welcome to CipherLink Setup!       ");
    println!("=========================================");
    
    let mut username = String::new();
    print!("Enter username [testuser]: ");
    io::stdout().flush()?;
    io::stdin().read_line(&mut username)?;
    let username = username.trim().to_string();
    let username = if username.is_empty() { "testuser".to_string() } else { username };

    let mut homeserver = String::new();
    print!("Enter homeserver URL [https://localhost:8443]: ");
    io::stdout().flush()?;
    io::stdin().read_line(&mut homeserver)?;
    let homeserver = homeserver.trim().to_string();
    let homeserver = if homeserver.is_empty() { "https://localhost:8443".to_string() } else { homeserver };

    let config = Config {
        username,
        homeserver_url: homeserver,
    };
    
    let file = std::fs::File::create(config_path)?;
    serde_json::to_writer_pretty(file, &config)?;
    println!("Configuration saved to {}", config_path);
    Ok(config)
}

#[tokio::main]
async fn main() -> Result<()> {
    let socket_path = std::env::var("CIPHERLINK_SOCK")
        .unwrap_or_else(|_| "/tmp/cipherlink.sock".to_string());
    
    let config_path = "cipherlink_config.json";
    
    // Connect to background daemon UDS socket or spawn it
    let stream = match UnixStream::connect(&socket_path).await {
        Ok(s) => s,
        Err(_) => {
            println!("Local background daemon not detected.");
            let config = if !Path::new(config_path).exists() {
                run_setup_wizard(config_path).await?
            } else {
                let file = std::fs::File::open(config_path)?;
                serde_json::from_reader::<_, Config>(file)?
            };
            
            print!("Enter SQLite database passphrase: ");
            io::stdout().flush()?;
            let db_pass = rpassword::read_password()?;

            print!("Enter session encryption passphrase [press Enter to use database passphrase]: ");
            io::stdout().flush()?;
            let mut session_pass = rpassword::read_password()?;
            if session_pass.is_empty() {
                session_pass = db_pass.clone();
            }
            
            println!("Launching embedded CipherLink daemon background task...");
            let socket_c = socket_path.clone();
            tokio::spawn(async move {
                if let Err(e) = daemon::start_daemon_with_config(
                    db_pass,
                    session_pass,
                    config.homeserver_url,
                    config.username,
                    socket_c,
                ).await {
                    eprintln!("\nEmbedded Daemon Error: {}\n", e);
                }
            });
            
            // Loop trying to connect to the socket
            let mut connected_stream = None;
            for _ in 0..50 {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                if let Ok(s) = UnixStream::connect(&socket_path).await {
                    connected_stream = Some(s);
                    break;
                }
            }
            
            match connected_stream {
                Some(s) => s,
                None => {
                    eprintln!("Error: Failed to connect to local embedded daemon after 5 seconds.");
                    std::process::exit(1);
                }
            }
        }
    };

    let (reader, writer) = stream.into_split();
    let writer = Arc::new(tokio::sync::Mutex::new(writer));
    let app_state = Arc::new(Mutex::new(AppState::new()));
    let app_state_c = app_state.clone();

    // Spawn UDS socket response reader loop
    tokio::spawn(async move {
        let mut buf_reader = BufReader::new(reader);
        let mut line = String::new();
        while let Ok(n) = buf_reader.read_line(&mut line).await {
            if n == 0 {
                // Connection closed
                break;
            }
            if let Ok(response) = serde_json::from_str::<IpcResponse>(&line) {
                let mut state = app_state_c.lock().unwrap();
                match response {
                    IpcResponse::Log { message } => {
                        state.add_message(message);
                    }
                    IpcResponse::StateUpdate {
                        user_id,
                        homeserver_url,
                        strict_mode,
                        joined_rooms,
                        active_devices,
                    } => {
                        state.user_id = user_id;
                        state.homeserver_url = homeserver_url;
                        state.strict_mode = strict_mode;
                        state.joined_rooms = joined_rooms;
                        state.active_devices = active_devices;
                    }
                }
            }
            line.clear();
        }
        let mut state = app_state_c.lock().unwrap();
        state.add_message("!!! Daemon disconnected !!!".to_string());
    });

    // Initialize TUI
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Draw initial TUI
    let state_initial = app_state.clone();
    terminal.draw(|f| draw_ui(f, &state_initial))?;

    loop {
        // Check if should quit
        let should_quit = {
            let state = app_state.lock().unwrap();
            state.should_quit
        };
        if should_quit {
            break;
        }

        // Wait for keypress or poll
        if event::poll(std::time::Duration::from_millis(50)).unwrap_or(false) {
            if let Ok(Event::Key(key)) = event::read() {
                let mut state = app_state.lock().unwrap();
                match key.code {
                    KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                        state.should_quit = true;
                    }
                    KeyCode::Tab => {
                        state.input_focus = !state.input_focus;
                    }
                    KeyCode::Char(c) if state.input_focus => {
                        state.input.push(c);
                    }
                    KeyCode::Backspace if state.input_focus => {
                        state.input.pop();
                    }
                    KeyCode::Enter => {
                        if state.input_focus {
                            let line = std::mem::take(&mut state.input);
                            if !line.is_empty() {
                                let command_line = if line.starts_with('/') {
                                    state.add_message(format!("> {}", line));
                                    line
                                } else if let Some(idx) = state.active_room_idx {
                                    if idx < state.joined_rooms.len() {
                                        let room_name = state.joined_rooms[idx].0.clone();
                                        let room_id = state.joined_rooms[idx].1.clone();
                                        state.add_message(format!("[To {}] {}", room_name, line));
                                        format!("/send {} {}", room_id, line)
                                    } else {
                                        line
                                    }
                                } else {
                                    state.add_message("Error: No active room selected. Press Tab to highlight a room in the sidebar, then press Enter to select it.".to_string());
                                    continue;
                                };

                                let req = IpcRequest::Command { line: command_line };
                                if let Ok(req_json) = serde_json::to_string(&req) {
                                    let w = writer.clone();
                                    tokio::spawn(async move {
                                        let mut guard = w.lock().await;
                                        let _ = guard.write_all(format!("{}\n", req_json).as_bytes()).await;
                                        let _ = guard.flush().await;
                                    });
                                }
                            }
                        } else {
                            // Sidebar Enter key: Select highlighted room
                            if !state.joined_rooms.is_empty() {
                                if state.highlighted_room_idx < state.joined_rooms.len() {
                                    state.active_room_idx = Some(state.highlighted_room_idx);
                                    let room_name = state.joined_rooms[state.highlighted_room_idx].0.clone();
                                    state.add_message(format!("Active room set to: {}", room_name));
                                    state.input_focus = true; // Auto switch focus to input
                                }
                            }
                        }
                    }
                    KeyCode::Up => {
                        if state.input_focus {
                            if state.scroll_offset < state.messages.len().saturating_sub(1) {
                                state.scroll_offset += 1;
                            }
                        } else if !state.joined_rooms.is_empty() {
                            if state.highlighted_room_idx > 0 {
                                state.highlighted_room_idx -= 1;
                            } else {
                                state.highlighted_room_idx = state.joined_rooms.len() - 1;
                            }
                        }
                    }
                    KeyCode::Down => {
                        if state.input_focus {
                            if state.scroll_offset > 0 {
                                state.scroll_offset -= 1;
                            }
                        } else if !state.joined_rooms.is_empty() {
                            if state.highlighted_room_idx + 1 < state.joined_rooms.len() {
                                state.highlighted_room_idx += 1;
                            } else {
                                state.highlighted_room_idx = 0;
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        // Redraw
        let state_to_draw = app_state.clone();
        terminal.draw(|f| draw_ui(f, &state_to_draw))?;
    }

    // Restore terminal settings
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}
