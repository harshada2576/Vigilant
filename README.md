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
- **Real-Time Cross-Tab Synchronization**: Instant cross-tab messaging updates via Matrix sync stream and storage events.
- **Date Dividers & Timestamp Tooltips**: Smart timeline date dividers (`Today`, `Yesterday`, formatted calendar dates) and full timestamp hover tooltips.

### 📄 File Sharing & Downloads
- **Image & PDF Attachments**: Composer attachment preview with instant file attachment and downloading.
- **Cross-Session Downlinks**: Base64 payload serialization for reliable PDF and image downloading on any receiving browser.

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
│   │   ├── services/          # matrixService.ts WASM bridge layer
│   │   └── store/             # Zustand state management
│   └── package.json           # Linked to local @seucra/matrix-sdk-bridge
├── synapse/                   # Synapse homeserver configuration
├── matrix-sdk-bridge/         # Modular Rust WASM SDK source code & pkg output
├── docker-compose.yml         # Container orchestrator
└── README.md
```
