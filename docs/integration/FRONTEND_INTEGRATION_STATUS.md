# Frontend Matrix Integration Status

**Verified on:** 2026-11-09  
**Documentation review:** 2026-11-10
**Frontend package:** `frontend` (`frontend@0.1.0`)  
**Bridge dependency:** `@seucra/matrix-sdk-bridge@0.1.5`

## Architecture

The frontend keeps one Matrix boundary in `frontend/src/services/matrixService.ts`. Client components call that service; the service adapts verified exports from the installed bridge package and writes UI state to the existing Zustand store in `frontend/src/store/matrixStore.ts`.

```text
Next.js client components
  → matrixService.ts
  → matrixStore.ts (UI state)
  → @seucra/matrix-sdk-bridge 0.1.5
  → Rust/WASM Matrix SDK client
  → configured Matrix homeserver
```

`NEXT_PUBLIC_HOMESERVER_URL` is required. There is no localhost default. Matrix is the source of truth for authentication, rooms, messages, invitations, presence and media. The browser stores only the bridge-exported session in tab-scoped `sessionStorage`; passwords are not persisted.

## Verified package boundary

The installed package is version `0.1.5` and TypeScript resolves its declaration file at `matrix_sdk_bridge.d.ts`. Its complete exported method list and exact signatures are recorded in [MATRIX_BRIDGE_API_CONTRACT.md](MATRIX_BRIDGE_API_CONTRACT.md). The checked-in `frontend/public/matrix_sdk_bridge_bg.wasm` and the installed package WASM have the same SHA-256:

`18A23C3F80004DAAE5FA9EEB8C353A651ED1D4AC0B39F70B74DD539B3B58FF15`

The separate `matrix-sdk-bridge/pkg` WASM file hashes to `74EC6FF9DE0C00508D9FDDF1B2D48D14E14C962C779DAA18BCFF510D2D86BA44`; it is not the frontend runtime artifact and was not installed as the dependency.

The local Rust `Cargo.toml` declares Matrix SDK and UI 0.18.0. The installed npm package does not identify its source revision or SDK version, so 0.18.0 is a source declaration, not independently verified npm build metadata.

## Implemented with bridge 0.1.5

The service calls only methods present in the installed declaration:

- Login, registration, session export/restoration and logout.
- Joined-room and direct-message listing.
- Channel creation/joining, direct-message lookup/creation, leave and invitations.
- Text, image and file sending; room history and pagination; media retrieval.
- Sync start/stop, message/notification/typing callback registration, typing notices and read receipts.

UI state represents authentication after the bridge confirms a session. Calling `start_sync()` only requests sync startup: the installed bridge exposes no sync lifecycle or error callback, so the UI reports sync as unknown. Message send success is described as “Matrix accepted the send request”; typing and read-receipt calls are available but need multi-user verification.

## Temporary direct Matrix HTTP exceptions

These requests remain isolated in `matrixService.ts` because the installed bridge has no equivalent:

| Operation | Current request | Replacement requirement |
|---|---|---|
| Directory search | `POST /_matrix/client/v3/user_directory/search` | Verified bridge method returning real Matrix user IDs and optional display/avatar data. |
| Presence read | `GET /_matrix/client/v3/presence/{userId}/status` | Verified bridge method returning online, unavailable, offline or unknown, plus optional status message. |
| Current user's presence update | `PUT /_matrix/client/v3/presence/{userId}/status` | Verified bridge method with server-confirmed result and documented errors. |

The requests use the token from the actual bridge session, validate responses, report HTTP/network/rate-limit errors and do not supply fake users or default presence. A directory avatar with an `mxc://` URI is not rendered: the bridge does not expose profile-avatar media resolution. Only safe HTTP(S) avatar URLs are passed to an image element.

## Missing bridge functionality

- Room member enumeration and membership state.
- Sync state/error events and callback removal.
- User profile lookup and room member enumeration.
- Upload progress.
- Stable Matrix event IDs in message history/callback payloads.
- Profile-avatar MXC media resolution.

The current UI does not invent these results. Room member count is unavailable; invitations use the real `invite_user` bridge method. Search and profile UI only display data returned by the directory/presence requests.

## Known limitations

- Local Synapse sign-in was verified in the browser; multi-user sync, room, message and media workflows remain to be verified.
- Message identifiers are stable fingerprints of room, sender, timestamp, type, content and media source because no event ID is exported. Identical payloads at the same timestamp cannot be distinguished perfectly; Developer A should add the Matrix event ID to callback and history models.
- `on_message`/`on_notification`/`on_typing` are declared as untyped `Function` callbacks. Payloads are validated defensively at the service boundary.
- The bridge does not expose a separate authenticated homeserver connectivity state. The UI distinguishes signed-in from sync unknown.

## Next steps

1. Add a verified profile/member API or keep those capabilities explicitly unavailable.
2. Add sync lifecycle/error callbacks and stable Matrix event IDs to the bridge.
3. Add multi-user browser coverage for typing, receipts, rooms and media.
