use crate::{
    MatrixBridge,
    types::{
        Notification,
        extract_message_content,
    },
};

use matrix_sdk::{
    Room,
    ruma::events::{
        AnySyncMessageLikeEvent,
        AnySyncTimelineEvent,
    },
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl MatrixBridge{
    #[wasm_bindgen]
    pub fn on_notification(&self, callback: js_sys::Function) {
        let own_user_id = self.client
            .user_id()
            .map(|id| id.to_owned());

        let initial_sync_complete = self.initial_sync_complete.clone();

        self.client.add_event_handler(
            move |
                event: AnySyncTimelineEvent,
                room: Room,
            | async move {
                // Suppress notifications that arrive during the initial sync
                // pass. Once initial_sync_complete is true, all subsequent
                // events are genuinely new messages.
                if !initial_sync_complete.get() {
                    return;
                }

                let AnySyncTimelineEvent::MessageLike(
                    AnySyncMessageLikeEvent::RoomMessage(message_event)
                ) = event else {
                    return;
                };

                let Some(orignal_event) = message_event.as_original() else {
                    return;
                };

                // dont notify user about own message
                if own_user_id.as_ref()
                    .is_some_and(|id| id == &orignal_event.sender)
                {
                    return;
                }

                let Some(content) = extract_message_content(&orignal_event.content.msgtype) else {
                    return;
                };

                let notification = Notification {
                    event_type: content.message_type,
                    room_id: room.room_id().to_string(),
                    sender: orignal_event.sender.to_string(),
                    body: content.body,
                };

                if let Ok(json) = serde_json::to_string(&notification) {
                    let _ = callback.call1(
                        &JsValue::NULL,
                        &JsValue::from_str(&json),
                    );
                }
            },
        );
    }
}
