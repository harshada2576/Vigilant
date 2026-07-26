use serde::Serialize;

//
// Message payload sent to JavaScript
//

#[derive(Serialize)]
pub struct JsMessage {
    pub room_id: String,
    pub sender: String,
    pub body: String,
    pub timestamp: u64,

    pub message_type: String,
    pub message_uri: Option<String>,
    pub mime_type: Option<String>,

    pub media_source: Option<String>,
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

//
// for list_direct_messages
// better than returning ugly pile of IDs
//
#[derive(Serialize)]
pub struct JsDirectMessage {
    pub room_id: String,
    pub targets: Vec<String>,
    pub name: String,
}

// to use for extracting message content -- to give to frontend
use matrix_sdk::ruma::events::room::{
    MediaSource,
    message::MessageType,
};

//
// internal transport type
// - to be used for getting history of room - acomodate for diff types of data
// -- internally used only
//
pub(crate) struct MessageContent {
    pub message_type: String,
    pub body: String,
    pub message_uri: Option<String>,
    pub mime_type: Option<String>,
    pub media_source: Option<String>,
}

// a helper to extract mssg to give to frontend - only supported TEXT, IMAGE, FILE
pub(crate) fn extract_message_content(message: &MessageType) -> Option<MessageContent> {
    // TODO cycle 1 cleanup: don't swallow media source serialization errors
    match message {
        MessageType::Text(content) => Some(MessageContent {
            message_type: "text".to_string(),
            body: content.body.clone(),
            message_uri: None,
            mime_type: None,
            media_source: None,
        }),

        MessageType::Image(content) => {
            let uri = match &content.source {
                MediaSource::Plain(uri) => uri.to_string(),
                MediaSource::Encrypted(file) => file.url.to_string(),
            };

            Some(MessageContent {
                message_type: "image".to_string(),
                body: content.body.clone(),
                message_uri: Some(uri),
                mime_type: content
                    .info
                    .as_ref()
                    .and_then(|info| info.mimetype.clone()),
                media_source: serde_json::to_string(&content.source).ok(),
            })
        }

        MessageType::File(content) => {
            let uri = match &content.source {
                MediaSource::Plain(uri) => uri.to_string(),
                MediaSource::Encrypted(file) => file.url.to_string(),
            };

            Some(MessageContent {
                message_type: "file".to_string(),
                body: content.body.clone(),
                message_uri: Some(uri),
                mime_type: content
                    .info
                    .as_ref()
                    .and_then(|info| info.mimetype.clone()),
                media_source: serde_json::to_string(&content.source).ok(),
            })
        }

        _ => None,
    }
}
