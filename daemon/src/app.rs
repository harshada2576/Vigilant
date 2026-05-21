use serde::{Deserialize, Serialize};
use matrix_sdk::encryption::verification::Emoji;

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

#[derive(Debug, Clone)]
pub enum AppEvent {
    Command(String),
    MessageSync(String),
    VerificationRequest { sender: String, transaction_id: String },
    VerificationSasEmoji { user_id: String, flow_id: String, emojis: Vec<Emoji> },
    VerificationSasDone { other_device_id: String, user_id: String },
    VerificationSasCancelled,
}

pub struct AppState {
    pub user_id: String,
    pub homeserver_url: String,
    pub strict_mode: bool,
    pub joined_rooms: Vec<(String, String, String)>,
    pub active_devices: Vec<(String, String, bool)>,
    pub aliases: std::collections::HashMap<String, String>,
    pub active_verification_flow: Option<(String, String)>, // (user_id, flow_id)
}

impl AppState {
    pub fn new(user_id: String, homeserver_url: String) -> Self {
        Self {
            user_id,
            homeserver_url,
            strict_mode: false,
            joined_rooms: Vec::new(),
            active_devices: Vec::new(),
            aliases: std::collections::HashMap::new(),
            active_verification_flow: None,
        }
    }

    pub fn load_aliases(&mut self, user: &str) {
        let file_path = format!("aliases_{}.json", user);
        if std::path::Path::new(&file_path).exists() {
            if let Ok(file) = std::fs::File::open(&file_path) {
                if let Ok(aliases) = serde_json::from_reader(file) {
                    self.aliases = aliases;
                }
            }
        }
    }

    pub fn save_aliases(&self, user: &str) {
        let file_path = format!("aliases_{}.json", user);
        if let Ok(file) = std::fs::File::create(&file_path) {
            let _ = serde_json::to_writer_pretty(file, &self.aliases);
        }
    }

    pub fn resolve_id(&self, input: &str) -> String {
        self.aliases.get(input).cloned().unwrap_or_else(|| input.to_string())
    }

    pub fn replace_aliases(&self, text: &str) -> String {
        let mut result = text.to_string();
        for (alias, id) in &self.aliases {
            result = result.replace(id, alias);
        }
        result
    }
}
