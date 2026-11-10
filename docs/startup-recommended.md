# Recommended local startup

This is the supported development sequence for the current checkout.

## 1. Prepare Synapse configuration

From the repository root:

```powershell
Copy-Item homeserver.yaml.example synapse/homeserver.yaml
```

Use a private local copy only. The generated `synapse/homeserver.yaml`, signing key, logs and
media data are ignored by Git.

## 2. Start the verified homeserver services

```powershell
docker compose up -d postgres synapse
Invoke-WebRequest http://localhost:8008/_matrix/client/versions
```

The MinIO service is present in `docker-compose.yml` for the intended media architecture, but is
not included in the verified command because the floating `minio/minio:latest` image is not
currently pullable in the recorded environment.

## 3. Configure and run the frontend

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_HOMESERVER_URL=http://localhost:8008
```

Then:

```powershell
Set-Location frontend
npm ci --ignore-scripts
npm run dev
```

Open the URL printed by Next.js, normally `http://localhost:3000`.

## 4. Frontend lifecycle

```text
load WASM → initialize MatrixBridge → login or restore_session
→ register callbacks → start_sync → load rooms/history → render timeline
```

`start_sync()` only requests synchronization. Bridge version 0.1.5 does not expose a lifecycle
callback, so the UI correctly reports sync status as `unknown`.
