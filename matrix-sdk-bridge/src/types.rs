use serde::Serialize;

//
// Session export structures
//

#[derive(Serialize)]
pub struct SavedMeta {
    pub user_id: String,

    pub device_id: String,
}

#[derive(Serialize)]
pub struct SavedTokens {
    pub access_token: String,

    pub refresh_token: Option<String>,
}

#[derive(Serialize)]
pub struct SavedSession {
    pub meta: SavedMeta,

    pub tokens: SavedTokens,
}

//
// Message payload sent to JavaScript
//

#[derive(Serialize)]
pub struct JsMessage {
    pub room_id: String,

    pub sender: String,

    pub body: String,

    pub timestamp: u64,
}

#[derive(Serialize)]
pub struct Notification {
    pub event_type:String,
    pub room_id:String,
    pub sender:String,
    pub body:String,
}

//
// Room payload sent to JavaScript
//

#[derive(Serialize)]
pub struct JsRoom {
    pub room_id: String,

    pub name: String,
}

//
// Timeline pagination response
//

#[derive(Serialize)]
pub struct HistoryResponse {
    pub messages: Vec<JsMessage>,

    pub has_more: bool,
}
