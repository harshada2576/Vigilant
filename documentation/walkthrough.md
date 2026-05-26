# CipherLink Security, TUI Enhancements, and P2P Swarm Walkthrough

We have successfully implemented, verified, and integrated all security, architectural, and peer-to-peer (P2P) features in the CipherLink workspace.

---

## 1. TLS/HTTPS Proxy (Phase 1)
*   **Infrastructure**: Added a reverse-proxy service `proxy` using Caddy running in the Docker container cluster. It binds to port `8443` on the host system.
*   **Proxy Configuration**: Created a [Caddyfile](file:///home/seucra/Runes/projects/CipherLink/Caddyfile) that forwards TLS encrypted requests to Synapse (`http://synapse:8008`) and employs local self-signed certificates.
*   **Client Connection**: Configured `client/src/main.rs` to route traffic over `https://localhost:8443` and bypassed SSL verification checks for local development using `ClientBuilder::disable_ssl_verification()`.

---

## 2. Cross-Signing Bootstrap (Phase 2)
*   **Command**: Implemented the `/bootstrap` command to initialize identity and signature keys.
*   **UIAA Flow**: Supported User-Interactive Authentication. If Synapse returns a challenge, the client extracts the user's password (from the local `CIPHERLINK_PASS` environment variable) and builds a `Password` login request payload wrapped in `AuthData::Password` to complete authentication and cross-signing registration.

---

## 3. Strict E2EE Send Policies (Phase 3)
*   **Command**: Implemented the `/strict` command to toggle E2EE protection settings.
*   **Protection logic**: When strict mode is enabled, issuing a `/send <room_id> <message>` command queries joined room members, retrieves all their active devices via `get_user_devices`, and verifies their trust status.
*   **Blocking Action**: If any device is unverified, message transmission is blocked, and the client displays a warning list detailing the unverified device IDs.

---

## 4. Terminal User Interface (TUI) Upgrade (Phase 4)
*   **Dependencies**: Added `ratatui` and `crossterm` to the client crate.
*   **Split Layout**: Configured a full screen alternate-screen layout:
    *   **Status Bar**: Top header showing connection endpoint, current authenticated user, and strict-mode toggle state.
    *   **Messages Feed**: Middle scrollable panel containing all room events, status logs, and E2EE verification notifications.
    *   **Input Box**: Bottom area capturing user commands interactively.
*   **Scrolling**: Enabled message log scrolling using the Up/Down keys.

---

## 5. Local Database & Key Store Encryption (Phase 5)
*   **Passphrase Prompt**: Integrated `rpassword` for secure console input. On client startup, if `CIPHERLINK_DB_PASS` is not set in the environment, the client asks the user for a database passphrase before initializing terminal rendering.
*   **State Encryption**: Configured `ClientBuilder::sqlite_store` to use the passphrase.
*   **Verification**: Inspected SQLite database tables after execution. Values stored in the keys table (`kv_blob`) are fully encrypted in the database file:
    ```sql
    sqlite3 matrix_store_testuser/matrix-sdk-state.sqlite3 "SELECT * FROM kv_blob LIMIT 1;"
    -- Returns encrypted ciphertext MessagePack:
    -- key: x'463038...'
    -- value: x'83a776657273696f6e01aa63697068657274657874...' ("version": 1, "ciphertext": ...)
    ```

---

## 6. Code Refactoring & Event-Driven Redraw
*   **Decoupled Modules**: Modularized the original single-file client codebase into structured modules under `app`, `commands`, `matrix`, and `ui` within the background service and frontend.
*   **Tokio Channel Event Loop**: Replaced the 50ms polling loop with a `tokio::sync::mpsc::channel` driven redraw pipeline, dropping idle CPU usage from ~10% to ~0%.
*   **Dual-Pane Navigation Layout**: Redesigned the TUI into a premium split-pane design: a left sidebar listing joined rooms, encryption statuses, and device profiles; and a right pane displaying chats and logs.

---

## 7. Daemon/Frontend Separation (IPC Sockets)
*   **Background Daemon (`cipherlinkd`)**: Runs matrix syncing, E2EE key databases, and libp2p P2P swarming.
*   **Stateless Frontend (`cipherlink`)**: Focuses entirely on drawing the Ratatui layout, capturing keystrokes, and transmitting commands to the daemon.
*   **Communication Channel**: Uses a secure local Unix Domain Socket (UDS) located at `/tmp/cipherlink.sock` to exchange structured IPC requests and responses. Can be configured to a custom path using the `CIPHERLINK_SOCK` environment variable.

---

## 8. Serverless Peer-to-Peer Integration (libp2p Swarm)
*   **Local Discovery**: Integrates libp2p's multicast DNS (mDNS) behavior to automatically discover and connect to other local CipherLink instances.
*   **Gossip Broadcasting**: Integrates Gossipsub behavior. Upon discovery, peers subscribe to the `"cipherlink-p2p"` topic and broadcast encrypted/unencrypted local communication messages.
*   **Command**: Implemented the `/p2p <message>` command to allow users to broadcast serverless sync logs and chat messages to all discovered peers instantly.

---

## 9. Interactive Room Selection & Active Chat Focus
*   **Focus Panes**: Pressing `Tab` dynamically shifts key input and visual focus between the **Command Input** box and the **Navigation Sidebar**.
*   **Visual Highlights**: Border styling lights up in `Cyan` to indicate the focused panel, while the unfocused panel fades to `DarkGray`.
*   **Sidebar Selection**: Focus the sidebar and navigate through the room list using `Up` and `Down`. The hovered room is marked with `*` in cyan. Pressing `Enter` activates the highlighted room (`►` indicator in yellow), and automatically redirects keyboard focus back to the input box.
*   **Context-Aware Chatting**: Once a room is active, typing standard messages without a leading slash automatically translates client-side into `/send <room_id> <message>` requests and sends them to the daemon.
*   **Project Roadmap**: Generated a detailed long-term final year research roadmap at [project_roadmap.md](file:///home/seucra/Runes/projects/CipherLink/documentation/possible_final_year_project/project_roadmap.md).

---

## 10. Local Contact Book & User Alias Cache
*   **Persistence**: Created a user-specific alias cache JSON file (`aliases_<username>.json`) stored locally in the daemon's working directory.
*   **Commands**:
    *   `/alias add <id> <name>`: Registers a friendly display name mapping for any Matrix User ID or libp2p Peer ID.
    *   `/alias list`: Displays all active contact alias mappings.
*   **Log Substitution**: The daemon intercepts all raw message event logs and replaces complex addresses (e.g. `@seucra:matrix.org`) with friendly names (e.g. `Seucra`) before broadcasting them over the IPC socket.
*   **Command Target Resolution**: Added alias-lookup pre-processing to `/send`, `/invite`, `/verify`, `/accept`, `/confirm`, `/cancel`, and `/devices`. Users can now execute commands targeting friendly contact names (e.g., `/devices Seucra`) instead of long raw IDs.

---

## 11. Serverless WAN P2P Integration
*   **Protocols**: Integrated libp2p's Kademlia Distributed Hash Table (`kad` v0.45) and Identity (`identify` v0.44) behaviors into the swarm handler.
*   **Bootstrap Integration**: Configured connections to three public DHT bootstrap peers (`/dnsaddr/bootstrap.libp2p.io`) on daemon initialization to join the global peer-to-peer network.
*   **Routing Feed**: Updates Kademlia routing tables dynamically when new peers are discovered locally or identified over the network.
*   **System Event Logging**: Emits status notifications regarding DHT routing updates, bootstrap status, and local listening multiaddresses to the UI logs feed.
*   **Manual Dialing**: Added `/p2p dial <multiaddr>` command support to allow manual peer-to-peer loopback connections, bypassing restricted local multicast rules.
