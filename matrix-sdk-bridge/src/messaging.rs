use crate::MatrixBridge;
use crate::types::{
    JsMessage,
    extract_message_content,
};

use matrix_sdk::{
    ruma::{
        RoomId,
        events::{
            AnySyncMessageLikeEvent, 
            AnySyncTimelineEvent,
            room::message::RoomMessageEventContent,
        },
    },
};

use wasm_bindgen::prelude::*;

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
                {
                    let Some(content) = 
                        extract_message_content(&original_event.content.msgtype)
                    else { 
                        return; 
                    };

                    let payload = JsMessage {
                        room_id: room.room_id().to_string(),
                        sender: original_event.sender.to_string(),
                        body: content.body,
                        timestamp: original_event.origin_server_ts.get().into(),
                        message_type: content.message_type,
                        message_uri: content.message_uri,
                        mime_type: content.mime_type,
                        media_source: content.media_source,
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
}
