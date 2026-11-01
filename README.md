# Vigilant 🛡️
> Sovereign End-to-End Encrypted Messaging Platform for Enterprise Security.

Vigilant is a high-performance, private corporate messaging application built on top of the **Matrix Open Standard Protocol**, featuring local **Megolm End-to-End Encryption (E2EE)**, Rust WebAssembly client bindings (`@seucra/matrix-sdk-bridge`), and dedicated PostgreSQL and MinIO homeserver infrastructure.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, TailwindCSS v4, Lucide React, Zustand State Management
- **Matrix Client Binding**: Published Rust WebAssembly Bridge (`@seucra/matrix-sdk-bridge@0.1.4`)
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
- **User Registration & Login**: Credentials are submitted to the configured Matrix homeserver; registration does not set an email address or display name.
- **Session Export & Restore**: The bridge exports and restores a genuine Matrix session from tab-scoped sessionStorage.
- **Backend Failure Handling**: Homeserver failures are shown to the user; Vigilant does not create local accounts, rooms, or messages as substitutes.

### 💬 Messaging & Timeline Sync
- **Matrix Rooms & Direct Messages**: Lists rooms and direct conversations returned by the homeserver; encryption state is not exposed by the installed bridge.
- **Dynamic 20-Message Initial Loading**: Optimized memory footprint by loading the most recent 20 messages on room mount.
- **Scroll-Up Infinite History Pagination**: Smoothly fetches earlier messages in 20-event batches when scrolling to top, maintaining exact scroll position without layout shifts or jumping.
- **Matrix Synchronization**: The frontend requests sync startup and receives bridge message callbacks; bridge 0.1.4 does not report sync connection or completion state.
- **Date Dividers & Visual Empty States**: Smart timeline date dividers (`Today`, `Yesterday`, formatted calendar dates) and rich onboarding cards for empty rooms.

### 👥 User Directory & Live Presence
- **Matrix Homeserver Directory Search**: Debounced search uses an authenticated direct Matrix request because bridge 0.1.4 has no directory method.
- **Presence Lookup and Update**: Authenticated direct Matrix presence requests remain temporary bridge exceptions; status is not a live stream and unknown is distinct from offline.

### 📄 File Sharing & Downloads
- **Image & PDF Attachments**: Composer previews and sends supported raster images and PDF files through the bridge; upload progress is not exposed.
- **On-Demand Matrix Media Retrieval**: Retrieves bytes through bridge `get_media()` using the opaque source returned with a Matrix message.
- **Session Isolation**: Authentication state is kept in sessionStorage and cleared when signing out.

### 🛡️ Connection Architecture Transparency
- **Connection Status**: The UI distinguishes authenticated session from sync status; sync remains unknown because the installed bridge exposes no lifecycle callback.
- **Safety Safeguards**: Confirmation modals for sign-out and password visibility toggles on login/registration forms.

---

Frontend setup, supported bridge APIs, known limitations, and verification are documented in [docs/README_FRONTEND.md](docs/README_FRONTEND.md), [docs/integration/FRONTEND_INTEGRATION_STATUS.md](docs/integration/FRONTEND_INTEGRATION_STATUS.md), and [docs/testing/FRONTEND_VERIFICATION_REPORT.md](docs/testing/FRONTEND_VERIFICATION_REPORT.md).


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
│   └── package.json           # Uses the published @seucra/matrix-sdk-bridge package
├── synapse/                   # Synapse homeserver configuration
├── matrix-sdk-bridge/         # Modular Rust WASM SDK source code & pkg output
├── docker-compose.yml         # Container orchestrator
└── README.md
```

