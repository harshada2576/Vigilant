use crate::MatrixBridge;
use crate::types::{
    HistoryResponse, 
    JsMessage,
    extract_message_content,
};

use std::sync::Arc;
use matrix_sdk::ruma::RoomId;
use matrix_sdk_ui::timeline::{RoomExt, TimelineItem};
use wasm_bindgen::prelude::*;
use serde_json;

#[wasm_bindgen]
impl MatrixBridge {
    fn collect_messages<'a>(
        items: impl Iterator<Item = &'a Arc<TimelineItem>>,
        room_id_str: &str,
    ) -> Vec<JsMessage> {
        let mut messages = Vec::<JsMessage>::new();

        for item in items {
            let Some(event) = item.as_event() else {
                continue;
            };

            let Some(message) = event.content().as_message() else {
                continue;
            };
            let Some(content) = 
                extract_message_content(message.msgtype())
            else {
                continue;
            };

            messages.push(JsMessage {
                room_id: room_id_str.to_string(),
                sender: event.sender().to_string(),
                body: content.body,
                timestamp: event.timestamp().get().into(),
                message_type: content.message_type,
                message_uri: content.message_uri,
                mime_type: content.mime_type,
                media_source: content.media_source,
            });
        }
        messages.sort_by_key(|m| m.timestamp);

        messages
    }
    
    // -------------------------
    // Get room history
    // -------------------------

    #[wasm_bindgen]
    pub async fn get_room_history(&self, room_id_str: &str, limit: u16) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str).map_err(Self::js_error)?;

        let room = self
            .client
            .get_room(room_id)
            .ok_or_else(|| JsValue::from_str("Room not found"))?;

        let timeline = {
            let mut timelines = self.timelines.lock().await;

            if let Some(existing) = timelines.get(room_id_str) {
                existing.clone()
            } else {
                let timeline = room.timeline().await.map_err(Self::js_error)?;
                let timeline = std::sync::Arc::new(timeline);
                timelines.insert(room_id_str.to_string(), timeline.clone());
                timeline
            }
        };

        let has_more = timeline
            .paginate_backwards(limit)
            .await
            .map_err(Self::js_error)?;
        let items = timeline.items().await;

        let messages = Self::collect_messages(items.iter(), room_id_str);

        let response = HistoryResponse {
            messages,
            has_more,
        };

        serde_json::to_string(&response).map_err(Self::js_error)
    }

    // -------------------------
    // Load more history
    // -------------------------

    #[wasm_bindgen]
    pub async fn load_more_history(
        &self,
        room_id_str: &str,
        limit: u16,
    ) -> Result<String, JsValue> {
        let timelines = self.timelines.lock().await;

        let timeline = timelines
            .get(room_id_str)
            .ok_or_else(|| JsValue::from_str("Timeline not initialized"))?
            .clone();

        drop(timelines);

        let old_len = timeline.items().await.len();

        let has_more = timeline
            .paginate_backwards(limit)
            .await
            .map_err(Self::js_error)?;
        let items = timeline.items().await;
        let new_count = items.len().saturating_sub(old_len);

        let new_items = items
            .iter()
            .take(new_count);

        let messages = Self::collect_messages(new_items, room_id_str);

        let response = HistoryResponse {
            messages,
            has_more,
        };

        serde_json::to_string(&response).map_err(Self::js_error)
    }
}
