mod auth;
mod dm;
mod messaging;
mod rooms;
mod timeline;
mod types;

use async_lock::Mutex;
use matrix_sdk::Client;
use matrix_sdk_ui::timeline::Timeline;

use std::collections::HashMap;
use std::sync::Arc;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct MatrixBridge {
    pub(crate) client: Client,

    pub(crate) timelines: Arc<Mutex<HashMap<String, Arc<Timeline>>>>,
}

#[wasm_bindgen]
impl MatrixBridge {
    pub(crate) fn js_error<E: std::fmt::Display>(err: E) -> JsValue {
        JsValue::from_str(&err.to_string())
    }

    #[wasm_bindgen]
    pub async fn init() -> Result<MatrixBridge, JsValue> {
        let homeserver_url = "http://localhost:8008";

        let client = Client::builder()
            .homeserver_url(homeserver_url)
            .build()
            .await
            .map_err(Self::js_error)?;

        Ok(MatrixBridge {
            client,

            timelines: Arc::new(Mutex::new(HashMap::new())),
        })
    }
}
