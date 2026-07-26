---
title: "Vigilant Matrix SDK Bridge"
subtitle: "WebAssembly API Reference and Frontend Integration Guide"
author: "Vigilant Engineering"
date: "July 2026"
version: "Backend Cycle 1 · v0.1"
lang: "en"
toc: true
toc-depth: 3
numbersections: true
geometry: "margin=1in"
titlepage: true
---

# Document Overview

## Purpose

This document specifies the public frontend API of the **Vigilant Matrix SDK Bridge**, a Rust-based WebAssembly interface built over the Matrix Rust SDK.

The bridge provides a simplified JavaScript-facing API for Matrix functionality required by the Vigilant frontend. It hides the Rust and Matrix SDK implementation details behind a comparatively small set of asynchronous JavaScript methods.

This document is intended primarily for frontend integration. It defines:

* bridge initialization and homeserver configuration;
* authentication and session management;
* Matrix synchronization;
* room management;
* direct-message management;
* real-time messaging;
* notifications;
* message history and pagination;
* image and PDF transfer;
* media retrieval;
* returned JSON structures;
* expected frontend workflows;
* errors and Cycle 1 limitations.

The API described here corresponds to **Backend Cycle 1, version 0.1**.

## Scope

Cycle 1 establishes a functional Matrix communication layer suitable for integration with the Vigilant frontend.

The current bridge supports:

| Capability                                    | Status    |
| --------------------------------------------- | --------- |
| Runtime homeserver selection                  | Supported |
| User registration                             | Supported |
| Login and logout                              | Supported |
| Session export and restoration                | Supported |
| Matrix synchronization                        | Supported |
| Room creation, joining and leaving            | Supported |
| User invitation                               | Supported |
| Direct messages                               | Supported |
| Text messaging                                | Supported |
| Real-time message callbacks                   | Supported |
| Notification callbacks                        | Supported |
| Image upload and download                     | Supported |
| PDF upload and download                       | Supported |
| Room message history                          | Supported |
| Backward history pagination                   | Supported |
| End-to-end production authentication workflow | Deferred  |
| Production deployment hardening               | Deferred  |

Features marked as deferred are intentionally outside the scope of Backend Cycle 1.

# Architecture Overview

## System Architecture

The frontend does not communicate with the Matrix Rust SDK directly.

The communication path is:

```text
Vigilant Frontend
       |
       | JavaScript / TypeScript
       v
matrix-sdk-bridge
       |
       | wasm-bindgen
       v
Rust WebAssembly
       |
       | matrix-sdk
       v
Matrix Homeserver
       |
       v
Synapse
```

The bridge therefore acts as an abstraction boundary between the frontend and the underlying Matrix implementation.

The frontend should depend on the public `MatrixBridge` interface documented here rather than Matrix SDK internals.

## Runtime Homeserver Selection

The homeserver is supplied when the bridge is initialized.

Development:

```javascript
const bridge = await MatrixBridge.init(
    "http://localhost:8008"
);
```

Tunnel/deployed environment:

```javascript
const bridge = await MatrixBridge.init(
    "https://matrix.seucra.tech"
);
```

This means the same compiled WebAssembly package can target different Matrix homeservers without recompiling the Rust project.

## Generated Package

Running:

```bash
wasm-pack build --target web
```

generates the browser-consumable package under `pkg/`.

Important generated artifacts include:

```text
pkg/
├── matrix_sdk_bridge.js
├── matrix_sdk_bridge_bg.wasm
├── matrix_sdk_bridge.d.ts
├── matrix_sdk_bridge_bg.wasm.d.ts
└── package.json
```

Frontend code should interact with the generated JavaScript API rather than importing or depending on Rust source modules.

# Frontend Integration

## Import and Initialization

A basic browser integration begins by loading the generated WASM package.

```javascript
import init, { MatrixBridge }
    from "../pkg/matrix_sdk_bridge.js";

await init();

const bridge = await MatrixBridge.init(
    "http://localhost:8008"
);
```

For a deployed frontend:

```javascript
const bridge = await MatrixBridge.init(
    "https://matrix.seucra.tech"
);
```

The homeserver URL should normally be stored in frontend configuration rather than repeated throughout application code.

For example:

```javascript
const HOMESERVER =
    "https://matrix.seucra.tech";

const bridge =
    await MatrixBridge.init(HOMESERVER);
```

# API Lifecycle

A normal application lifecycle is approximately:

```text
Load WASM
   |
   v
MatrixBridge.init()
   |
   +-----------------------+
   |                       |
   v                       v
login()              restore_session()
   |                       |
   +-----------+-----------+
               |
               v
      Register callbacks
               |
               v
          start_sync()
               |
               v
     Rooms / DMs / Messages
               |
               v
          stop_sync()
               |
               v
            logout()
```

Callbacks should normally be registered before synchronization begins.

# Authentication API

## `MatrixBridge.init`

### Signature

```typescript
static init(
    homeserver_url: string
): Promise<MatrixBridge>;
```

### Purpose

Creates a new Matrix bridge instance configured for the specified homeserver.

### Parameters

| Parameter        | Type     | Description                       |
| ---------------- | -------- | --------------------------------- |
| `homeserver_url` | `string` | Base URL of the Matrix homeserver |

### Example

```javascript
const bridge = await MatrixBridge.init(
    "https://matrix.seucra.tech"
);
```

### Notes

Calling `init()` creates the bridge but does not authenticate the user.

---

## `register`

### Signature

```typescript
register(
    username: string,
    password: string
): Promise<string>;
```

### Purpose

Registers a new Matrix account.

### Example

```javascript
try {
    const result =
        await bridge.register("alice", password);

    console.log(result);
} catch (error) {
    console.error("Registration failed:", error);
}
```

### Cycle 1 Note

The Cycle 1 Synapse environment uses a simplified registration configuration. Production-grade verification, CAPTCHA and related registration controls are outside the current cycle.

---

## `login`

### Signature

```typescript
login(
    username: string,
    password: string
): Promise<string>;
```

### Purpose

Authenticates the bridge as an existing Matrix user.

### Example

```javascript
const result =
    await bridge.login("alice", password);

console.log(result);
```

A successful login returns a human-readable status string.

### Errors

Possible Matrix errors include authentication failure and homeserver rate limiting.

For example, repeated login attempts may produce:

```text
M_LIMIT_EXCEEDED
```

The frontend should not repeatedly retry authentication without respecting server rate limits.

---

## `logout`

### Signature

```typescript
logout(): Promise<string>;
```

### Purpose

Logs out the currently authenticated Matrix session.

### Example

```javascript
await bridge.stop_sync();
const result = await bridge.logout();
```

The frontend should also remove any locally persisted exported session after a successful logout.

# Session Persistence

## `export_session`

### Signature

```typescript
export_session(): string | undefined;
```

### Purpose

Exports the current authenticated Matrix session into a JSON string suitable for local persistence.

### Example

```javascript
const session = bridge.export_session();

if (session) {
    localStorage.setItem(
        "matrix_session",
        session
    );
}
```

### Security

The exported session contains authentication material.

It must be treated as sensitive application data.

It should never be:

* printed into production logs;
* committed to source control;
* embedded into frontend source code;
* transmitted to unrelated services.

---

## `restore_session`

### Signature

```typescript
restore_session(
    session_json: string
): Promise<string>;
```

### Purpose

Restores a previously exported Matrix session.

### Example

```javascript
const saved =
    localStorage.getItem("matrix_session");

if (saved) {
    await bridge.restore_session(saved);
}
```

### Typical Startup

```javascript
await init();

const bridge =
    await MatrixBridge.init(HOMESERVER);

const saved =
    localStorage.getItem("matrix_session");

if (saved) {
    await bridge.restore_session(saved);
} else {
    await bridge.login(username, password);
}
```

# Synchronization

Synchronization is essential to Matrix operation.

Authentication establishes identity. Synchronization populates and continuously updates Matrix state.

Without synchronization, room membership and incoming events may not reflect the current homeserver state.

## `start_sync`

### Signature

```typescript
start_sync(): void;
```

### Purpose

Starts Matrix synchronization.

The bridge performs an initial synchronization and subsequently continues synchronization in the background.

### Recommended Sequence

```javascript
bridge.on_message(handleMessage);
bridge.on_notification(handleNotification);

bridge.start_sync();
```

### Important

Only one synchronization loop should run for a bridge instance.

Calling `start_sync()` again while synchronization is already active produces an error such as:

```text
Sync is already running
```

---

## `stop_sync`

### Signature

```typescript
stop_sync(): void;
```

### Purpose

Requests termination of the active synchronization loop.

### Example

```javascript
bridge.stop_sync();
```

# Room Management

## `create_room`

### Signature

```typescript
create_room(
    name: string
): Promise<string>;
```

### Purpose

Creates a Matrix room.

### Example

```javascript
const roomId =
    await bridge.create_room("Vigilant Test");

console.log(roomId);
```

A Matrix room ID resembles:

```text
!rIxQkLvUwQKITMuKPS:matrix.seucra.tech
```

---

## `list_joined_rooms`

### Signature

```typescript
list_joined_rooms(): Promise<string>;
```

### Purpose

Returns the rooms currently joined by the authenticated user.

### Return Value

The method returns a JSON-encoded string.

Frontend code should parse it:

```javascript
const raw =
    await bridge.list_joined_rooms();

const rooms = JSON.parse(raw);
```

### Room Structure

A room follows the conceptual structure:

```json
{
    "room_id": "!example:matrix.seucra.tech",
    "name": "Vigilant Test"
}
```

---

## `join_room`

### Signature

```typescript
join_room(
    room_id_or_alias: string
): Promise<string>;
```

### Purpose

Joins a Matrix room using its room ID or supported alias.

### Example

```javascript
await bridge.join_room(
    "!example:matrix.seucra.tech"
);
```

---

## `leave_room`

### Signature

```typescript
leave_room(
    room_id_str: string
): Promise<string>;
```

### Purpose

Leaves a currently joined room.

### Example

```javascript
await bridge.leave_room(roomId);
```

---

## `invite_user`

### Signature

```typescript
invite_user(
    room_id_str: string,
    user_id_str: string
): Promise<string>;
```

### Purpose

Invites another Matrix user to a room.

### Example

```javascript
await bridge.invite_user(
    roomId,
    "@bob:matrix.seucra.tech"
);
```

Matrix user IDs must use their complete Matrix identifier.

# Direct Messages

The bridge provides higher-level direct-message operations so the frontend does not need to manually reproduce Matrix DM bookkeeping.

## `create_direct_message`

### Signature

```typescript
create_direct_message(
    user_id_str: string
): Promise<string>;
```

### Purpose

Creates a direct-message room for another Matrix user.

### Example

```javascript
const roomId =
    await bridge.create_direct_message(
        "@bob:matrix.seucra.tech"
    );
```

---

## `find_direct_message`

### Signature

```typescript
find_direct_message(
    user_id_str: string
): Promise<string | undefined>;
```

### Purpose

Searches existing direct-message metadata for a DM associated with the specified user.

### Example

```javascript
const roomId =
    await bridge.find_direct_message(
        "@bob:matrix.seucra.tech"
    );

if (roomId) {
    console.log("Existing DM:", roomId);
}
```

---

## `get_or_create_direct_message`

### Signature

```typescript
get_or_create_direct_message(
    user_id_str: string
): Promise<string>;
```

### Purpose

Convenience operation intended for normal frontend DM creation.

It attempts to reuse an existing direct-message room and creates one when necessary.

### Recommended Usage

For a normal "Message User" button:

```javascript
const roomId =
    await bridge.get_or_create_direct_message(
        targetUserId
    );

openConversation(roomId);
```

This should generally be preferred over calling `create_direct_message()` directly.

---

## `list_direct_messages`

### Signature

```typescript
list_direct_messages(): Promise<string>;
```

### Purpose

Returns known direct-message rooms as JSON.

### Example

```javascript
const raw =
    await bridge.list_direct_messages();

const directMessages =
    JSON.parse(raw);
```

### Structure

```json
[
    {
        "room_id":
            "!example:matrix.seucra.tech",
        "targets": [
            "@bob:matrix.seucra.tech"
        ],
        "name": "bob"
    }
]
```

# Text Messaging

## `send_message`

### Signature

```typescript
send_message(
    room_id_str: string,
    message: string
): Promise<string>;
```

### Purpose

Sends a plain-text Matrix message.

### Example

```javascript
await bridge.send_message(
    roomId,
    "Hello from Vigilant"
);
```

The room must exist and be accessible to the authenticated user.

# Real-Time Messages

## `on_message`

### Signature

```typescript
on_message(
    callback: Function
): void;
```

### Purpose

Registers a JavaScript callback for supported Matrix message events.

The callback receives a JSON-encoded `JsMessage`.

### Example

```javascript
bridge.on_message((json) => {
    const message = JSON.parse(json);

    console.log(
        message.sender,
        message.body
    );
});
```

### `JsMessage`

```typescript
interface JsMessage {
    room_id: string;
    sender: string;
    body: string;
    timestamp: number;

    message_type: string;
    message_uri: string | null;
    mime_type: string | null;
    media_source: string | null;
}
```

### Text Example

```json
{
    "room_id":
        "!example:matrix.seucra.tech",
    "sender":
        "@alice:matrix.seucra.tech",
    "body": "Hello",
    "timestamp": 1785015727686,
    "message_type": "text",
    "message_uri": null,
    "mime_type": null,
    "media_source": null
}
```

### Supported Message Types

Cycle 1 currently extracts:

```text
text
image
file
```

Unsupported Matrix message types are not exposed through this simplified message abstraction.

# Notifications

## `on_notification`

### Signature

```typescript
on_notification(
    callback: Function
): void;
```

### Purpose

Registers a callback for notification-like events exposed by the bridge.

### Example

```javascript
bridge.on_notification((json) => {
    const notification =
        JSON.parse(json);

    console.log(notification);
});
```

### Notification Structure

```typescript
interface Notification {
    event_type: string;
    room_id: string;
    sender: string;
    body: string;
}
```

Example:

```json
{
    "event_type": "text",
    "room_id":
        "!example:matrix.seucra.tech",
    "sender":
        "@bob:matrix.seucra.tech",
    "body": "Hello"
}
```

# File and Image Messaging

## `send_image`

### Signature

```typescript
send_image(
    room_id_str: string,
    data: Uint8Array,
    filename: string,
    mime_type: string
): Promise<string>;
```

### Purpose

Uploads and sends an image to a Matrix room.

### Example

```javascript
const bytes =
    new Uint8Array(
        await file.arrayBuffer()
    );

await bridge.send_image(
    roomId,
    bytes,
    file.name,
    file.type
);
```

The supplied MIME type must be an image MIME type.

---

## `send_file`

### Signature

```typescript
send_file(
    room_id_str: string,
    data: Uint8Array,
    filename: string,
    mime_type: string
): Promise<string>;
```

### Purpose

Uploads and sends a supported file.

### Cycle 1 Restriction

The current implementation intentionally accepts PDF files only.

### Example

```javascript
const bytes =
    new Uint8Array(
        await file.arrayBuffer()
    );

await bridge.send_file(
    roomId,
    bytes,
    file.name,
    "application/pdf"
);
```

Attempting to send another MIME type through `send_file()` results in an error.

# Media Retrieval

## `get_media`

### Signature

```typescript
get_media(
    media_source_json: string
): Promise<Uint8Array>;
```

### Purpose

Retrieves media associated with a received image or file message.

`media_source_json` should come from the `media_source` field returned in `JsMessage`.

The frontend should treat this value as opaque bridge data.

It should not attempt to construct Matrix media-source JSON manually.

### Example

```javascript
const bytes =
    await bridge.get_media(
        message.media_source
    );

const blob =
    new Blob(
        [bytes],
        { type: message.mime_type }
    );

const url =
    URL.createObjectURL(blob);
```

For an image:

```javascript
imageElement.src = url;
```

For a downloadable PDF:

```javascript
const anchor =
    document.createElement("a");

anchor.href = url;
anchor.download = message.body;
anchor.click();
```

The frontend should eventually release generated object URLs:

```javascript
URL.revokeObjectURL(url);
```

# Message History

## `get_room_history`

### Signature

```typescript
get_room_history(
    room_id_str: string,
    limit: number
): Promise<string>;
```

### Purpose

Initializes or accesses the timeline for a room and requests older history.

### Return Value

A JSON-encoded `HistoryResponse`.

```typescript
interface HistoryResponse {
    messages: JsMessage[];
    has_more: boolean;
}
```

### Example

```javascript
const raw =
    await bridge.get_room_history(
        roomId,
        50
    );

const history =
    JSON.parse(raw);

renderMessages(history.messages);

if (history.has_more) {
    enableLoadMore();
}
```

---

## `load_more_history`

### Signature

```typescript
load_more_history(
    room_id_str: string,
    limit: number
): Promise<string>;
```

### Purpose

Requests additional older events for a timeline previously initialized through `get_room_history()`.

### Example

```javascript
const raw =
    await bridge.load_more_history(
        roomId,
        50
    );

const history =
    JSON.parse(raw);

prependMessages(history.messages);
```

### Requirement

`get_room_history()` must initialize the room timeline before `load_more_history()` is used.

Otherwise an error similar to the following may occur:

```text
Timeline not initialized
```

# History Behavior in Cycle 1

Timeline loading is asynchronous and depends on Matrix SDK timeline state.

During testing, the first history request may occasionally return:

```json
{
    "messages": [],
    "has_more": true
}
```

while a subsequent pagination/history operation populates the timeline and returns the expected historical messages.

This is a known **Cycle 1 integration behavior**, not evidence that room history has been lost.

Frontend code should therefore avoid assuming that one empty initial response necessarily means that a room contains no messages.

This behavior should be revisited during a later backend cycle when timeline initialization and frontend loading states are refined.

# Recommended Conversation Integration

A practical frontend conversation screen can use the bridge as follows:

```javascript
async function openRoom(roomId) {
    const raw =
        await bridge.get_room_history(
            roomId,
            50
        );

    const history =
        JSON.parse(raw);

    renderMessages(history.messages);
}
```

Real-time messages are handled independently:

```javascript
bridge.on_message((json) => {
    const message = JSON.parse(json);

    if (
        message.room_id === currentRoomId
    ) {
        appendMessage(message);
    }
});
```

Sending:

```javascript
async function sendText(text) {
    await bridge.send_message(
        currentRoomId,
        text
    );
}
```

Loading older messages:

```javascript
async function loadOlder() {
    const raw =
        await bridge.load_more_history(
            currentRoomId,
            50
        );

    const result =
        JSON.parse(raw);

    prependMessages(result.messages);
}
```

This separation is important:

```text
get_room_history()
        |
        +---- historical state

on_message()
        |
        +---- real-time state
```

The frontend combines both into its displayed conversation.

# Recommended Application Startup

A complete simplified startup sequence is:

```javascript
import init, { MatrixBridge }
    from "../pkg/matrix_sdk_bridge.js";

const HOMESERVER =
    "https://matrix.seucra.tech";

await init();

const bridge =
    await MatrixBridge.init(HOMESERVER);

const savedSession =
    localStorage.getItem(
        "matrix_session"
    );

if (savedSession) {
    await bridge.restore_session(
        savedSession
    );
} else {
    await bridge.login(
        username,
        password
    );

    const exported =
        bridge.export_session();

    if (exported) {
        localStorage.setItem(
            "matrix_session",
            exported
        );
    }
}

bridge.on_message((json) => {
    const message = JSON.parse(json);
    handleIncomingMessage(message);
});

bridge.on_notification((json) => {
    const notification =
        JSON.parse(json);

    handleNotification(notification);
});

bridge.start_sync();
```

# Data Contracts

## `JsRoom`

```typescript
interface JsRoom {
    room_id: string;
    name: string;
}
```

## `JsDirectMessage`

```typescript
interface JsDirectMessage {
    room_id: string;
    targets: string[];
    name: string;
}
```

## `JsMessage`

```typescript
interface JsMessage {
    room_id: string;
    sender: string;
    body: string;
    timestamp: number;

    message_type:
        "text" | "image" | "file";

    message_uri:
        string | null;

    mime_type:
        string | null;

    media_source:
        string | null;
}
```

## `Notification`

```typescript
interface Notification {
    event_type: string;
    room_id: string;
    sender: string;
    body: string;
}
```

## `HistoryResponse`

```typescript
interface HistoryResponse {
    messages: JsMessage[];
    has_more: boolean;
}
```

# Error Handling

Most asynchronous bridge methods reject their returned Promise when the underlying Rust or Matrix operation fails.

Frontend calls should therefore use either `try/catch`:

```javascript
try {
    await bridge.send_message(
        roomId,
        text
    );
} catch (error) {
    console.error(
        "Message failed:",
        error
    );
}
```

or Promise rejection handling.

Errors can originate from:

* invalid Matrix identifiers;
* authentication failure;
* expired or invalid access tokens;
* rate limiting;
* unavailable rooms;
* insufficient room permissions;
* invalid MIME types;
* unavailable media;
* network failure;
* homeserver failure;
* incorrect API lifecycle usage.

## Matrix Error Examples

### `M_UNKNOWN_TOKEN`

The stored access token is no longer accepted.

The frontend should normally clear the persisted session and require authentication again.

### `M_LIMIT_EXCEEDED`

The homeserver has rate-limited the request.

Repeated immediate retries should be avoided.

### `M_USER_IN_USE`

Registration attempted to create a username that already exists.

### `M_FORBIDDEN`

The requested Matrix operation is not permitted in the current state or with the current user's permissions.

# Frontend Rules

The following integration rules should be treated as part of the API contract.

1. Initialize WASM before creating `MatrixBridge`.

2. Supply the homeserver URL to `MatrixBridge.init()`.

3. Authenticate using `login()` or `restore_session()`.

4. Register message and notification callbacks before starting normal synchronization.

5. Do not start multiple synchronization loops on the same bridge.

6. Treat Matrix room IDs and user IDs as opaque identifiers.

7. Parse methods documented as returning JSON strings using `JSON.parse()`.

8. Treat `media_source` as opaque bridge data and pass it back to `get_media()` unchanged.

9. Convert browser files to `Uint8Array` before sending them to the bridge.

10. Do not expose exported Matrix session data.

11. Initialize room history before requesting additional history.

12. Expect Matrix operations to be asynchronous and potentially network-dependent.

# Known Cycle 1 Limitations

Backend Cycle 1 intentionally prioritizes functional vertical integration over production completeness.

Known limitations include:

* simplified registration configuration;
* limited exposed Matrix message types;
* `send_file()` restricted to PDF;
* timeline initialization may require an additional pagination/history request before historical messages appear;
* notification behavior is intentionally minimal;
* frontend-friendly typed JavaScript objects are not yet returned directly for all APIs, so several methods return JSON strings;
* production authentication and account-recovery workflows are not implemented;
* deployment and infrastructure hardening remain outside this API cycle.

These limitations should be treated as candidates for subsequent spiral-development cycles rather than hidden defects.

# API Summary

| Method                               | Purpose               | Return                         |
| ------------------------------------ | --------------------- | ------------------------------ |
| `init(url)`                          | Create bridge         | `MatrixBridge`                 |
| `register(user, pass)`               | Register user         | `Promise<string>`              |
| `login(user, pass)`                  | Authenticate          | `Promise<string>`              |
| `logout()`                           | Logout                | `Promise<string>`              |
| `export_session()`                   | Export session        | `string \| undefined`          |
| `restore_session(json)`              | Restore session       | `Promise<string>`              |
| `start_sync()`                       | Start synchronization | `void`                         |
| `stop_sync()`                        | Stop synchronization  | `void`                         |
| `create_room(name)`                  | Create room           | `Promise<string>`              |
| `list_joined_rooms()`                | List rooms            | `Promise<string>`              |
| `join_room(id)`                      | Join room             | `Promise<string>`              |
| `leave_room(id)`                     | Leave room            | `Promise<string>`              |
| `invite_user(room,user)`             | Invite user           | `Promise<string>`              |
| `create_direct_message(user)`        | Create DM             | `Promise<string>`              |
| `find_direct_message(user)`          | Find DM               | `Promise<string \| undefined>` |
| `get_or_create_direct_message(user)` | Resolve DM            | `Promise<string>`              |
| `list_direct_messages()`             | List DMs              | `Promise<string>`              |
| `send_message(room,text)`            | Send text             | `Promise<string>`              |
| `on_message(callback)`               | Receive messages      | `void`                         |
| `on_notification(callback)`          | Receive notifications | `void`                         |
| `send_image(...)`                    | Send image            | `Promise<string>`              |
| `send_file(...)`                     | Send PDF              | `Promise<string>`              |
| `get_media(source)`                  | Retrieve media        | `Promise<Uint8Array>`          |
| `get_room_history(room,limit)`       | Get history           | `Promise<string>`              |
| `load_more_history(room,limit)`      | Paginate history      | `Promise<string>`              |

# Appendix A: Matrix Identifier Reference

## User ID

```text
@alice:matrix.seucra.tech
```

General form:

```text
@localpart:server
```

## Room ID

```text
!rIxQkLvUwQKITMuKPS:matrix.seucra.tech
```

Room IDs should be stored and passed unchanged.

## MXC Media URI

Matrix media may internally reference an MXC URI.

The frontend generally does not need to resolve MXC resources itself because `get_media()` handles retrieval through the Matrix SDK.

# Appendix B: Minimal Working Integration

```javascript
import init, { MatrixBridge }
    from "../pkg/matrix_sdk_bridge.js";

await init();

const bridge =
    await MatrixBridge.init(
        "https://matrix.seucra.tech"
    );

await bridge.login(
    "alice",
    password
);

bridge.on_message((json) => {
    const message = JSON.parse(json);

    console.log(
        `[${message.room_id}]`,
        message.sender,
        message.body
    );
});

bridge.start_sync();

const rooms =
    JSON.parse(
        await bridge.list_joined_rooms()
    );

console.log(rooms);

if (rooms.length > 0) {
    await bridge.send_message(
        rooms[0].room_id,
        "Vigilant bridge operational."
    );
}
```

# Appendix C: Backend Cycle 1 Baseline

The following functionality has been exercised during Cycle 1 integration testing:

```text
WASM initialization
        ✓

User registration
        ✓

Login
        ✓

Session export / restore
        ✓

Room creation
        ✓

Room joining / leaving
        ✓

Room invitation
        ✓

Room discovery after sync
        ✓

Direct-message creation
        ✓

Direct-message discovery
        ✓

Real-time text messaging
        ✓

Message callbacks
        ✓

Notification callbacks
        ✓

PDF upload
        ✓

Image upload
        ✓

Media download
        ✓

Room history retrieval
        ✓

Backward pagination
        ✓

Runtime homeserver configuration
        ✓
```

This baseline defines the functional scope of **Vigilant Backend Cycle 1, version 0.1**.

# Appendix D: Build and Handoff

Build the bridge using:

```bash
cargo check
wasm-pack build --target web
```

The resulting `pkg/` directory provides the WebAssembly module and JavaScript/TypeScript bindings consumed by the frontend.

For Backend Cycle 1, the generated package may be committed alongside the source to provide a fixed integration artifact to the frontend developer.

A future development cycle may replace this handoff mechanism with package publication and conventional dependency management.

# Conclusion

The Vigilant Matrix SDK Bridge provides a WebAssembly abstraction over the Matrix Rust SDK intended to keep Matrix-specific complexity outside the frontend application.

Backend Cycle 1 establishes the core communication path from browser JavaScript through WebAssembly to the configured Matrix homeserver, including authentication, session persistence, synchronization, rooms, direct messages, real-time messaging, media transfer and message history.

The frontend should treat the documented `MatrixBridge` interface and its serialized data structures as the integration boundary. Internal Rust and Matrix SDK implementation details are not part of the frontend contract.

Subsequent development cycles may extend or refine this contract while preserving compatibility where practical.

