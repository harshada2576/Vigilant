# Matrix WASM Bridge API Contract

**Inspected package:** `@seucra/matrix-sdk-bridge@0.1.5`
**Documentation review:** 2026-11-10
**Declaration:** `frontend/node_modules/@seucra/matrix-sdk-bridge/matrix_sdk_bridge.d.ts`  
**Package format:** ESM (`type: module`), `main: matrix_sdk_bridge.js`, declarations: `matrix_sdk_bridge.d.ts`  
**License:** Apache-2.0

The installed declaration is authoritative for the JavaScript method names and signatures. JSON payloads passed as strings are not described in that declaration. Workspace Rust source under `matrix-sdk-bridge` is separately identified below and is not proof that the installed npm WASM was built from that exact source.

## Verified exports and signatures

```ts
class MatrixBridge {
  free(): void;
  [Symbol.dispose](): void;
  create_direct_message(user_id_str: string): Promise<string>;
  create_room(name: string): Promise<string>;
  export_session(): string | undefined;
  find_direct_message(user_id_str: string): Promise<string | undefined>;
  get_media(media_source_json: string): Promise<Uint8Array>;
  get_or_create_direct_message(user_id_str: string): Promise<string>;
  get_room_history(room_id_str: string, limit: number): Promise<string>;
  static init(homeserver_url: string): Promise<MatrixBridge>;
  invite_user(room_id_str: string, user_id_str: string): Promise<string>;
  join_room(room_id_or_alias: string): Promise<string>;
  leave_room(room_id_str: string): Promise<string>;
  list_direct_messages(): Promise<string>;
  list_joined_rooms(): Promise<string>;
  load_more_history(room_id_str: string, limit: number): Promise<string>;
  login(username: string, password: string): Promise<string>;
  logout(): Promise<string>;
  on_message(callback: Function): void;
  on_notification(callback: Function): void;
  on_typing(callback: Function): void;
  register(username: string, password: string): Promise<string>;
  restore_session(session_json: string): Promise<string>;
  send_file(room_id_str: string, data: Uint8Array, filename: string, mime_type: string): Promise<string>;
  send_image(room_id_str: string, data: Uint8Array, filename: string, mime_type: string): Promise<string>;
  send_message(room_id_str: string, message: string): Promise<string>;
  send_typing_notice(room_id_str: string, typing: boolean): Promise<void>;
  mark_as_read(room_id_str: string, event_id_str: string): Promise<void>;
  start_sync(): void;
  stop_sync(): void;
}
```

The package also exports `ShieldStateCode`, `initSync(...)`, a default asynchronous WASM initializer, and generated WASM runtime types. `ShieldStateCode` has no associated bridge method that returns a message's shield state.

## Inputs and return types

| API | Input | Declared output | Notes |
|---|---|---|---|
| `init` | Homeserver URL | `Promise<MatrixBridge>` | WASM initialization is a separate default export call first. |
| `login`, `register` | Local username and password | `Promise<string>` | Registration is not declared to authenticate. Frontend calls `login` only if registration produced no exported session. |
| `export_session` | None | `string \| undefined` | Opaque serialized session. Its JSON schema is not in the declarations. |
| `restore_session` | Session JSON string | `Promise<string>` | Resolves on successful restore; rejection is surfaced. |
| `logout` | None | `Promise<string>` | Frontend stops sync, awaits logout, clears tab session even when logout rejects, then surfaces failure. |
| Room and DM methods | Room ID/name or user ID | `Promise<string>` or `Promise<string \| undefined>` | Exact signatures shown above. JSON structures returned by listing/history methods are not typed in `.d.ts`. |
| `send_message`, `send_image`, `send_file` | Room ID and message or bytes/name/MIME | `Promise<string>` | UI clears composer only after the promise resolves. It does not call this delivery confirmation. |
| `get_media` | Opaque bridge media-source JSON | `Promise<Uint8Array>` | Source must be taken from an actual message event/history item. |
| `on_message`, `on_notification`, `on_typing` | `Function` | `void` | Callback parameter/payload type is absent from declarations; no unregister method exists. |
| `send_typing_notice` | Room ID and boolean | `Promise<void>` | Sends a typing state. |
| `mark_as_read` | Room ID and event ID | `Promise<void>` | Sends a read receipt for a real event ID. |
| `start_sync`, `stop_sync` | None | `void` | No lifecycle, connected, error, typing or receipt callback is exported. |

Promise-returning WASM calls may reject when the Rust method returns an error. The exact error-code mapping is not typed or guaranteed by the package declarations. Frontend code surfaces operation failures and avoids logging passwords or session tokens.

## Session and synchronization lifecycle

Frontend sequence:

1. Load the package in a browser client boundary and call its default initializer with `/matrix_sdk_bridge_bg.wasm`.
2. Call `MatrixBridge.init(NEXT_PUBLIC_HOMESERVER_URL)`.
3. For sign-in, call `login(localUsername, password)`. For registration, call `register(localUsername, password)`; if `export_session()` remains empty, call the real `login` export with the submitted credentials.
4. Validate the exported session's user ID, save the opaque session in `sessionStorage`, and register callbacks before `start_sync()`.
5. On page reload, pass the saved session to `restore_session()`, then register callbacks and request sync startup.
6. On sign-out, call `stop_sync()`, request `logout()`, and clear local tab session/state in all cases. A remote logout error is reported.

The session object schema, token field names and callback JSON schemas are not part of the installed `.d.ts`. The frontend accepts the root `user_id`/`access_token` shape and the legacy `meta.user_id`/`tokens.access_token` shape for its temporary HTTP exceptions. These parsing assumptions must be verified with Developer A's published artifact.

The `start_sync()` method returns `void`. A successful invocation does not prove that initial sync completed or that the server remains connected. Current status therefore remains `unknown` after the request.

## Callback payloads: verified vs unverified

**Verified from declaration:** callbacks are accepted as JavaScript `Function`; there is no typed payload or listener cleanup method.

**Workspace Rust source shape, not verified against the installed npm binary:**

- Message JSON: `room_id`, `sender`, `body`, `timestamp`, `message_type`, optional `message_uri`, `mime_type`, `media_source`.
- Notification JSON: `event_type`, `room_id`, `sender`, `body`.
- Typing JSON: `room_id` and `user_ids` (or equivalent camel-case fields).
- Joined-room JSON: array of `{ room_id, name }`.
- Direct-message JSON: array of `{ room_id, targets, name }`.
- History JSON: `{ messages, has_more }`, with each message using the fields above.

The current frontend validates these candidate payloads at runtime, drops message types outside text/image/file, and rejects malformed or cross-room history. Callback payloads remain runtime-validated because the generated declaration does not type their JSON shape.

## Direct HTTP exceptions

No equivalents are present in the declarations for:

- Matrix user directory search.
- User profile retrieval.
- Presence read/write.

The frontend currently uses authenticated Matrix client-server requests for directory search and presence only. They are isolated in `matrixService.ts`; rate-limit, network, HTTP and malformed-response errors are visible. They can be removed after verified bridge replacements are supplied.

## Missing APIs

No installed export provides user profiles, room members, sync status/error events, callback unregistration, upload progress, event IDs, or profile-avatar MXC media resolution.

## Package and WASM compatibility evidence

| Artifact | SHA-256 |
|---|---|
| Installed `frontend/node_modules/@seucra/matrix-sdk-bridge/matrix_sdk_bridge_bg.wasm` | `18A23C3F80004DAAE5FA9EEB8C353A651ED1D4AC0B39F70B74DD539B3B58FF15` |
| Frontend runtime `frontend/public/matrix_sdk_bridge_bg.wasm` | `18A23C3F80004DAAE5FA9EEB8C353A651ED1D4AC0B39F70B74DD539B3B58FF15` |
| Separate workspace-generated `matrix-sdk-bridge/pkg/matrix_sdk_bridge_bg.wasm` | `74EC6FF9DE0C00508D9FDDF1B2D48D14E14C962C779DAA18BCFF510D2D86BA44` |

The first two artifacts match. The third is intentionally not substituted. `matrix-sdk-bridge/Cargo.toml` declares `matrix-sdk = 0.18.0` and `matrix-sdk-ui = 0.18.0`; the npm package itself does not expose the Rust SDK version or source commit.
