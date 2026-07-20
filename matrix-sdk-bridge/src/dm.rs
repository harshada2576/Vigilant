use crate::MatrixBridge;

use matrix_sdk::ruma::UserId;
use matrix_sdk::ruma::api::client::room::create_room::v3::Request;

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
}
