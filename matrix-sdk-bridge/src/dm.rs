use crate::{
    MatrixBridge,
    types::JsDirectMessage,
};

use matrix_sdk::ruma::{
    UserId,
    api::client::room::create_room::v3::Request,
    events::direct::DirectUserIdentifier,
};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl MatrixBridge {
    #[wasm_bindgen]
    pub async fn create_direct_message(&self, user_id_str: &str) -> Result<String, JsValue> {
        let user_id = <&UserId>::try_from(user_id_str)
            .map_err(Self::js_error)?;
        
        let mut request = Request::new();
        request.invite = vec![
            user_id.to_owned()
        ];

        request.is_direct = true;

        let room = self.client
            .create_room(request)
            .await
            .map_err(Self::js_error)?;

        Ok(room.room_id().to_string())
    }

    #[wasm_bindgen]
    pub async fn find_direct_message(&self, user_id_str: &str) -> Result<Option<String>, JsValue> {
        let user_id = <&UserId>::try_from(user_id_str)
            .map_err(Self::js_error)?;

        let direct_target = <&DirectUserIdentifier>::from(user_id.as_str());

        for room in self.client.joined_rooms() {
            if room.direct_targets().contains(direct_target) {
                return Ok(Some(room.room_id().to_string()));
            }
        }

        Ok(None)
    }

    #[wasm_bindgen]
    pub async fn get_or_create_direct_message(&self, user_id_str: &str) -> Result<String, JsValue> {
        if let Some(room_id) = self.find_direct_message(user_id_str).await? {
            return Ok(room_id);
        }

        self.create_direct_message(user_id_str).await
    }

    #[wasm_bindgen]
    pub async fn list_direct_messages(&self) -> Result<String, JsValue> {
        let rooms = self.client.joined_rooms();

        let mut res = Vec::new();

        for room in rooms {
            let direct_targets = room.direct_targets();

            if direct_targets.is_empty() {
                continue;
            }

            res.push(JsDirectMessage {
                room_id: room.room_id().to_string(),
                targets: direct_targets
                    .into_iter()
                    .map(|target| target.to_string())
                    .collect(),
                name: room.display_name()
                    .await
                    .map_err(Self::js_error)?
                    .to_string(),
            });
        }

        serde_json::to_string(&res)
            .map_err(Self::js_error)
    }
}
