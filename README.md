# Vigilant 🛡️
> Sovereign End-to-End Encrypted Messaging Platform for Enterprise Security.

Vigilant is a high-performance, private corporate messaging application built on top of the **Matrix Open Standard Protocol**, featuring local **Megolm End-to-End Encryption (E2EE)**, Rust WebAssembly client bindings (`@seucra/matrix-sdk-bridge`), and dedicated PostgreSQL and MinIO homeserver infrastructure.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, TailwindCSS v4, Lucide React, Zustand State Management
- **Matrix Client Binding**: Rust WebAssembly Bridge (`@seucra/matrix-sdk-bridge` with direct bundler resolution)
- **Backend Homeserver**: Matrix Synapse (`matrixdotorg/synapse:latest`)
- **Database**: PostgreSQL 16
- **Media Object Store**: MinIO S3 Compatible Storage

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ and `npm`
- Docker & Docker Compose

### 1. Environment & Backend Infrastructure

Create a `.env` file from `.env.example` to define secure local credentials:

```bash
# Copy sample environment configuration
cp .env.example .env

# Generate Synapse homeserver configuration
cp homeserver.yaml.example synapse/homeserver.yaml

# Start PostgreSQL, MinIO, and Synapse containers
docker compose up -d

# Verify Synapse health endpoint
curl http://localhost:8008/_matrix/client/versions
```

### 2. Start Frontend Application

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ✨ Key Features

### 🔐 Authentication & Session Lifecycle
- **User Registration & Login**: Corporate sign-up with email uniqueness validation.
- **Session Export & Restore**: Matrix access token & Megolm key state stored securely in localStorage across browser reloads.
- **Automatic Fallback Mode**: Local interactive fallback mode when homeserver is offline for uninterrupted testing.

### 💬 Messaging & Timeline Sync
- **Encrypted Channels & DMs**: Public and Megolm E2E Encrypted channels (`#general`, `#announcements`, `#security-compliance`) and Direct Messages.
- **Dynamic 20-Message Initial Loading**: Optimized memory footprint by loading the most recent 20 messages on room mount.
- **Scroll-Up Infinite History Pagination**: Smoothly fetches earlier messages in 20-event batches when scrolling to top, maintaining exact scroll position without layout shifts or jumping.
- **Real-Time Cross-Tab Synchronization**: Instant cross-tab messaging updates via Matrix sync stream and storage events.
- **Date Dividers & Visual Empty States**: Smart timeline date dividers (`Today`, `Yesterday`, formatted calendar dates) and rich onboarding cards for empty rooms.

### 👥 User Directory & Live Presence
- **Matrix Homeserver Directory Search**: Debounced live search querying Synapse (`POST /_matrix/client/v3/user_directory/search`) allowing discovery of any registered teammate on the network.
- **Live Bidirectional Presence (`m.presence`)**: Synchronizes user status (`online`, `busy`/Do Not Disturb, `away`, `offline`) via Matrix presence endpoints (`PUT/GET /_matrix/client/v3/presence/{userId}/status`) and cross-tab broadcasts.
- **DM Header Status Badges**: Real-time status dot and label in direct conversation headers.

### 📄 File Sharing & Downloads
- **Image & PDF Attachments**: Composer attachment preview with instant file attachment and downloading.
- **On-Demand Remote Media Decryption**: Fetches encrypted MXC bytes via WASM bridge `get_media()`, creating local object URLs for secure inline viewing and saving.
- **Storage Quota Resilience**: Intelligent localStorage eviction and payload protection preventing browser quota crashes.

### 🛡️ Connection Architecture Transparency
- **Live Synapse Sync Indicator**: Real-time pulsing badge in the sidebar header reflecting true Matrix Rust WASM connection status.
- **Interactive Simulation Mode**: Explicit status pill and architecture modal when Synapse is offline, maintaining local testing capability without misleading connection claims.
- **Safety Safeguards**: Confirmation modals for sign-out and password visibility toggles on login/registration forms.

---

## 🔒 Security & Secret Management

Internal secrets, private keys, database passwords, and environment credentials must **never** be committed to source control:

- **Git Ignored Resources**: `synapse/*.signing.key`, `synapse/*.log`, `synapse/homeserver.yaml`, `.env*`, and `.wasm` build artifacts are strictly excluded via `.gitignore`.
- **Environment Variables**: Always store sensitive credentials (e.g., `POSTGRES_PASSWORD`, `SYNAPSE_MACAROON_SECRET_KEY`) in `.env` files or secure secret stores, referencing template variables in configuration files.

---

## 📂 Project Structure

```
Vigilant/
├── frontend/                  # Next.js 16 Application
│   ├── src/
│   │   ├── app/               # Next.js App Router (login, register, dashboard)
│   │   ├── components/        # UI components & ChatWindow timeline
│   │   ├── services/          # matrixService.ts WASM bridge & homeserver API layer
│   │   └── store/             # Zustand state management (presence, rooms, messages)
│   └── package.json           # Linked to local @seucra/matrix-sdk-bridge
├── synapse/                   # Synapse homeserver configuration
├── matrix-sdk-bridge/         # Modular Rust WASM SDK source code & pkg output
├── docker-compose.yml         # Container orchestrator
└── README.md
```

