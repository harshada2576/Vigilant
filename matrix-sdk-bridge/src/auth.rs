use crate::MatrixBridge;
use crate::types::{SavedMeta, SavedSession, SavedTokens};

use matrix_sdk::authentication::matrix::MatrixSession;
use matrix_sdk::ruma::api::client::account::register::v3::Request as RegisterRequest;
use matrix_sdk::store::RoomLoadSettings;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl MatrixBridge {
    // -------------------------
    // Login
    // -------------------------

    #[wasm_bindgen]
    pub async fn login(&self, username: &str, password: &str) -> Result<String, JsValue> {
        let auth_result = self
            .client
            .matrix_auth()
            .login_username(username, password)
            .initial_device_display_name("WASM Client")
            .send()
            .await
            .map_err(Self::js_error)?;

        Ok(format!(
            "Successfully logged in as :: {}",
            auth_result.user_id
        ))
    }

    // -------------------------
    // Register
    // -------------------------

    #[wasm_bindgen]
    pub async fn register(&self, username: &str, password: &str) -> Result<String, JsValue> {
        let mut request = RegisterRequest::new();

        request.username = Some(username.to_string());

        request.password = Some(password.to_string());

        request.initial_device_display_name = Some("WASM Client".to_string());

        self.client
            .matrix_auth()
            .register(request)
            .await
            .map_err(Self::js_error)?;

        Ok(format!("Successfully registered user :: {}", username))
    }

    // -------------------------
    // Export session
    // -------------------------

    #[wasm_bindgen]
    pub fn export_session(&self) -> Result<Option<String>, JsValue> {
        let user_id = match self.client.user_id() {
            Some(id) => id.to_string(),

            None => return Ok(None),
        };

        let device_id = match self.client.device_id() {
            Some(id) => id.to_string(),

            None => return Ok(None),
        };

        let access_token = match self.client.access_token() {
            Some(token) => token,

            None => return Ok(None),
        };

        let session = SavedSession {
            meta: SavedMeta { user_id, device_id },

            tokens: SavedTokens {
                access_token,

                refresh_token: None,
            },
        };

        let json = serde_json::to_string(&session).map_err(Self::js_error)?;

        Ok(Some(json))
    }

    // -------------------------
    // Restore session
    // -------------------------

    #[wasm_bindgen]
    pub async fn restore_session(&self, session_json: &str) -> Result<String, JsValue> {
        let session: MatrixSession = serde_json::from_str(session_json).map_err(Self::js_error)?;

        self.client
            .matrix_auth()
            .restore_session(session, RoomLoadSettings::default())
            .await
            .map_err(Self::js_error)?;

        let user_id = self
            .client
            .user_id()
            .map(|id| id.to_string())
            .unwrap_or_default();

        Ok(format!("Session successfully restored for :: {}", user_id))
    }

    // -------------------------
    // Logout
    // -------------------------

    #[wasm_bindgen]
    pub async fn logout(&self) -> Result<String, JsValue> {
        self.client
            .matrix_auth()
            .logout()
            .await
            .map_err(Self::js_error)?;

        Ok("Logged out Successfully".to_string())
    }
}
