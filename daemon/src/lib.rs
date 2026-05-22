#![recursion_limit = "512"]

pub mod app;
pub mod matrix;
pub mod commands;

pub use matrix::check_session_integrity;

use anyhow::{Context, Result};
use std::{
    fs,
    path::Path,
    sync::{Arc, Mutex},
};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    net::{UnixListener, unix::OwnedWriteHalf},
    sync::mpsc,
};
use app::{AppState, AppEvent, IpcRequest, IpcResponse};
use matrix::login_and_sync;
use commands::{handle_command_line, update_joined_rooms};

type ClientWriters = Arc<tokio::sync::Mutex<Vec<OwnedWriteHalf>>>;

async fn broadcast(response: &IpcResponse, clients: &ClientWriters) {
    if let Ok(json) = serde_json::to_string(response) {
        let mut client_list = clients.lock().await;
        let mut to_remove = Vec::new();
        for (idx, client) in client_list.iter_mut().enumerate() {
            use tokio::io::AsyncWriteExt;
            if let Err(_) = client.write_all(format!("{}\n", json).as_bytes()).await {
                to_remove.push(idx);
            } else {
                let _ = client.flush().await;
            }
        }
        for idx in to_remove.into_iter().rev() {
            client_list.remove(idx);
        }
    }
}

async fn get_state_update(app_state: &Arc<Mutex<AppState>>) -> IpcResponse {
    let state = app_state.lock().unwrap();
    IpcResponse::StateUpdate {
        user_id: state.user_id.clone(),
        homeserver_url: state.homeserver_url.clone(),
        strict_mode: state.strict_mode,
        joined_rooms: state.joined_rooms.clone(),
        active_devices: state.active_devices.clone(),
    }
}

pub async fn start_daemon_with_config(
    db_pass: String,
    session_pass: String,
    homeserver_url: String,
    user: String,
    socket_path_str: String,
) -> Result<()> {
    // Initialize matrix client
    let (event_tx, mut event_rx) = mpsc::channel::<AppEvent>(100);
    println!("Connecting to Matrix homeserver for user '{}'...", user);
    let client = login_and_sync(&homeserver_url, &user, &db_pass, &session_pass, event_tx.clone())
        .await
        .context("Failed to connect/sync Matrix client")?;
    let user_id = client.user_id().map(|u| u.to_string()).unwrap_or_else(|| user.clone());
    println!("Logged in successfully as {}", user_id);

    let app_state = Arc::new(Mutex::new(AppState::new(user_id, homeserver_url.to_string())));
    {
        let mut state = app_state.lock().unwrap();
        state.load_aliases(&user);
    }
    update_joined_rooms(&client, &app_state).await;

    // Set up UDS Server
    let socket_path = Path::new(&socket_path_str);
    if Path::new(socket_path).exists() {
        fs::remove_file(socket_path).context("Failed to delete stale socket file")?;
    }
    let listener = UnixListener::bind(socket_path).context("Failed to bind Unix Domain Socket")?;
    
    // Audit & Harden socket file permissions
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(socket_path)?.permissions();
        perms.set_mode(0o600); // Read/write only by owner
        fs::set_permissions(socket_path, perms).context("Failed to set UDS socket permissions")?;
    }
    println!("Unix socket listening at {}", socket_path_str);

    let clients: ClientWriters = Arc::new(tokio::sync::Mutex::new(Vec::new()));
    let clients_c = clients.clone();
    let app_state_c = app_state.clone();
    let event_tx_c = event_tx.clone();

    // Spawn connection accepter loop
    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let (reader, mut writer) = stream.into_split();
            
            // Send initial state update
            let initial_state = get_state_update(&app_state_c).await;
            if let Ok(json) = serde_json::to_string(&initial_state) {
                use tokio::io::AsyncWriteExt;
                let _ = writer.write_all(format!("{}\n", json).as_bytes()).await;
                let _ = writer.flush().await;
            }

            // Register connection writer
            {
                let mut client_list = clients_c.lock().await;
                client_list.push(writer);
            }

            // Spawn socket reader
            let tx = event_tx_c.clone();
            tokio::spawn(async move {
                let mut buf_reader = BufReader::new(reader);
                let mut line = String::new();
                while let Ok(n) = buf_reader.read_line(&mut line).await {
                    if n == 0 {
                        break;
                    }
                    if let Ok(req) = serde_json::from_str::<IpcRequest>(&line) {
                        match req {
                            IpcRequest::Command { line: cmd_line } => {
                                let _ = tx.send(AppEvent::Command(cmd_line)).await;
                            }
                        }
                    }
                    line.clear();
                }
            });
        }
    });

    // Main Event Loop
    let (log_tx, mut log_rx) = mpsc::channel::<String>(100);
    
    // Spawn a loop to forward log_rx entries as Log messages to all clients
    let clients_log = clients.clone();
    let app_state_log = app_state.clone();
    tokio::spawn(async move {
        while let Some(msg) = log_rx.recv().await {
            let processed_msg = {
                let state = app_state_log.lock().unwrap();
                state.replace_aliases(&msg)
            };
            broadcast(&IpcResponse::Log { message: processed_msg }, &clients_log).await;
        }
    });

    while let Some(event) = event_rx.recv().await {
        match event {
            AppEvent::Command(line) => {
                let cl = client.clone();
                let state_c = app_state.clone();
                let tx_c = event_tx.clone();
                let l_tx = log_tx.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_command_line(line, &cl, &state_c, tx_c, l_tx.clone()).await {
                        let _ = l_tx.send(format!("Command error: {}", e)).await;
                    }
                });
            }
            AppEvent::MessageSync(msg) => {
                let _ = log_tx.send(msg).await;
            }
            AppEvent::VerificationRequest { sender, transaction_id } => {
                // Populate active verification flow so that user can type /accept without arguments
                {
                    let mut state = app_state.lock().unwrap();
                    state.active_verification_flow = Some((sender.clone(), transaction_id.clone()));
                }
                let _ = log_tx.send(format!(
                    "*** Incoming E2EE device verification request from {}! ***",
                    sender
                )).await;
                let _ = log_tx.send(format!(
                    "Accept it using `/accept` (or `/accept {} {}`)",
                    sender, transaction_id
                )).await;
            }
            AppEvent::VerificationSasEmoji { user_id, flow_id, emojis } => {
                // Keep active verification flow updated
                {
                    let mut state = app_state.lock().unwrap();
                    state.active_verification_flow = Some((user_id.clone(), flow_id.clone()));
                }
                let _ = log_tx.send(format!(
                    "*** SAS Emojis for verification flow {} with user {}: ***",
                    flow_id, user_id
                )).await;
                for emoji in emojis {
                    let _ = log_tx.send(format!("{} ({})", emoji.symbol, emoji.description)).await;
                }
                let _ = log_tx.send(format!(
                    "Type `/confirm` to verify they match, or `/cancel` (or specify flow manually)"
                )).await;
            }
            AppEvent::VerificationSasDone { other_device_id, user_id } => {
                {
                    let mut state = app_state.lock().unwrap();
                    state.active_verification_flow = None;
                }
                let _ = log_tx.send(format!(
                    "*** VERIFICATION SUCCESSFUL! Device {} of {} is now verified. ***",
                    other_device_id, user_id
                )).await;
            }
            AppEvent::VerificationSasCancelled => {
                {
                    let mut state = app_state.lock().unwrap();
                    state.active_verification_flow = None;
                }
                let _ = log_tx.send("*** VERIFICATION CANCELLED! ***".to_string()).await;
            }
        }

        // Broadcast StateUpdate on any state transitions
        let state_update = get_state_update(&app_state).await;
        broadcast(&state_update, &clients).await;
    }

    Ok(())
}
