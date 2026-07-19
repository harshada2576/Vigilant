#[wasm_bindgen]
pub fn on_notification(&self, callback: js_sys::Function) {
    let callback = Arc::new(callback);
    self.client.add_event_handler( move | event: AnySyncTimelineEvent, room: matrix_sdk::Room | async move {
        let notification = Notification {
            event_type: "message".into(),
            room_id: room.room_id().to_string(),
            sender: "".into(),
            body: "New event".into(),
        };
        let json = serde_json::to_string(&notification)
            .unwrap();
        let _ = callback.call1(&JsValue::NULL, &JsValue::from_str(&json) );
    });

}
