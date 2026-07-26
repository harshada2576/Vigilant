use crate::MatrixBridge;
use crate::types::JsRoom;

use matrix_sdk::ruma::{
    UserId,
    RoomId, 
    RoomOrAliasId,
    api::client::room::create_room::v3::Request as CreateRoomRequest,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl MatrixBridge {
    // -------------------------
    // Create room
    // -------------------------

    #[wasm_bindgen]
    pub async fn create_room(&self, name: &str) -> Result<String, JsValue> {
        let mut request = CreateRoomRequest::new();

        request.name = Some(name.to_string());

        let room = self
            .client
            .create_room(request)
            .await
            .map_err(Self::js_error)?;

        Ok(room.room_id().to_string())
    }

    // -------------------------
    // Join room
    // -------------------------

    #[wasm_bindgen]
    pub async fn join_room(&self, room_id_or_alias: &str) -> Result<String, JsValue> {
        let parsed = <&RoomOrAliasId>::try_from(room_id_or_alias).map_err(Self::js_error)?;

        let room = self
            .client
            .join_room_by_id_or_alias(parsed, &[])
            .await
            .map_err(Self::js_error)?;

        Ok(format!("Successfully joined: {}", room.room_id()))
    }

    // -------------------------
    // List joined rooms
    // -------------------------

    #[wasm_bindgen]
    pub async fn list_joined_rooms(&self) -> Result<String, JsValue> {
        let rooms = self.client.joined_rooms();

        let mut result = Vec::with_capacity(rooms.len());

        for room in rooms {
            result.push(JsRoom {
                room_id: room.room_id().to_string(),

                name: room
                    .display_name()
                    .await
                    .map_err(Self::js_error)?
                    .to_string(),
            });
        }

        serde_json::to_string(&result).map_err(Self::js_error)
    }

    //
    // invite someone else
    //
    #[wasm_bindgen]
    pub async fn invite_user(&self, room_id_str: &str, user_id_str: &str) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str)
            .map_err(Self::js_error)?;

        let user_id = <&UserId>::try_from(user_id_str)
            .map_err(Self::js_error)?;

        let room = self.client
            .get_room(room_id)
            .ok_or_else(|| JsValue::from_str("Room not found"))?;
            
        room.invite_user_by_id(user_id)
            .await
            .map_err(Self::js_error)?;

        Ok(format!("Invited {} to {}", user_id_str, room_id_str))
    }

    // -------------------------
    // Leave room
    // -------------------------

    #[wasm_bindgen]
    pub async fn leave_room(&self, room_id_str: &str) -> Result<String, JsValue> {
        let room_id = <&RoomId>::try_from(room_id_str).map_err(Self::js_error)?;

        let room = self
            .client
            .get_room(room_id)
            .ok_or_else(|| JsValue::from_str("Room not found"))?;

        room.leave().await.map_err(Self::js_error)?;

        Ok(format!("Successfully left room: {}", room_id_str))
    }
}
