# Vigilant 🛡️
> Sovereign End-to-End Encrypted Messaging Platform for Enterprise Security.

Vigilant is a high-performance, private corporate messaging application built on top of the **Matrix Open Standard Protocol**, featuring local **Megolm End-to-End Encryption (E2EE)**, Rust WebAssembly client bindings, and dedicated PostgreSQL and MinIO homeserver infrastructure.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, TailwindCSS v4, Lucide React, Zustand State Management
- **Matrix Client Binding**: Rust WebAssembly Bridge (`@seucra/matrix-sdk-bridge`)
- **Backend Homeserver**: Matrix Synapse (`matrixdotorg/synapse:latest`)
- **Database**: PostgreSQL 16
- **Media Object Store**: MinIO S3 Compatible Storage

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ and `npm`
- Docker & Docker Compose

### 1. Launch Backend Infrastructure (Synapse, Postgres, MinIO)

```bash
# 1. Create Synapse homeserver configuration
cp homeserver.yaml.example synapse/homeserver.yaml

# 2. Start PostgreSQL, MinIO, and Synapse containers
docker compose up -d

# 3. Verify Synapse health
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

## ✨ Features Included

### 🔐 Authentication & Session Lifecycle
- **User Registration & Login**: Validated corporate sign-up with unique email constraints.
- **Session Export & Restore**: Automatic Matrix token & key state export/restore across browser reloads.
- **Automatic Fallback Mode**: Seamless local interactive fallback mode when offline for uninterrupted developer testing.

### 💬 Messaging & Channels
- **Encrypted Channels**: Public and Megolm E2E Encrypted channel creation (`#general`, `#announcements`, `#security-compliance`).
- **Direct Messages**: Bi-directional DM conversations with user directory lookup and Title Case formatting.
- **Cross-Session Real-Time Sync**: Synchronized messaging across browser tabs and sessions via Matrix event stream & storage channels.

### 📄 File Sharing & Downloads
- **Image & PDF Attachments**: Composer preview bar with confirmation before sending.
- **Cross-Session Downlinks**: Base64 payload serialization for reliable PDF and image downloading on any receiving browser.

---

## 📂 Project Structure

```
Vigilant/
├── frontend/                  # Next.js 16 Application
│   ├── src/
│   │   ├── app/               # Next.js App Router (login, register, dashboard)
│   │   ├── components/        # Reusable UI components & ChatWindow
│   │   ├── services/          # matrixService.ts WASM bridge layer
│   │   └── store/             # Zustand state management
│   └── public/                # Static assets & matrix_sdk_bridge_bg.wasm
├── synapse/                   # Synapse homeserver configs & keys
├── matrix-sdk-bridge/         # Modular Rust WASM SDK source code
├── docker-compose.yml         # Container orchestrator
└── README.md
```

---

