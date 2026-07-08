use wasm_bindgen::prelude::*;
use matrix_sdk::Client;
use matrix_sdk::ruma::api::client::account::register::v3::Request as RegisterRequest;
use matrix_sdk::ruma::api::client::room::create_room::v3::Request as CreateRoomRequest;
use matrix_sdk::ruma::events::room::message::MessageType;
use matrix_sdk::ruma::{RoomId, RoomOrAliasId};
use matrix_sdk::ruma::events::{AnySyncTimelineEvent, AnySyncMessageLikeEvent};
use matrix_sdk::ruma::events::room::message::RoomMessageEventContent;
use matrix_sdk::matrix_auth::MatrixSession;
use matrix_sdk::config::SyncSettings;
use serde::Serialize;
use serde_json;

// Custom structs to mirror matrix specification format
#[derive(Serialize)]
struct SavedMeta { user_id: String, device_id: String, }
#[derive(Serialize)]
struct SavedTokens { access_token: String, refresh_token: Option<String>, }
#[derive(Serialize)]
struct SavedSession { meta: SavedMeta, tokens: SavedTokens, }

/// Structured payload for JS when new message arrive
#[derive(Serialize)]
struct JsMessage {
    room_id: String,
    sender: String,
    body: String,
}

/// pass back login info to JavaScript
#[wasm_bindgen]
pub struct MatrixBridge {
    client: Client,
}

#[wasm_bindgen]
impl MatrixBridge {
    /// Connect to Synapse
    #[wasm_bindgen]
    pub async fn init() -> Result<MatrixBridge, JsValue> {
        let homeserver_url = "http://localhost:8008"; // local docker synapse instance

        let client = Client::builder()
            .homeserver_url(homeserver_url) // disable_ssl_verification() is helpful for local testing
            .build()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(MatrixBridge { client })
    }

    #[wasm_bindgen]
    pub async fn login(&self, username: &str, password: &str) -> Result<String, JsValue> {
        let auth_result = self.client
            .matrix_auth()
            .login_username(username, password)
            .initial_device_display_name("WASM Client")
            .send()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(format!("Successfully logged in as :: {}", auth_result.user_id))
    }

    #[wasm_bindgen]
    pub async fn register(&self, username: &str, password: &str) -> Result<String, JsValue> {
        let mut register_req = RegisterRequest::new();
        register_req.username = Some(username.to_string());
        register_req.password = Some(password.to_string());
        register_req.initial_device_display_name = Some("WASM Client".to_string());

        let _reg_result = self.client
            .matrix_auth()
            .register(register_req)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(format!("Successfull registered user :: {}", username))
    }

    /// To request current session tokens as json strings
    #[wasm_bindgen]
    pub fn export_session(&self) -> Result<Option<String>, JsValue> {
        let user_id = match self.client.user_id() { Some(id) => id.to_string(), None => return Ok(None), };
        let device_id = match self.client.device_id() { Some(id) => id.to_string(), None => return Ok(None), };
        let access_token = match self.client.access_token() { Some(token) => token, None => return Ok(None), };

        let saved = SavedSession {
            meta: SavedMeta { user_id, device_id },
            tokens: SavedTokens { access_token, refresh_token: None },
        };

        let json = serde_json::to_string(&saved)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(Some(json))
    }
    
    // To pass saved json session string back on stratup
    #[wasm_bindgen]
    pub async fn restore_session(&self, session_json: &str) -> Result<String, JsValue> {
        let session: MatrixSession = serde_json::from_str(session_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        self.client
            .matrix_auth()
            .restore_session(session)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let user_id = self.client
            .user_id()
            .map(|id| id.to_string())
            .unwrap_or_default();

        Ok(format!("Session successfully restored for :: {}", user_id))
    }

    // Authentication
    #[wasm_bindgen]
    pub async fn logout(&self) -> Result<String, JsValue> {
        self.client
            .matrix_auth()
            .logout()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok("Logged out Successfully".to_string())
    }

    // Messaging
    /// sends plain text message to a room id
    #[wasm_bindgen]
    pub async fn send_message(&self, room_id_str: &str, message: &str) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        if let Some(room) = self.client.get_room(room_id) {
            let content = RoomMessageEventContent::text_plain(message);
            let response = room.send(content).await
                .map_err(|e| JsValue::from_str(&e.to_string()))?;

            Ok(format!("Message sent! Event ID: {}", response.event_id))
        } else {
            Err(JsValue::from_str("Room not found or user is not a member!"))
        }
    }

    /// Registers a JavaScript callback that triggers whenever a text message comes in!
    pub async fn on_message(&self, callback: js_sys::Function) {
        self.client.add_event_handler(move | ev: AnySyncTimelineEvent, room: matrix_sdk::Room| async move {
            // Check if this event type contains a message-like payload
            if let AnySyncTimelineEvent::MessageLike(AnySyncMessageLikeEvent::RoomMessage(msg_event)) = ev {
                if let Some(original_event) = msg_event.as_original() {
                    if let MessageType::Text(text_content) = &original_event.content.msgtype {
                        let msg_payload = JsMessage {
                            room_id: room.room_id().to_string(),
                            sender: original_event.sender.to_string(),
                            body: text_content.body.clone(),
                        };

                        if let Ok(json_str) = serde_json::to_string(&msg_payload) {
                            let this = JsValue::null();
                            let arg = JsValue::from_str(&json_str);
                            let _ = callback.call1(&this, &arg);
                        }
                    }
                }
            }
        });
    }

    /// Triggers a single sync block with Synapse to receive real-time events.
    #[wasm_bindgen]
    pub async fn sync_once(&self) -> Result<(), JsValue> {
        let sync_settings = SyncSettings::default();

        self.client
            .sync_once(sync_settings)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(())
    }

    /// Create new public or private room
    #[wasm_bindgen]
    pub async fn create_room(&self, name: &str) -> Result<String, JsValue> {
        let mut req = CreateRoomRequest::new();
        req.name = Some(name.to_string());

        let room = self.client
            .create_room(req)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(room.room_id().to_string())
    }

    /// Joins a room using its Room ID or public alias string
    #[wasm_bindgen]
    pub async fn join_room(&self, room_id_or_alias: &str) -> Result<String, JsValue> {
        let parsed_id = <&RoomOrAliasId>::try_from(room_id_or_alias)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let room = self.client
            .join_room_by_id_or_alias(parsed_id, &[])
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        Ok(format!("Successfully joined: {}", room.room_id()))
    }

    /// Leaves a room
    #[wasm_bindgen]
    pub async fn leave_room(&self, room_id_str: &str) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        if let Some(room) = self.client.get_room(room_id) {
            room.leave()
                .await
                .map_err(|e| JsValue::from_str(&e.to_string()))?;
            Ok(format!("Successfully left room: {}", room_id_str))
        } else {
            Err(JsValue::from_str("Room not found"))
        }
    }
}
