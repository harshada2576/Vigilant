use crate::MatrixBridge;
use crate::types::{HistoryResponse, JsMessage};

use matrix_sdk::ruma::RoomId;
use matrix_sdk_ui::timeline::RoomExt;
use wasm_bindgen::prelude::*;
use serde_json;

#[wasm_bindgen]
impl MatrixBridge {
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

        timeline
            .paginate_backwards(limit)
            .await
            .map_err(Self::js_error)?;

        let mut messages = Vec::<JsMessage>::new();

        for item in timeline.items().await {
            let Some(event) = item.as_event() else {
                continue;
            };

            let Some(message) = event.content().as_message() else {
                continue;
            };

            messages.push(JsMessage {
                room_id: room.room_id().to_string(),
                sender: event.sender().to_string(),
                body: message.body().to_string(),
                timestamp: event.timestamp().get().into(),
            });
        }

        let response = HistoryResponse {
            messages,
            has_more: true,
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

        let can_paginate = timeline
            .paginate_backwards(limit)
            .await
            .map_err(Self::js_error)?;

        let mut messages = Vec::<JsMessage>::new();

        for item in timeline.items().await {
            let Some(event) = item.as_event() else {
                continue;
            };

            let Some(message) = event.content().as_message() else {
                continue;
            };

            messages.push(JsMessage {
                room_id: room_id_str.to_string(),
                sender: event.sender().to_string(),
                body: message.body().to_string(),
                timestamp: event.timestamp().get().into(),
            });
        }

        let response = HistoryResponse {
            messages,
            has_more: can_paginate,
        };

        serde_json::to_string(&response).map_err(Self::js_error)
    }
}
