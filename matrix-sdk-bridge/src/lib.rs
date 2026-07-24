mod auth;
mod dm;
mod media;
mod messaging;
mod notification;
mod rooms;
mod timeline;
mod types;

use async_lock::Mutex;
use matrix_sdk::{
    Client,
    config::SyncSettings,
};
use matrix_sdk_ui::timeline::Timeline;

use std::{
    rc::Rc,
    cell::Cell,
    collections::HashMap,
    sync::Arc,
};

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;
use web_sys::console;

#[wasm_bindgen]
pub struct MatrixBridge {
    pub(crate) client: Client,
    pub(crate) timelines: Arc<Mutex<HashMap<String, Arc<Timeline>>>>,
    pub(crate) sync_running: Rc<Cell<bool>>,
    pub(crate) initial_sync_complete: Rc<Cell<bool>>,
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
            sync_running: Rc::new(Cell::new(false)),
            initial_sync_complete: Rc::new(Cell::new(false)),
        })
    }

    // -------------------------
    // Start sync
    // -------------------------

    #[wasm_bindgen]
    pub fn start_sync(&self) -> Result<(), JsValue> {
        if self.sync_running.get() {
            return Err(JsValue::from_str("Sync is already running"));
        }

        self.sync_running.set(true);
        self.initial_sync_complete.set(false);

        let client = self.client.clone();
        let sync_running = self.sync_running.clone();
        let initial_sync_complete = self.initial_sync_complete.clone();

        spawn_local(async move {
            // first sync establishes current state
            if let Err(error) = client
                .sync_once(SyncSettings::default())
                .await 
            {
                sync_running.set(false);

                console::error_1(
                    &JsValue::from_str(&format!("Initial Sync failed: {error}"))
                );

                return;
            }

            initial_sync_complete.set(true);

            // continous sync
            if let Err(error) = client
                .sync_with_callback(
                    SyncSettings::default(),
                    move |_| {
                        let sync_running = sync_running.clone();

                        async move {
                            if sync_running.get() {
                                matrix_sdk::LoopCtrl::Continue
                            } else {
                                matrix_sdk::LoopCtrl::Break
                            }
                        }
                    },
                )
                .await
            {
                console::error_1(
                    &JsValue::from_str(&format!("Sync failed: {error}"))
                )
            }
        });

        Ok(())
    }

    #[wasm_bindgen]
    pub fn stop_sync(&self) {
        self.sync_running.set(false);
        self.initial_sync_complete.set(false);
    }
}
