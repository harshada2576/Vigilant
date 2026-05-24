# CipherLink Future Suggestions & Architectural Options

This document captures prospective feature enhancements, structural shifts, and architectural options deferred during the initial development cycles.

---

## 1. P2P Sync: Embedded Homeserver vs. Lightweight Protocol

When designing a serverless peer-to-peer (P2P) Matrix client, we analyzed two primary methodologies:

### Option A: Embedded Dendrite / Conduit Homeserver
*   **Concept**: Statically compile or dynamically embed a lightweight Matrix homeserver (such as Dendrite or Conduit) inside the client binary.
*   **Pros**:
    *   Full compatibility with the standard Matrix client-server and server-server APIs.
    *   No custom sync code required; standard Matrix syncing works out of the box.
*   **Cons**:
    *   **Extremely heavy footprint**: Compiling and running an entire Go or Rust homeserver within the client binary significantly increases memory, binary size, and startup times.
    *   Requires embedding an database engine (e.g. SQLite/RocksDB) for server-side state.
    *   Difficult to configure and manage dynamically in low-resource environments.

### Option B: Lightweight Custom P2P Protocol (Chosen)
*   **Concept**: Implement a lightweight P2P transport layer directly over libp2p. When the central homeserver is unavailable, clients use libp2p's Gossipsub/Kademlia DHT to discover nearby instances and exchange Megolm/Olm encrypted payloads directly.
*   **Pros**:
    *   **Extremely lightweight**: Minimizes binary size, memory usage, and initialization latency.
    *   No server configuration needed; peers find each other seamlessly via multicast DNS (mDNS) or local bootstrap routers.
    *   Decoupled from a heavy server engine.
*   **Cons**:
    *   Requires implementing a custom synchronizer to reconcile message state when reconnecting to a central homeserver.

---

## 2. Advanced Security Suggestions

### Hardware Security Module (HSM) / YubiKey Integration
*   Integrate PKCS#11 or WebAuthn interfaces to derive SQLite decryption passphrases or sign cross-signing bootstraps directly from hardware keys (e.g., YubiKeys).
*   Ensures that database files cannot be decrypted even if the host machine's memory is fully compromised at startup.

### Zero-Knowledge Key Backups
*   Store room keys securely on the homeserver using key backups encrypted with a key derived from a local recovery passphrase.
*   Enforce a zero-knowledge architecture where the server cannot read the backup payloads.
