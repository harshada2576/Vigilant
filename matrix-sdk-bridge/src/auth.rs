use crate::MatrixBridge;

use matrix_sdk::{
    authentication::matrix::MatrixSession,
    ruma::api::client::{
        uiaa::{
            AuthData,
            Dummy,
        },
        account::register::v3::Request as RegisterRequest,
    },
};

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
    // - m.login.dummy is the UIAA stage Synapse requires before allowing registration.
    // - future -- email, captcha, registration token, terms 
    // -------------------------

    #[wasm_bindgen]
    pub async fn register(&self, username: &str, password: &str) -> Result<String, JsValue> {
        // first registeration attemp : dont know weather homeserver requires uiaa
        let mut request = RegisterRequest::new();

        request.username = Some(username.to_string());
        request.password = Some(password.to_string());
        request.initial_device_display_name = Some("WASM Client".to_string());

        match self.client.matrix_auth().register(request).await {
            // homeserver didnt req uiaa
            Ok(_) => {
                Ok(format!("Successfully registered user :: {}", username))
            }

            Err(error) => {
                let Some(uiaa) = error.as_uiaa_response() else {
                    return Err(Self::js_error(error));
                };

                // Only support for automatic dummy UIAA in Cycle 1.
                let supports_dummy = uiaa.flows.iter().any(|flow| {
                    flow.stages.iter().any(|stage| {
                        stage.as_str() == "m.login.dummy"
                    })
                });

                
                if !supports_dummy {
                    return Err(JsValue::from_str("Registration requires an unsupported UIAA flow"));
                }

                // synapse should give session to continue
                let session = uiaa
                    .session
                    .clone()
                    .ok_or_else(|| {
                        JsValue::from_str("UIAA response did not contain a session")
                    })?;
                
                // construct auth response for m.login.dummy
                let mut dummy = Dummy::new();
                dummy.session = Some(session);
                let auth = AuthData::Dummy(dummy);

                // new req as orignal was consumed
                let mut request = RegisterRequest::new();

                request.username = Some(username.to_string());
                request.password = Some(password.to_string());
                request.initial_device_display_name =
                    Some("Vigilant WASM Client".to_string());

                request.auth = Some(auth);

                // retry -- now satisfied uiaa challange
                self.client
                    .matrix_auth()
                    .register(request)
                    .await
                    .map_err(Self::js_error)?;

                Ok(format!("Successfully registered user: {}", username))
            }
        }
    }

    // -------------------------
    // Export session
    // -------------------------

    #[wasm_bindgen]
    pub fn export_session(&self) -> Result<Option<String>, JsValue> {
        let Some(session) = self.client.matrix_auth().session() else {
            return Ok(None);
        };

        let json = serde_json::to_string(&session)
            .map_err(Self::js_error)?;

        Ok(Some(json))
    }

    // -------------------------
    // Restore session
    // -------------------------

    #[wasm_bindgen]
    pub async fn restore_session(&self, session_json: &str) -> Result<String, JsValue> {
        let session: MatrixSession = serde_json::from_str(session_json)
            .map_err(Self::js_error)?;

        self.client
            .matrix_auth()
            .restore_session(session, Default::default())
            .await
            .map_err(Self::js_error)?;

        let user_id = self.client
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
        self.sync_running.set(false);
        self.initial_sync_complete.set(false);

        self.client
            .matrix_auth()
            .logout()
            .await
            .map_err(Self::js_error)?;

        Ok("Logged out Successfully".to_string())
    }
}
