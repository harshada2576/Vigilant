# CipherLink Future Project Roadmap

This document outlines the roadmap for the CipherLink system, detailing how it can serve as a comprehensive final year engineering or research project. It extends the decentralized client-daemon architecture to include full contact book lookup, room-specific message filtering, serverless cryptographic key exchange over libp2p, and automated vulnerability auditing.

---

## Phase 1: Local Contact Book & User Alias Cache
### Objective
Improve user interaction by mapping complex Matrix User IDs (e.g. `@alice:matrix.org`) and libp2p Peer IDs to clean, human-readable aliases.
- **Data Model**: SQLite table mapping `user_id/peer_id` to `display_name` (e.g., `Alice`, `Bob`).
- **CLI/TUI Commands**:
  - `/alias add <id> <name>` - registers a new contact.
  - `/alias list` - prints all stored aliases.
- **Resolution**:
  - Automatically parse slash commands so users can type `/devices Alice` or `/send Alice hello`.
  - Replace raw IDs with alias names inside the message log feed.

---

## Phase 2: Room Message Filtering & Independent Chat Feeds
### Objective
Isolate chats by room so that the TUI behaves like a modern messaging app rather than a unified logs dashboard.
- **Client-Side Storage**: In the `AppState`, transition `messages` from a single flat vector to a map of `room_id -> Vec<String>`.
- **Filtering Logic**:
  - When a room is set as the active room in the sidebar, the TUI dynamically clears and redraws only the messages belonging to that specific room ID.
  - Background/non-selected rooms display unread badge counters next to their names in the sidebar (e.g., `• room_name [E2EE] (3)`).

---

## Phase 3: Serverless Megolm Cryptographic Key Exchange over libp2p
### Objective
Establish secure end-to-end encryption directly between peer-to-peer nodes without using a centralized Matrix Homeserver.
- **How it works**:
  - Adapt the Olm/Megolm double-ratchet implementation to operate over libp2p.
  - Upon discovering a local peer via mDNS, negotiate a secure Noise channel to authenticate identities.
  - Share Megolm room session keys directly using a Peer-to-Peer gossip protocol.
- **Key Verification**: Complete SAS (Short Authentication String) emoji matching between local devices over the LAN without server involvement.
- **Impact**: Provides fully autonomous, server-free, metadata-private communications for tactical deployments or offline disaster scenarios.

---

## Phase 4: CipherShield Security compliance Suite
### Objective
Build the offensive vulnerability auditing engine (Pathway C) directly into the daemon to profile the safety of decentralized communication networks.
- **Auditing Modules**:
  1. **UIAA Auditor**: Sends out-of-order and empty authentication payloads to user-interactive auth endpoints to check for state bypass vulnerabilities.
  2. **E2EE Leak Scanner**: Injects unverified devices into a room and validates if clients automatically stop message transmission or raise warnings.
  3. **Federation Boundary Scanner**: Spoofs external homeserver queries to target Synapse and audits if private rooms, profiles, or media caches leak.
- **Report Generator**: Generates compliance and vulnerability score reports matching security frameworks like OWASP and NIST.
