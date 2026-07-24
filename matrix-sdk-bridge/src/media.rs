use crate::MatrixBridge;

use matrix_sdk::media::{
    MediaFormat,
    MediaRequestParameters,
};
use matrix_sdk::ruma::{
    RoomId,
    events::room::{
        MediaSource,
        message::{
            FileMessageEventContent,
            ImageMessageEventContent,
            MessageType,
            RoomMessageEventContent,
        },
    },
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl MatrixBridge {
    async fn upload_media(
        &self,
        data: Vec<u8>,
        mime_type: &mime::Mime,
    ) -> Result<matrix_sdk::ruma::OwnedMxcUri, JsValue> {
        let response = self.client
            .media()
            .upload(mime_type, data, None)
            .await
            .map_err(Self::js_error)?;

        Ok(response.content_uri)
    }

    #[wasm_bindgen]
    pub async fn send_file(
        &self,
        room_id_str: &str,
        data: Vec<u8>,
        filename: &str,
        mime_type: &str,
    ) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str)
            .map_err(Self::js_error)?;

        let room = self.client
            .get_room(room_id)
            .ok_or_else(|| JsValue::from_str("Room not found"))?;

        let mime_type: mime::Mime = mime_type
            .parse()
            .map_err(Self::js_error)?;

        if mime_type != mime::APPLICATION_PDF {
            return Err(JsValue::from_str("Only PDF files are supported"));
        }

        let uri = self
            .upload_media(data, &mime_type)
            .await?;

        let file = FileMessageEventContent::plain(
            filename.to_string(),
            uri,
        );

        let content = RoomMessageEventContent::new(
            MessageType::File(file)
        );

        let response = room
            .send(content)
            .await
            .map_err(Self::js_error)?
            .response;

        Ok(response.event_id.to_string())
    }

    #[wasm_bindgen]
    pub async fn send_image(
        &self,
        room_id_str: &str,
        data: Vec<u8>,
        filename: &str,
        mime_type: &str,
    ) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str)
            .map_err(Self::js_error)?;

        let room = self.client
            .get_room(room_id)
            .ok_or_else(|| JsValue::from_str("Room not found"))?;

        let mime_type: mime::Mime = mime_type
            .parse()
            .map_err(Self::js_error)?;

        if mime_type.type_() != mime::IMAGE {
            return Err(JsValue::from_str("send_image requires an image MIME type"));
        }

        let uri = self
            .upload_media(data, &mime_type)
            .await?;

        let image = ImageMessageEventContent::plain(
            filename.to_string(),
            uri,
        );

        let content = RoomMessageEventContent::new(
            MessageType::Image(image)
        );

        let response = room
            .send(content)
            .await
            .map_err(Self::js_error)?
            .response;

        Ok(response.event_id.to_string())
    }

    #[wasm_bindgen]
    pub async fn get_media(&self, media_source_json: &str) -> Result<Vec<u8>, JsValue> {
        let source: MediaSource = serde_json::from_str(media_source_json)
            .map_err(Self::js_error)?;

        let request = MediaRequestParameters {
            source,
            format: MediaFormat::File,
        };

        let data = self.client
            .media()
            .get_media_content(&request, true)
            .await
            .map_err(Self::js_error)?;

        Ok(data)
    }
}
