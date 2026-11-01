# Frontend Architecture

## Ownership and data flow

```text
Next.js client UI
  ├─ authentication and dashboard routes
  ├─ ChatWindow and shared UI components
  └─ matrixService.ts ── MatrixBridge 0.1.4 ── Matrix homeserver
                         └─ direct HTTP directory/presence exceptions

matrixStore.ts (Zustand) holds the current tab's UI view of the session,
rooms, users, messages, pagination, and connection/error status.
```

`matrixService.ts` is the only frontend Matrix integration boundary. Components do not call Matrix endpoints directly. The installed bridge package remains the runtime dependency; its generated TypeScript declarations define the allowed method names. Directory search and presence bypass the bridge only because those methods are absent in 0.1.4.

## Session lifecycle

- `NEXT_PUBLIC_HOMESERVER_URL` is mandatory and validated as HTTP or HTTPS; there is no fallback homeserver.
- The frontend imports and initializes the ESM/WASM package only in the browser.
- Login accepts a homeserver-local Matrix username, full MXID, or email-style username. For an MXID it uses the local part because the installed bridge method accepts `username`, not a full MXID. Registration does not set an email address or display name.
- Only the opaque bridge-exported session is saved in tab-scoped `sessionStorage`. Passwords are not saved. No account is created locally.
- Reload restoration first asks the bridge to restore the session. Failure remains visible and retryable; the session is retained so transient network failures do not destroy it.
- Logout requests sync stop and remote Matrix logout, then clears local session and Zustand state even if remote logout fails. The caller receives the failure.
- Service auth generations prevent late initialization/login results from repopulating state after logout.

## Zustand state

The store owns the visible current user, server-backed room list, room-keyed messages/pagination, directory results, loading state and sync/auth error state. It does not persist fake Matrix state. A successfully requested sync start maps to `syncStatus: "unknown"`, because the bridge exposes no sync event. Authentication and synchronization are intentionally separate indicators.

Messages are room-keyed and sorted chronologically. Bridge 0.1.4 omits Matrix event IDs, so the service uses a stable payload fingerprint to align sync events with history results. This reduces duplicate insertion but cannot distinguish two otherwise identical events in the same timestamp; a real event ID is required for a complete fix. Pagination merges by that stable ID and does not collapse messages solely because text/timestamp match.

## Message lifecycle

1. Composer text and attachments stay in component state, keyed by room ID.
2. The component prevents simultaneous submits and asks `matrixService` to validate room, content, MIME, size and file signature.
3. The service calls the installed bridge's actual send method.
4. The composer is cleared only after the bridge promise resolves. Rejection preserves text/file and is shown as an error.
5. A resolved send is labeled “Matrix accepted the send request.” It is not shown as delivered; delivery/read receipts are unavailable.
6. No optimistic message is inserted. Incoming events and history come from the bridge.

Manual retry remains an explicit user action. The UI warns that a lost response can make the outcome uncertain, so a retry could produce a duplicate.

## Media lifecycle

- The composer accepts supported raster image MIME types and PDF. Upload size is capped at 25 MiB; PDFs require a `.pdf` name and `%PDF-` signature. Declared MIME must match the content signature.
- The service calls only `send_image`, `send_file` and `get_media` from the installed bridge. There is no invented progress display because 0.1.4 has no progress callback.
- Downloaded data is size-limited to 25 MiB and checked against supported image/PDF signatures before rendering. Local object URLs are revoked on cleanup.
- Matrix avatar `mxc://` conversion is unavailable in the bridge; unsafe and unsupported image sources fall back to initials.

## Presence and directory

Directory search and presence GET/PUT use authenticated direct Matrix HTTP requests because 0.1.4 has no bridge equivalents. Responses are validated. Presence keeps `online`, `unavailable`, `offline` and `unknown` distinct; `busy`/`away` are display labels based on `unavailable` and its exact status message. A profile lookup shows the returned snapshot, while the app does not claim it is a live presence stream.

## Error behavior and unsupported features

Errors from bridge calls, HTTP requests, payload parsing, session persistence, history, sends and media are propagated to the relevant UI. No local account, room, message, membership or presence fallback exists. The bridge lacks room-member enumeration, profile lookup, typing, receipts, sync lifecycle/error events and listener cleanup. UI states explain those gaps instead of supplying invented values.

## Browser persistence boundary

Permitted browser state is limited to the genuine Matrix session in `sessionStorage`, component-level unsent drafts/files while the component is alive, and ordinary UI state. Passwords, room/message caches and fabricated users are not written to browser storage.
