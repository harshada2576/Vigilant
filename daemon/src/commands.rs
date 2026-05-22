use anyhow::Result;
use matrix_sdk::{
    ruma::{
        UserId, RoomId,
        events::room::message::RoomMessageEventContent,
        api::client::room::create_room::v3::Request as CreateRoomRequest,
        api::client::uiaa::{Password, UserIdentifier, AuthData, MatrixUserIdentifier},
        serde::Raw,
    },
    Client, RoomMemberships,
};
use std::{
    env,
    sync::{Arc, Mutex},
};
use tokio::sync::mpsc::Sender;
use crate::app::{AppState, AppEvent};
use crate::matrix::start_emoji_polling;

pub async fn update_joined_rooms(client: &Client, app_state: &Arc<Mutex<AppState>>) {
    let rooms = client.joined_rooms();
    let mut state = app_state.lock().unwrap();
    state.joined_rooms.clear();
    for room in rooms {
        let name = room.name().unwrap_or_else(|| room.room_id().to_string());
        let id = room.room_id().to_string();
        let encryption = match room.encryption_state() {
            matrix_sdk::EncryptionState::Encrypted => "Encrypted".to_string(),
            matrix_sdk::EncryptionState::NotEncrypted => "Unencrypted".to_string(),
            matrix_sdk::EncryptionState::Unknown => "Unknown".to_string(),
        };
        state.joined_rooms.push((name, id, encryption));
    }
}

pub async fn handle_command_line(
    line: String,
    client: &Client,
    app_state: &Arc<Mutex<AppState>>,
    event_tx: Sender<AppEvent>,
    log_tx: Sender<String>,
) -> Result<()> {
    let log = |msg: String| {
        let tx = log_tx.clone();
        tokio::spawn(async move {
            let _ = tx.send(msg).await;
        });
    };

    if line.starts_with('/') {
        let parts: Vec<&str> = line.split_whitespace().collect();
        let command = parts[0];
        match command {
            "/help" => {
                log("Commands:".to_string());
                log("  /list                                 - List joined rooms".to_string());
                log("  /create <room_name>                  - Create a new E2EE room".to_string());
                log("  /join <room_id>                       - Join a room".to_string());
                log("  /send <room_id> <msg>                 - Send a message".to_string());
                log("  /invite <room_id> <user_id>           - Invite a user to a room".to_string());
                log("  /verify <user_id>                     - Request E2EE device verification".to_string());
                log("  /accept <user_id> <flow_id>           - Accept verification request".to_string());
                log("  /confirm <user_id> <flow_id>          - Confirm matching emojis/SAS".to_string());
                log("  /cancel <user_id> <flow_id>           - Cancel verification".to_string());
                log("  /devices <user_id>                    - List E2EE devices and verification status".to_string());
                log("  /alias add <id> <name>                - Register an alias for a User ID".to_string());
                log("  /alias list                           - List all registered contact aliases".to_string());
                log("  /strict                               - Toggle strict E2EE verification mode".to_string());
                log("  /bootstrap                            - Bootstrap cross-signing keys".to_string());
                log("  /quit                                 - Exit the application".to_string());
            }
            "/list" => {
                update_joined_rooms(client, app_state).await;
                let state = app_state.lock().unwrap();
                if state.joined_rooms.is_empty() {
                    log("No joined rooms.".to_string());
                } else {
                    log("Joined rooms:".to_string());
                    for (name, id, encryption) in &state.joined_rooms {
                        log(format!("  {} - {} ({})", name, id, encryption));
                    }
                }
            }
            "/devices" => {
                if parts.len() != 2 {
                    log("Usage: /devices <user_id>".to_string());
                } else {
                    let resolved_input = {
                        let state = app_state.lock().unwrap();
                        state.resolve_id(parts[1])
                    };
                    let user_id = UserId::parse(&resolved_input)?;
                    log(format!("Fetching devices for {}...", user_id));
                    match client.encryption().get_user_devices(&user_id).await {
                        Ok(devices) => {
                            log(format!("Devices for user {}:", user_id));
                            let mut state = app_state.lock().unwrap();
                            state.active_devices.clear();
                            for device in devices.devices() {
                                log(format!("  - Device ID: {}, Verified: {}", device.device_id(), device.is_verified()));
                                state.active_devices.push((user_id.to_string(), device.device_id().to_string(), device.is_verified()));
                            }
                        }
                        Err(e) => {
                            log(format!("Error getting user devices: {}", e));
                        }
                    }
                }
            }
            "/create" => {
                if parts.len() < 2 {
                    log("Usage: /create <room_name>".to_string());
                } else {
                    let name = parts[1..].join(" ");
                    log(format!("Creating E2EE room '{}'...", name));
                    
                    let encryption_event = serde_json::json!({
                        "content": {
                            "algorithm": "m.megolm.v1.aes-sha2"
                        },
                        "state_key": "",
                        "type": "m.room.encryption"
                    });
                    let raw_state_event = Raw::from_json(serde_json::value::to_raw_value(&encryption_event)?);
                    let mut request = CreateRoomRequest::new();
                    request.name = Some(name);
                    request.initial_state = vec![raw_state_event];

                    match client.create_room(request).await {
                        Ok(room) => {
                            log(format!("Created encrypted room! ID: {}", room.room_id()));
                            update_joined_rooms(client, app_state).await;
                        }
                        Err(e) => {
                            log(format!("Failed to create room: {}", e));
                        }
                    }
                }
            }
            "/invite" => {
                if parts.len() != 3 {
                    log("Usage: /invite <room_id> <user_id>".to_string());
                } else {
                    let room_id = RoomId::parse(parts[1])?;
                    let resolved_user = {
                        let state = app_state.lock().unwrap();
                        state.resolve_id(parts[2])
                    };
                    let user_id = UserId::parse(&resolved_user)?;
                    if let Some(room) = client.get_room(&room_id) {
                        log(format!("Inviting {} to room {}...", user_id, room_id));
                        match room.invite_user_by_id(&user_id).await {
                            Ok(_) => {
                                log("Invitation sent successfully!".to_string());
                            }
                            Err(e) => {
                                log(format!("Failed to send invitation: {}", e));
                            }
                        }
                    } else {
                        log(format!("Not in room {}", room_id));
                    }
                }
            }
            "/verify" => {
                if parts.len() != 2 {
                    log("Usage: /verify <user_id>".to_string());
                } else {
                    let resolved_user = {
                        let state = app_state.lock().unwrap();
                        state.resolve_id(parts[1])
                    };
                    let user_id = UserId::parse(&resolved_user)?;
                    log(format!("Requesting verification for devices of user {}...", user_id));
                    match client.encryption().get_user_devices(&user_id).await {
                        Ok(devices) => {
                            let mut requested = false;
                            for device in devices.devices() {
                                log(format!("Requesting verification for device {}...", device.device_id()));
                                match device.request_verification().await {
                                    Ok(request) => {
                                        let fid = request.flow_id().to_string();
                                        log(format!("Verification request sent for device {}! ID: {}", device.device_id(), fid));
                                        requested = true;
                                        start_emoji_polling(client.clone(), user_id.clone(), fid, event_tx.clone());
                                    }
                                    Err(e) => {
                                        log(format!("Failed to request verification for device {}: {}", device.device_id(), e));
                                    }
                                }
                            }
                            if !requested {
                                log("No devices found to request verification, or all requests failed.".to_string());
                            }
                        }
                        Err(e) => {
                            log(format!("Error getting user devices: {}", e));
                        }
                    }
                }
            }
            "/join" => {
                if parts.len() != 2 {
                    log("Usage: /join <room_id>".to_string());
                } else {
                    let room_id = RoomId::parse(parts[1])?;
                    log(format!("Joining room {}...", room_id));
                    match client.join_room_by_id(&room_id).await {
                        Ok(room) => {
                            log(format!("Joined room! Name: {:?}", room.name()));
                            update_joined_rooms(client, app_state).await;
                        }
                        Err(e) => {
                            log(format!("Failed to join room: {}", e));
                        }
                    }
                }
            }
            "/send" => {
                if parts.len() < 3 {
                    log("Usage: /send <room_id> <message>".to_string());
                } else {
                    let room_id_str = parts[1];
                    let message = parts[2..].join(" ");
                    let room_id = RoomId::parse(room_id_str)?;
                    if let Some(room) = client.get_room(&room_id) {
                        let mut proceed = true;
                        let strict_active = {
                            let state = app_state.lock().unwrap();
                            state.strict_mode
                        };
                        if strict_active {
                            log("Checking room participant devices verification status...".to_string());
                            match room.members(RoomMemberships::JOIN).await {
                                Ok(members) => {
                                    let mut unverified = Vec::new();
                                    for member in members {
                                        let user_id = member.user_id();
                                        if let Ok(devices) = client.encryption().get_user_devices(user_id).await {
                                            for device in devices.devices() {
                                                if !device.is_verified() {
                                                    unverified.push((user_id.to_owned(), device.device_id().to_string()));
                                                }
                                            }
                                        }
                                    }
                                    if !unverified.is_empty() {
                                        log("\n*** STRICT E2EE MODE BLOCKED SENDING ***".to_string());
                                        log("The following participant devices are unverified:".to_string());
                                        for (u_id, d_id) in unverified {
                                            log(format!("  - {} (Device: {})", u_id, d_id));
                                        }
                                        log("Please verify them using `/verify <user_id>` first, or toggle `/strict` off.".to_string());
                                        proceed = false;
                                    }
                                }
                                Err(e) => {
                                    log(format!("Failed to retrieve room members: {}", e));
                                    proceed = false;
                                }
                            }
                        }
                        if proceed {
                            match room.send(RoomMessageEventContent::text_plain(message)).await {
                                Ok(response) => {
                                    log(format!("Message sent! Event ID: {}", response.response.event_id));
                                }
                                Err(e) => {
                                    log(format!("Failed to send message: {}", e));
                                }
                            }
                        }
                    } else {
                        log(format!("Not in room {}", room_id));
                    }
                }
            }
            "/strict" => {
                let mut state = app_state.lock().unwrap();
                state.strict_mode = !state.strict_mode;
                let mode = if state.strict_mode { "ENABLED" } else { "DISABLED" };
                log(format!("Strict E2EE mode is now: {}", mode));
            }
            "/bootstrap" => {
                log("Bootstrapping cross-signing...".to_string());
                match client.encryption().bootstrap_cross_signing(None).await {
                    Ok(_) => {
                        log("Cross-signing successfully bootstrapped!".to_string());
                    }
                    Err(e) => {
                        if let Some(uiaa_info) = e.as_uiaa_response() {
                            log("Homeserver requires User-Interactive Authentication. Authenticating...".to_string());
                            let password_str = env::var("CIPHERLINK_PASS").unwrap_or_else(|_| "testpassword".to_string());
                            if let Some(user_id) = client.user_id() {
                                let localpart = user_id.localpart();
                                let mut auth_password = Password::new(
                                    UserIdentifier::Matrix(MatrixUserIdentifier::new(localpart.to_string())),
                                    password_str,
                                );
                                auth_password.session = uiaa_info.session.clone();
                                
                                match client.encryption().bootstrap_cross_signing(Some(AuthData::Password(auth_password))).await {
                                    Ok(_) => {
                                        log("Cross-signing successfully bootstrapped!".to_string());
                                    }
                                    Err(err) => {
                                        log(format!("Failed to bootstrap cross-signing with password: {}", err));
                                    }
                                }
                            }
                        } else {
                            log(format!("Failed to bootstrap cross-signing: {}", e));
                        }
                    }
                }
            }
            "/accept" => {
                let active_flow = {
                    let state = app_state.lock().unwrap();
                    state.active_verification_flow.clone()
                };
                let (user_id_str, flow_id) = if parts.len() == 1 {
                    if let Some((u, f)) = active_flow {
                        (u, f)
                    } else {
                        log("Usage: /accept <user_id> <flow_id> (or verify active flow exists)".to_string());
                        return Ok(());
                    }
                } else if parts.len() == 3 {
                    let resolved_user = {
                        let state = app_state.lock().unwrap();
                        state.resolve_id(parts[1])
                    };
                    (resolved_user, parts[2].to_string())
                } else {
                    log("Usage: /accept <user_id> <flow_id>".to_string());
                    return Ok(());
                };

                let user_id = UserId::parse(&user_id_str)?;
                log(format!("Accepting verification request from {}...", user_id));
                if let Some(request) = client.encryption().get_verification_request(&user_id, &flow_id).await {
                    match request.accept().await {
                        Ok(_) => {
                            log("Accepted verification request. Starting SAS...".to_string());
                            match request.start_sas().await {
                                Ok(Some(_sas)) => {
                                    log("SAS started. Polling for emojis...".to_string());
                                    start_emoji_polling(client.clone(), user_id.clone(), flow_id.to_string(), event_tx.clone());
                                }
                                Ok(None) => {
                                    log("Failed to start SAS flow: no SAS support returned.".to_string());
                                }
                                Err(e) => {
                                    log(format!("Failed to start SAS flow: {}", e));
                                }
                            }
                        }
                        Err(e) => {
                            log(format!("Failed to accept request: {}", e));
                        }
                    }
                } else {
                    log(format!("No verification request found for user {} with flow ID {}", user_id, flow_id));
                }
            }
            "/confirm" => {
                let active_flow = {
                    let state = app_state.lock().unwrap();
                    state.active_verification_flow.clone()
                };
                let (user_id_str, flow_id) = if parts.len() == 1 {
                    if let Some((u, f)) = active_flow {
                        (u, f)
                    } else {
                        log("Usage: /confirm <user_id> <flow_id> (or verify active flow exists)".to_string());
                        return Ok(());
                    }
                } else if parts.len() == 3 {
                    let resolved_user = {
                        let state = app_state.lock().unwrap();
                        state.resolve_id(parts[1])
                    };
                    (resolved_user, parts[2].to_string())
                } else {
                    log("Usage: /confirm <user_id> <flow_id>".to_string());
                    return Ok(());
                };

                let user_id = UserId::parse(&user_id_str)?;
                if let Some(verification) = client.encryption().get_verification(&user_id, &flow_id).await {
                    if let Some(sas) = verification.sas() {
                        match sas.confirm().await {
                            Ok(_) => {
                                log("SAS matching confirmed!".to_string());
                            }
                            Err(e) => {
                                log(format!("Failed to confirm matching SAS: {}", e));
                            }
                        }
                    }
                } else {
                    log("No active verification found to confirm.".to_string());
                }
            }
            "/cancel" => {
                let active_flow = {
                    let state = app_state.lock().unwrap();
                    state.active_verification_flow.clone()
                };
                let (user_id_str, flow_id) = if parts.len() == 1 {
                    if let Some((u, f)) = active_flow {
                        (u, f)
                    } else {
                        log("Usage: /cancel <user_id> <flow_id> (or verify active flow exists)".to_string());
                        return Ok(());
                    }
                } else if parts.len() == 3 {
                    let resolved_user = {
                        let state = app_state.lock().unwrap();
                        state.resolve_id(parts[1])
                    };
                    (resolved_user, parts[2].to_string())
                } else {
                    log("Usage: /cancel <user_id> <flow_id>".to_string());
                    return Ok(());
                };

                let user_id = UserId::parse(&user_id_str)?;
                if let Some(verification) = client.encryption().get_verification(&user_id, &flow_id).await {
                    if let Some(sas) = verification.sas() {
                        match sas.cancel().await {
                            Ok(_) => {
                                log("SAS cancelled!".to_string());
                            }
                            Err(e) => {
                                log(format!("Failed to cancel SAS: {}", e));
                            }
                        }
                    }
                } else {
                    log("No active verification found to cancel.".to_string());
                }
            }
            "/alias" => {
                if parts.len() < 2 {
                    log("Usage:".to_string());
                    log("  /alias add <id> <alias_name>".to_string());
                    log("  /alias list".to_string());
                } else {
                    match parts[1] {
                        "add" => {
                            if parts.len() < 4 {
                                log("Usage: /alias add <id> <alias_name>".to_string());
                            } else {
                                let target_id = parts[2].to_string();
                                let alias_name = parts[3..].join(" ");
                                let user = env::var("CIPHERLINK_USER").unwrap_or_else(|_| "testuser".to_string());
                                
                                let mut state = app_state.lock().unwrap();
                                state.aliases.insert(alias_name.clone(), target_id.clone());
                                state.save_aliases(&user);
                                log(format!("Registered alias: {} -> {}", alias_name, target_id));
                            }
                        }
                        "list" => {
                            let state = app_state.lock().unwrap();
                            if state.aliases.is_empty() {
                                log("No aliases registered.".to_string());
                            } else {
                                log("Registered Aliases:".to_string());
                                for (alias, id) in &state.aliases {
                                    log(format!("  {} -> {}", alias, id));
                                }
                            }
                        }
                        _ => {
                            log("Unknown alias subcommand. Use 'add' or 'list'.".to_string());
                        }
                    }
                }
            }
            "/quit" => {
                log("Quit command received. Daemon continues running. Disconnect TUI to close frontend.".to_string());
            }

            _ => {
                log(format!("Unknown command: {}", command));
            }
        }
    } else {
        log("Error: Messages must be sent using `/send <room_id> <message>` or type `/help`".to_string());
    }
    Ok(())
}
