use anyhow::{Context, Result, anyhow};
use matrix_sdk::{
    config::SyncSettings,
    ruma::{
        UserId, OwnedUserId,
        events::{
            room::message::{SyncRoomMessageEvent, MessageType},
            key::verification::request::ToDeviceKeyVerificationRequestEvent,
        },
    },
    Client, Room,
    authentication::AuthSession,
};
use std::{
    env,
    path::Path,
};
use tokio::sync::mpsc::Sender;
use crate::app::AppEvent;
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Nonce
};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;

pub fn derive_session_key(passphrase: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(passphrase.as_bytes(), salt, 600_000, &mut key);
    key
}

pub fn encrypt_session_data(data: &[u8], passphrase: &str) -> Result<Vec<u8>> {
    let mut salt = [0u8; 16];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut salt);
    let key = derive_session_key(passphrase, &salt);

    let cipher = ChaCha20Poly1305::new(&key.into());
    let mut nonce_bytes = [0u8; 12];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, data)
        .map_err(|e| anyhow!("Encryption error: {}", e))?;

    let mut result = salt.to_vec();
    result.extend(nonce_bytes);
    result.extend(ciphertext);
    Ok(result)
}

pub fn decrypt_session_data(data: &[u8], passphrase: &str) -> Result<Vec<u8>> {
    if data.len() < 28 {
        return Err(anyhow!("Data too short (must be at least 28 bytes for salt and nonce)"));
    }
    let salt = &data[0..16];
    let nonce = Nonce::from_slice(&data[16..28]);
    let ciphertext = &data[28..];

    let key = derive_session_key(passphrase, salt);
    let cipher = ChaCha20Poly1305::new(&key.into());
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| anyhow!("Decryption error (invalid passphrase): {}", e))?;
    Ok(plaintext)
}

pub fn check_session_integrity(user: &str, session_pass: &str) -> Result<()> {
    let session_file = format!("session_{}.json.enc", user);
    if !Path::new(&session_file).exists() {
        return Err(anyhow!("Session file '{}' not found", session_file));
    }
    let encrypted_bytes = std::fs::read(&session_file)
        .context("Failed to read session file")?;
    let decrypted_bytes = decrypt_session_data(&encrypted_bytes, session_pass)
        .context("Failed to decrypt session file (invalid passphrase or corrupted data)")?;
    serde_json::from_slice::<matrix_sdk::authentication::matrix::MatrixSession>(&decrypted_bytes)
        .context("Failed to parse decrypted session data as valid JSON")?;
    Ok(())
}

pub fn start_emoji_polling(
    client: Client,
    user_id: OwnedUserId,
    flow_id: String,
    event_tx: Sender<AppEvent>,
) {
    tokio::spawn(async move {
        let mut accepted = false;
        let mut emojis_printed = false;
        for _ in 0..60 {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            if let Some(verification) = client.encryption().get_verification(&user_id, &flow_id).await {
                if let Some(sas) = verification.sas() {
                    if !accepted {
                        let _ = sas.accept().await;
                        accepted = true;
                    }
                    if let Some(emojis) = sas.emoji() {
                        if !emojis_printed {
                            let _ = event_tx.send(AppEvent::VerificationSasEmoji {
                                user_id: user_id.to_string(),
                                flow_id: flow_id.clone(),
                                emojis: emojis.to_vec(),
                            }).await;
                            emojis_printed = true;
                        }
                    }
                    if sas.is_done() {
                        let _ = event_tx.send(AppEvent::VerificationSasDone {
                            other_device_id: sas.other_device().device_id().to_string(),
                            user_id: user_id.to_string(),
                        }).await;
                        break;
                    } else if sas.is_cancelled() {
                        let _ = event_tx.send(AppEvent::VerificationSasCancelled).await;
                        break;
                    }
                }
            }
        }
    });
}

pub async fn login_and_sync(
    homeserver_url: &str,
    user: &str,
    db_pass: &str,
    session_pass: &str,
    event_tx: Sender<AppEvent>,
) -> Result<Client> {
    let session_file = format!("session_{}.json.enc", user);
    let legacy_session_file = format!("session_{}.json", user);
    let store_path = format!("matrix_store_{}", user);

    let client = Client::builder()
        .homeserver_url(homeserver_url)
        .disable_ssl_verification()
        .sqlite_store(&store_path, Some(db_pass))
        .build()
        .await
        .context("Failed to build Matrix client (check your database passphrase)")?;

    // Check if legacy unencrypted session file exists and delete it for security compliance
    if Path::new(&legacy_session_file).exists() {
        let _ = std::fs::remove_file(&legacy_session_file);
    }

    let logged_in = if Path::new(&session_file).exists() {
        match std::fs::read(&session_file) {
            Ok(encrypted_bytes) => {
                match decrypt_session_data(&encrypted_bytes, session_pass) {
                    Ok(decrypted_bytes) => {
                        match serde_json::from_slice::<matrix_sdk::authentication::matrix::MatrixSession>(&decrypted_bytes) {
                            Ok(matrix_session) => {
                                let session = AuthSession::Matrix(matrix_session);
                                match client.restore_session(session).await {
                                    Ok(_) => true,
                                    Err(_) => false,
                                }
                            }
                            Err(_) => false,
                        }
                    }
                    Err(_) => false,
                }
            }
            Err(_) => false,
        }
    } else {
        false
    };

    if !logged_in {
        let password = env::var("CIPHERLINK_PASS").unwrap_or_else(|_| "testpassword".to_string());
        let user_id = UserId::parse(format!("@{}:cipherlink.local", user))
            .map_err(|e| anyhow!("Invalid User ID format: {}", e))?;

        let _response = client
            .matrix_auth()
            .login_username(&user_id, &password)
            .send()
            .await
            .context("Login failed")?;

        let session = client.session().context("Failed to retrieve session from client")?;

        if let AuthSession::Matrix(matrix_session) = session {
            let json_bytes = serde_json::to_vec_pretty(&matrix_session).context("Failed to serialize session")?;
            let encrypted_bytes = encrypt_session_data(&json_bytes, session_pass).context("Failed to encrypt session file")?;
            std::fs::write(&session_file, encrypted_bytes).context("Failed to write encrypted session file")?;
        }
    }

    // Spawn Background Sync
    let client_sync = client.clone();
    let tx = event_tx.clone();
    tokio::spawn(Box::pin(async move {
        let sync_settings = SyncSettings::default();
        if let Err(e) = client_sync.sync(sync_settings).await {
            let _ = tx.send(AppEvent::MessageSync(format!("Sync error: {}", e))).await;
        }
    }));

    // Register handlers forwarding to event_tx
    let tx1 = event_tx.clone();
    client.add_event_handler(move |ev: SyncRoomMessageEvent, room: Room| {
        let tx = tx1.clone();
        async move {
            if let Some(msg) = ev.as_original() {
                let room_name = room.name().unwrap_or_else(|| room.room_id().to_string());
                if let MessageType::Text(text) = &msg.content.msgtype {
                    let _ = tx.send(AppEvent::MessageSync(format!(
                        "[{}] {}: {}",
                        room_name, msg.sender, text.body
                    ))).await;
                }
            }
        }
    });

    let tx2 = event_tx.clone();
    client.add_event_handler(move |ev: ToDeviceKeyVerificationRequestEvent| {
        let tx = tx2.clone();
        async move {
            let _ = tx.send(AppEvent::VerificationRequest {
                sender: ev.sender.to_string(),
                transaction_id: ev.content.transaction_id.to_string(),
            }).await;
        }
    });

    Ok(client)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_decryption_integrity() {
        let plaintext = b"{\"user_id\":\"@testuser:cipherlink.local\",\"device_id\":\"CFVLZJYFYN\",\"access_token\":\"syt_dGVzdHVzZXI_LIFIdviLpJLlHTzeoFTy_33umvt\"}";
        let pass = "correct_passphrase";

        let encrypted = encrypt_session_data(plaintext, pass).unwrap();
        assert_ne!(encrypted, plaintext);

        // Verify it begins with 16 bytes of salt and 12 bytes of nonce
        assert!(encrypted.len() > 28);

        // Verify correct decryption
        let decrypted = decrypt_session_data(&encrypted, pass).unwrap();
        assert_eq!(decrypted, plaintext);

        // Verify incorrect decryption fails
        let decrypt_fail = decrypt_session_data(&encrypted, "wrong_passphrase");
        assert!(decrypt_fail.is_err());
    }

    #[test]
    fn test_check_session_integrity() {
        let plaintext = b"{\"user_id\":\"@testuser:cipherlink.local\",\"device_id\":\"CFVLZJYFYN\",\"access_token\":\"syt_dGVzdHVzZXI_LIFIdviLpJLlHTzeoFTy_33umvt\"}";
        let pass = "correct_session_pass";
        let user = "testuser_temp";
        let session_file = format!("session_{}.json.enc", user);

        // Ensure clean state
        let _ = std::fs::remove_file(&session_file);

        // 1. Check integrity when file doesn't exist
        let check_missing = check_session_integrity(user, pass);
        assert!(check_missing.is_err());
        assert!(check_missing.unwrap_err().to_string().contains("not found"));

        // 2. Encrypt and write session file
        let encrypted = encrypt_session_data(plaintext, pass).unwrap();
        std::fs::write(&session_file, &encrypted).unwrap();

        // 3. Check integrity with correct passphrase
        let check_ok = check_session_integrity(user, pass);
        assert!(check_ok.is_ok());

        // 4. Check integrity with incorrect passphrase
        let check_fail_pass = check_session_integrity(user, "wrong_session_pass");
        assert!(check_fail_pass.is_err());
        assert!(check_fail_pass.unwrap_err().to_string().contains("Failed to decrypt session file"));

        // 5. Corrupt file content and check integrity
        let mut corrupted = encrypted.clone();
        if corrupted.len() > 30 {
            corrupted[30] ^= 0xFF; // Flip bits in ciphertext
        }
        std::fs::write(&session_file, &corrupted).unwrap();
        let check_fail_corrupt = check_session_integrity(user, pass);
        assert!(check_fail_corrupt.is_err());

        // Clean up
        let _ = std::fs::remove_file(&session_file);
    }
}
