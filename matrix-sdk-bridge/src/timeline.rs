use crate::MatrixBridge;
use crate::types::{
    HistoryResponse,
    JsMessage,
    extract_message_content,
};

use std::sync::Arc;

use matrix_sdk::ruma::{
    OwnedEventId,
    RoomId,
};

use matrix_sdk_ui::timeline::{
    RoomExt,
    TimelineItem,
};

use wasm_bindgen::prelude::*;


#[wasm_bindgen]
impl MatrixBridge {
    // ---------------------------------------------------------
    // Convert Matrix timeline items into frontend JsMessages.
    //
    // Event IDs are retained internally so pagination can
    // determine which messages have already been exposed.
    // ---------------------------------------------------------

    fn collect_messages<'a>(
        items: impl Iterator<Item = &'a Arc<TimelineItem>>,
        room_id_str: &str,
    ) -> Vec<(OwnedEventId, JsMessage)> {
        let mut messages = Vec::new();

        for item in items {
            let Some(event) = item.as_event() else {
                continue;
            };

            // Local echoes may not yet have a server event ID.
            // History only deals with persisted events.
            let Some(event_id) = event.event_id() else {
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

            let message = JsMessage {
                room_id: room_id_str.to_string(),
                sender: event.sender().to_string(),
                body: content.body,
                timestamp: event.timestamp().get().into(),

                message_type: content.message_type,
                message_uri: content.message_uri,
                mime_type: content.mime_type,
                media_source: content.media_source,
            };

            messages.push((
                event_id.to_owned(),
                message,
            ));
        }

        // Frontend receives chronological order.
        messages.sort_by_key(|(_, message)| message.timestamp);

        messages
    }


    // ---------------------------------------------------------
    // Get initial room history
    // ---------------------------------------------------------

    #[wasm_bindgen]
    pub async fn get_room_history(
        &self,
        room_id_str: &str,
        limit: u16,
    ) -> Result<String, JsValue> {
        if !self.initial_sync_complete.get() {
            return Err(JsValue::from_str(
                "Initial sync has not completed yet"
            ));
        }

        let room_id =
            <&RoomId>::try_from(room_id_str)
                .map_err(Self::js_error)?;

        let room = self
            .client
            .get_room(room_id)
            .ok_or_else(|| {
                JsValue::from_str("Room not found")
            })?;

        // Get or create the persistent Timeline for this room.
        let timeline = {
            let mut timelines =
                self.timelines.lock().await;

            if let Some(existing) =
                timelines.get(room_id_str)
            {
                existing.clone()
            } else {
                let timeline =
                    room.timeline()
                        .await
                        .map_err(Self::js_error)?;

                let timeline = Arc::new(timeline);

                timelines.insert(
                    room_id_str.to_string(),
                    timeline.clone(),
                );

                timeline
            }
        };


        // -----------------------------------------------------
        // First snapshot
        //
        // A newly-created matrix-sdk-ui Timeline may initially
        // contain no historical message events.
        // -----------------------------------------------------

        let initial_items = timeline.items().await;

        let mut extracted =
            Self::collect_messages(
                initial_items.iter(),
                room_id_str,
            );


        // -----------------------------------------------------
        // If history is not present yet, paginate backwards.
        //
        // This avoids requiring the frontend to make the same
        // history request twice just to initialize the timeline.
        // -----------------------------------------------------

        let hit_start = if extracted.is_empty() {
            let hit_start = timeline
                .paginate_backwards(limit)
                .await
                .map_err(Self::js_error)?;

            let items = timeline.items().await;

            extracted =
                Self::collect_messages(
                    items.iter(),
                    room_id_str,
                );

            hit_start
        } else {
            false
        };


        // -----------------------------------------------------
        // If we already had timeline messages, still request
        // history until roughly the requested amount exists.
        // -----------------------------------------------------

        let hit_start = if !extracted.is_empty()
            && extracted.len() < limit as usize
            && !hit_start
        {
            let hit_start = timeline
                .paginate_backwards(limit)
                .await
                .map_err(Self::js_error)?;

            let items = timeline.items().await;

            extracted =
                Self::collect_messages(
                    items.iter(),
                    room_id_str,
                );

            hit_start
        } else {
            hit_start
        };


        // -----------------------------------------------------
        // Establish history baseline.
        //
        // get_room_history() starts/resets pagination state.
        // -----------------------------------------------------

        let mut exposed_history =
            self.exposed_history.lock().await;

        let seen = exposed_history
            .entry(room_id_str.to_string())
            .or_default();

        seen.clear();

        let mut messages = Vec::new();

        for (event_id, message) in extracted {
            seen.insert(event_id);
            messages.push(message);
        }


        let response = HistoryResponse {
            messages,
            has_more: !hit_start,
        };

        serde_json::to_string(&response)
            .map_err(Self::js_error)
    }


    // ---------------------------------------------------------
    // Load older room history
    // ---------------------------------------------------------

    #[wasm_bindgen]
    pub async fn load_more_history(
        &self,
        room_id_str: &str,
        limit: u16,
    ) -> Result<String, JsValue> {
        if !self.initial_sync_complete.get() {
            return Err(JsValue::from_str(
                "Initial sync has not completed yet"
            ));
        }

        // load_more requires get_room_history() to have already
        // initialized the Timeline.
        let timeline = {
            let timelines =
                self.timelines.lock().await;

            timelines
                .get(room_id_str)
                .ok_or_else(|| {
                    JsValue::from_str(
                        "Timeline not initialized. \
                         Call get_room_history first."
                    )
                })?
                .clone()
        };


        let hit_start = timeline
            .paginate_backwards(limit)
            .await
            .map_err(Self::js_error)?;

        let items = timeline.items().await;

        let extracted =
            Self::collect_messages(
                items.iter(),
                room_id_str,
            );


        // -----------------------------------------------------
        // Only expose events that weren't returned previously.
        // -----------------------------------------------------

        let mut exposed_history =
            self.exposed_history.lock().await;

        let seen = exposed_history
            .entry(room_id_str.to_string())
            .or_default();

        let mut messages = Vec::new();

        for (event_id, message) in extracted {
            if seen.insert(event_id) {
                messages.push(message);
            }
        }


        let response = HistoryResponse {
            messages,
            has_more: !hit_start,
        };

        serde_json::to_string(&response)
            .map_err(Self::js_error)
    }
}
