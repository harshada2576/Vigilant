# CipherLink Threat Model & Security Posture

This document details the threat model for the CipherLink messaging client. It outlines the targeted adversaries, design assumptions, security guarantees, and mitigation mechanisms implemented to protect communication integrity and user privacy. 

> [!NOTE]
> The serverless peer-to-peer (libp2p) networking stack has been deprecated and removed. CipherLink focuses exclusively on a hardened, federated Matrix client model, ensuring mature identity verification, cross-signing capabilities, and robust offline message delivery.

---

## 1. Threat Actors & Attack Vectors

| Adversary Profile | Capabilities | CipherLink Security Objective |
| :--- | :--- | :--- |
| **Local Physical Attacker** | Physical access to a powered-off machine or read access to the local storage files (disk theft / forensic dump). | Prevent reading of historical chat databases and active auth session tokens. |
| **Network Eavesdropper** | Intercepts Wi-Fi packets, controls intermediate network routers (MitM), or conducts active ARP spoofing. | Prevent reading plaintext messages in transit or capturing session authentication tokens. |
| **Compromised Server Administrator** | Full root control over the central Matrix Synapse Homeserver or access to the PostgreSQL datastore. | Prevent reading chat history, room memberships, and eavesdropping on E2EE room messages. |
| **Local Multi-User Adversary** | Another user on the same shared host computer trying to connect to the daemon's Unix Domain Socket (UDS). | Prevent session hijacking and local command injection. |

---

## 2. Implemented Security Controls

### A. Data at Rest (Local Host Hardening)
- **SQLite State & Crypto Store Encryption**: The `matrix-sdk` Sqlite store is encrypted at rest using an AES-256 key derived from a user-supplied database passphrase (entered securely via `rpassword` on startup).
- **Encrypted Matrix Session Store**: The `session_<username>.json.enc` file containing the homeserver authentication access tokens is encrypted using ChaCha20-Poly1305. The symmetric key is derived from a separate session passphrase (entered securely or falling back to the database passphrase) using PBKDF2 with a SHA-256 HMAC (600,000 iterations) and a random per-file 16-byte salt.

### B. Data in Transit (Network Security)
- **Matrix Transport Security (TLS)**: All communication with the Synapse homeserver routes over HTTPS (port 8443) terminated by a Caddy reverse proxy on localhost. Plain HTTP traffic is rejected.
- **Zero-Knowledge E2EE**: Message payloads are encrypted client-side using the Megolm/Olm double-ratchet implementation before transit, ensuring that intermediate servers cannot read message contents.

### C. Trust & Identity Verification
- **Out-of-Band Verification (SAS)**: Interactive Short Authentication String (SAS) emoji comparison establishes cryptographic trust directly between client devices, bypassing homeserver dependency.
- **Strict E2EE Send Policy**: When strict mode is enabled (`/strict`), the client scans all room participant devices. If any device is unverified, message transmission is blocked, preventing session key leakage to rogue/injected devices.

### D. IPC & Socket Security
- **UDS Hardening**: The Unix Domain Socket file `/tmp/cipherlink.sock` is locked down immediately after binding. Its file permissions are restricted to `0600` (`srw-------`), allowing only the owner of the daemon process to read or write to the socket. Local multi-user access attempts are blocked by the OS kernel.

---

## 3. Residual Risks & Out-of-Scope Threats
- **Active Memory Dump**: If an attacker gains root privileges on the active host system while the client is running, they could dump the daemon process memory to extract decrypted database keys or session keys. Securing runtime process memory is out of scope.
- **Metadata Leakage**: While Matrix message bodies are fully encrypted, the homeserver administrator can still see metadata (e.g., when messages are sent, room IDs, and participant profiles). Mitigating metadata leaks is out of scope for the current design.
