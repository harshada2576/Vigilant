use crate::MatrixBridge;
use crate::types::JsMessage;

use matrix_sdk::ruma::events::{AnySyncMessageLikeEvent, AnySyncTimelineEvent};

use matrix_sdk::ruma::events::room::message::{MessageType, RoomMessageEventContent};

use matrix_sdk::ruma::RoomId;

use matrix_sdk::config::SyncSettings;

use wasm_bindgen::prelude::*;

use wasm_bindgen_futures::spawn_local;

use web_sys::console;

use serde_json;

#[wasm_bindgen]
impl MatrixBridge {
    // -------------------------
    // Send text message
    // -------------------------

    #[wasm_bindgen]
    pub async fn send_message(&self, room_id_str: &str, message: &str) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str).map_err(Self::js_error)?;

        let room = self
            .client
            .get_room(room_id)
            .ok_or_else(|| JsValue::from_str("Room not found or user is not a member!"))?;

        let content = RoomMessageEventContent::text_plain(message);

        let response = room.send(content).await.map_err(Self::js_error)?;

        Ok(format!(
            "Message sent! Event ID: {}",
            response.response.event_id
        ))
    }

    // -------------------------
    // Incoming message callback
    // -------------------------

    pub fn on_message(&self, callback: js_sys::Function) {
        self.client.add_event_handler(
            move |event: AnySyncTimelineEvent, room: matrix_sdk::Room| async move {
                if let AnySyncTimelineEvent::MessageLike(AnySyncMessageLikeEvent::RoomMessage(
                    message_event,
                )) = event
                    && let Some(original_event) = message_event.as_original()
                    && let MessageType::Text(text_content) = &original_event.content.msgtype
                {
                    let payload = JsMessage {
                        room_id: room.room_id().to_string(),

                        sender: original_event.sender.to_string(),

                        body: text_content.body.clone(),

                        timestamp: original_event.origin_server_ts.get().into(),
                    };

                    if let Ok(json) = serde_json::to_string(&payload) {
                        let this = JsValue::null();

                        let argument = JsValue::from_str(&json);

                        let _ = callback.call1(&this, &argument);
                    }
                }
            },
        );
    }

    // -------------------------
    // Start sync
    // -------------------------

    #[wasm_bindgen]
    pub fn start_sync(&self) {
        let client = self.client.clone();

        spawn_local(async move {
            let settings = SyncSettings::default();

            if let Err(error) = client.sync(settings).await {
                console::error_1(&JsValue::from_str(&error.to_string()));
            }
        });
    }
}
