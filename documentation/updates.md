# CipherLink Project Updates & Changelog

This document maintains a chronological record of all architecture and code updates made to the CipherLink secure client and server infrastructure.

---

## 1. Initial Infrastructure Setup (Synapse Homeserver)
*   **Action**: Created a `docker-compose.yml` file to spin up a local Synapse Homeserver backed by a PostgreSQL database container.
*   **Configuration**:
    *   Configured `homeserver.yaml` with federations disabled for strict local network isolation.
    *   Set up data persistence mappings for Postgres database storage and Synapse configuration.
*   **Result**: Synapse running and accessible at `http://localhost:8008`. Verified API connectivity via the `/_matrix/client/versions` endpoint.

---

## 2. Rust Matrix Client Genesis
*   **Action**: Initialized the `client` Cargo project and added dependencies: `matrix-sdk`, `tokio`, `serde`, and `serde_json`.
*   **Features**:
    *   Implemented basic CLI username/password login.
    *   Created local JSON session file persistence (`session_<username>.json`) to cache credentials.
    *   Implemented background room message sync using Tokio tasks.

---

## 3. Cryptography & Direct Device Verification Flow
*   **Action**: Enabled E2EE Megolm/Olm storage persistence and set up device-to-device verification tools.
*   **Features**:
    *   Overcame the absence of cross-signing configuration on the isolated server by targeting devices directly (`get_user_devices`).
    *   Implemented background emoji (SAS) polling loops.
    *   Added `/devices` CLI command to inspect active device keys.
    *   Added `/accept`, `/confirm`, and `/cancel` commands to complete the interactive emoji matching workflow.

---

## 4. HTTPS Integration & Reverse Proxy (Caddy)
*   **Action**: Upgraded the connection channel from plain HTTP to TLS-secured HTTPS.
*   **Features**:
    *   Added a reverse-proxy service `proxy` using Caddy in `docker-compose.yml` binding host port `8443` to Synapse.
    *   Created `Caddyfile` for internal self-signed TLS routing.
    *   Configured the client to query `https://localhost:8443` and called `ClientBuilder::disable_ssl_verification()` to trust the self-signed proxy for testing.

---

## 5. Cross-Signing Bootstrapping & UIAA Fallback
*   **Action**: Implemented identity and signature key bootstrapping.
*   **Features**:
    *   Added `/bootstrap` command to initialize client cross-signing keypairs.
    *   Configured User-Interactive Authentication (UIAA) fallback. If Synapse responds with a challenge, the client prompts for the user's password, constructs `AuthData::Password`, and re-submits the request to complete bootstrapping.

---

## 6. Strict E2EE Policies
*   **Action**: Implemented prevention policies for unverified communication leakage.
*   **Features**:
    *   Added `/strict` command to toggle security checks.
    *   Enhanced `/send`: if strict mode is active, the client queries all joined room participants, scans their devices, and blocks message transmission if any unverified device keys are found.
    *   Prints a warning table detailing target unverified device IDs.

---

## 7. Ratatui Terminal User Interface (TUI) Upgrade
*   **Action**: Upgraded the simple CLI to a full-screen interactive Terminal User Interface.
*   **Features**:
    *   Added dependencies `ratatui` and `crossterm` to `Cargo.toml`.
    *   Configured alternate-screen TUI layout:
        *   **Status Bar**: Top bar showing connection, authenticated user ID, and strict E2EE state.
        *   **Messages Panel**: Scrollable log panel displaying decrypted room messages, syncing logs, and verification SAS flows. Up/Down keyboard keys scroll the log history.
        *   **Input Box**: Bottom area capturing user commands interactively.

---

## 8. Local Database & Key Store Encryption
*   **Action**: Secured the client-side state cache database file at rest on the local filesystem.
*   **Features**:
    *   Added `rpassword` dependency.
    *   Added database passphrase input on client startup if `CIPHERLINK_DB_PASS` is empty.
    *   Configured `ClientBuilder::sqlite_store` to use the passphrase.
    *   Verified database values in `kv_blob` (keys, cache) are fully encrypted (stored as MessagePack ciphertext maps).

---

## 9. Refactoring & Event-Driven Redraw
*   **Action**: Modularized client code and switched TUI redraws to an event-driven pattern.
*   **Features**:
    *   Extracted client operations into `app`, `commands`, `matrix`, and `ui` modules.
    *   Replaced the 50ms polling loop with a Tokio channel receiver (`tokio::sync::mpsc::channel`), reducing idle CPU usage to ~0%.
    *   Transitioned the Ratatui layout to a dual-pane layout: a left sidebar displaying joined rooms, encryption statuses, and device profiles; and a right pane displaying chats and logs.

---

## 10. Daemon/Frontend Split (IPC)
*   **Action**: Split the system architecture into a backend daemon (`cipherlinkd`) and a stateless frontend client (`cipherlink`).
*   **Features**:
    *   Created `daemon` and `tui` sub-packages under a parent Cargo workspace.
    *   Implemented communication over a local Unix Domain Socket (IPC) at `/tmp/cipherlink.sock`.
    *   The backend daemon manages the encrypted database, Matrix connection, and sync. The stateless TUI forwards commands and renders states received over IPC.

---

## 11. Serverless P2P Integration (libp2p)
*   **Action**: Integrated libp2p to enable direct serverless communication between local nodes.
*   **Features**:
    *   Configured a libp2p Swarm behavior with Noise security, Yamux multiplexing, and TCP transports.
    *   Implemented local discovery using multicast DNS (mDNS).
    *   Implemented gossip broadcasting using Gossipsub over the `"cipherlink-p2p"` topic.
    *   Added `/p2p <message>` to publish serverless messages directly to discovered peers.

