use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IpcRequest {
    Command { line: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IpcResponse {
    Log { message: String },
    StateUpdate {
        user_id: String,
        homeserver_url: String,
        strict_mode: bool,
        joined_rooms: Vec<(String, String, String)>, // (name, id, encryption)
        active_devices: Vec<(String, String, bool)>, // (user_id, device_id, verified)
    },
}

pub struct AppState {
    pub user_id: String,
    pub homeserver_url: String,
    pub strict_mode: bool,
    pub messages: Vec<String>,
    pub input: String,
    pub scroll_offset: usize,
    pub should_quit: bool,
    pub joined_rooms: Vec<(String, String, String)>,
    pub active_devices: Vec<(String, String, bool)>,
    pub input_focus: bool,
    pub highlighted_room_idx: usize,
    pub active_room_idx: Option<usize>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            user_id: "Connecting...".to_string(),
            homeserver_url: "".to_string(),
            strict_mode: false,
            messages: vec![
                "=== CipherLink TUI Connected ===".to_string(),
                "Awaiting state sync from background daemon...".to_string(),
            ],
            input: String::new(),
            scroll_offset: 0,
            should_quit: false,
            joined_rooms: Vec::new(),
            active_devices: Vec::new(),
            input_focus: true,
            highlighted_room_idx: 0,
            active_room_idx: None,
        }
    }

    pub fn add_message(&mut self, msg: String) {
        self.messages.push(msg);
        self.scroll_offset = 0;
    }
}
