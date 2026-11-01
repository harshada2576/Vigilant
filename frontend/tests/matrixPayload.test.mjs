import assert from "node:assert/strict";
import test from "node:test";
import {
  displayStatusForPresence,
  isMatrixRoomId,
  isMatrixUserId,
  mediaBytesMatchMime,
  mergeUniqueMessages,
  normalizeDirectoryResponse,
  normalizeMessageEvent,
  normalizePresenceResponse,
  parseDirectMessages,
  parseHistoryResponse,
  parseJoinedRooms,
  safeHttpUrl,
  safeMediaMime,
  sortMessages,
  stableMessageId,
} from "../src/services/matrixPayload.mjs";

test("Matrix identifiers are validated without treating arbitrary strings as IDs", () => {
  assert.equal(isMatrixUserId("@alice:example.org"), true);
  assert.equal(isMatrixUserId("alice@example.org"), false);
  assert.equal(isMatrixUserId("@alice example:example.org"), false);
  assert.equal(isMatrixUserId(null), false);
});

test("directory results keep only real Matrix IDs and safe avatar URLs", () => {
  const results = normalizeDirectoryResponse({ results: [
    { user_id: "@alice:example.org", display_name: "Alice", avatar_url: "https://cdn.example.org/a.png" },
    { user_id: "@bob:example.org", avatar_url: "mxc://example.org/avatar" },
    { user_id: "not-an-id", display_name: "Not a user", email: "invented@example.org" },
    null,
  ] });
  assert.deepEqual(results, [
    { id: "@alice:example.org", name: "Alice", avatarUrl: "https://cdn.example.org/a.png" },
    { id: "@bob:example.org", name: "bob", avatarUrl: undefined },
  ]);
  assert.throws(() => normalizeDirectoryResponse({ results: {} }), /invalid response/);
});

test("unsafe and MXC avatar URLs are not passed to an img element", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), undefined);
  assert.equal(safeHttpUrl("mxc://example.org/avatar"), undefined);
  assert.equal(safeHttpUrl("https://example.org/avatar.png"), "https://example.org/avatar.png");
});

test("unknown presence stays unknown and busy requires the exact status message", () => {
  assert.deepEqual(normalizePresenceResponse({ presence: "future-value", status_msg: "Working" }), {
    presence: "unknown",
    statusMessage: "Working",
  });
  assert.equal(displayStatusForPresence("unknown", "Offline"), undefined);
  assert.equal(displayStatusForPresence("unavailable", "Do Not Disturb"), "busy");
  assert.equal(displayStatusForPresence("unavailable", "I am busy later"), "away");
  assert.equal(displayStatusForPresence("online"), "online");
  assert.throws(() => normalizePresenceResponse(null), /invalid response/);
});

test("history payloads are validated, room-bound, and skip unsupported event types", () => {
  const history = parseHistoryResponse(JSON.stringify({
    has_more: true,
    messages: [
      { room_id: "!room:example.org", sender: "@alice:example.org", body: "hello", timestamp: 42, message_type: "text" },
      { room_id: "!room:example.org", sender: "@alice:example.org", body: "voice", timestamp: 43, message_type: "audio" },
    ],
  }), "!room:example.org");
  assert.equal(history.hasMore, true);
  assert.equal(history.messages.length, 1);
  assert.equal(history.messages[0].body, "hello");
  assert.throws(() => parseHistoryResponse("{}", "!room:example.org"), /invalid response/);
  assert.throws(() => parseHistoryResponse(JSON.stringify({ has_more: false, messages: [
    { room_id: "!other:example.org", sender: "@alice:example.org", body: "wrong room", timestamp: 1, message_type: "text" },
  ] }), "!room:example.org"), /unexpected room/);
});

test("sync events reject malformed records and ignore unsupported message types", () => {
  assert.equal(normalizeMessageEvent({
    room_id: "!room:example.org", sender: "@alice:example.org", body: "voice", timestamp: 1, message_type: "audio",
  }), undefined);
  assert.throws(() => normalizeMessageEvent({ room_id: "!room:example.org", sender: "not-id", body: "x", timestamp: 1, message_type: "text" }), /invalid sender/);
});

test("room list payloads validate room IDs and DM participant IDs", () => {
  assert.equal(parseJoinedRooms(JSON.stringify([{ room_id: "!room:example.org", name: "Room" }]))[0].name, "Room");
  assert.equal(parseDirectMessages(JSON.stringify([{ room_id: "!dm:example.org", targets: ["@alice:example.org"] }]))[0].directUserId, "@alice:example.org");
  assert.throws(() => parseJoinedRooms(JSON.stringify([{ room_id: "bad" }])), /invalid room/);
  assert.throws(() => parseDirectMessages(JSON.stringify([{ room_id: "!dm:example.org", targets: ["bad"] }])), /participant IDs/);
});

test("message identity is stable across repeated payloads", () => {
  const message = { roomId: "!room:example.org", senderId: "@alice:example.org", body: "same", timestamp: 12, type: "text" };
  assert.equal(stableMessageId(message), stableMessageId({ ...message }));
  assert.notEqual(stableMessageId(message), stableMessageId({ ...message, body: "different" }));
});

test("message merge orders by timestamp and removes only duplicate bridge IDs", () => {
  const first = { id: "first", timestamp: 20, content: "same" };
  const second = { id: "second", timestamp: 10, content: "same" };
  const duplicate = { ...first };
  const sameTextDistinctEvent = { id: "third", timestamp: 20, content: "same" };
  assert.deepEqual(mergeUniqueMessages([first], [duplicate, second, sameTextDistinctEvent]), [
    second,
    first,
    sameTextDistinctEvent,
  ]);
});

test("media MIME types are constrained to the UI-supported formats", () => {
  assert.equal(safeMediaMime("image", "image/png"), "image/png");
  assert.equal(safeMediaMime("image", "image/svg+xml"), undefined);
  assert.equal(safeMediaMime("file", "application/pdf"), "application/pdf");
  assert.equal(safeMediaMime("file", "text/html"), undefined);
  assert.equal(mediaBytesMatchMime(new TextEncoder().encode("%PDF-1.7"), "application/pdf"), true);
  assert.equal(mediaBytesMatchMime(new TextEncoder().encode("<html>"), "application/pdf"), false);
});

test("Matrix room identifiers are strictly validated", () => {
  assert.equal(isMatrixRoomId("!room:example.org"), true);
  assert.equal(isMatrixRoomId("#alias:example.org"), false);
  assert.equal(isMatrixRoomId("room:example.org"), false);
  assert.equal(isMatrixRoomId("!room:example.org\n"), false);
  assert.equal(isMatrixRoomId(null), false);
  assert.equal(isMatrixRoomId(123), false);
});

test("safeHttpUrl rejects URLs with credentials and non-HTTP schemes", () => {
  assert.equal(safeHttpUrl("https://user:pass@example.org/avatar.png"), undefined);
  assert.equal(safeHttpUrl("ftp://example.org/avatar.png"), undefined);
  assert.equal(safeHttpUrl("data:image/png;base64,abc"), undefined);
  assert.equal(safeHttpUrl("http://example.org/avatar.jpg"), "http://example.org/avatar.jpg");
  assert.equal(safeHttpUrl(null), undefined);
});

test("mediaBytesMatchMime detects magic byte signatures for supported image formats", () => {
  // PNG
  assert.equal(mediaBytesMatchMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  // JPEG
  assert.equal(mediaBytesMatchMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"), true);
  // GIF87a and GIF89a
  assert.equal(mediaBytesMatchMime(new TextEncoder().encode("GIF87a..."), "image/gif"), true);
  assert.equal(mediaBytesMatchMime(new TextEncoder().encode("GIF89a..."), "image/gif"), true);
  // WebP
  assert.equal(mediaBytesMatchMime(new TextEncoder().encode("RIFF....WEBP"), "image/webp"), true);
  // AVIF
  assert.equal(mediaBytesMatchMime(new TextEncoder().encode("....ftypavif"), "image/avif"), true);
  // Non-matching or truncated
  assert.equal(mediaBytesMatchMime(new Uint8Array([0x00, 0x01]), "image/png"), false);
  assert.equal(mediaBytesMatchMime("not-uint8array", "image/png"), false);
});

test("history and sync payload validation rejects invalid timestamps and corrupted payloads", () => {
  // Negative timestamp in history
  assert.throws(() => parseHistoryResponse(JSON.stringify({
    has_more: false,
    messages: [{ room_id: "!room:example.org", sender: "@alice:example.org", body: "test", timestamp: -1, message_type: "text" }],
  }), "!room:example.org"), /invalid message timestamp/);

  // Floating point timestamp
  assert.throws(() => parseHistoryResponse(JSON.stringify({
    has_more: false,
    messages: [{ room_id: "!room:example.org", sender: "@alice:example.org", body: "test", timestamp: 1.5, message_type: "text" }],
  }), "!room:example.org"), /invalid message timestamp/);

  // Invalid JSON
  assert.throws(() => parseHistoryResponse("invalid json", "!room:example.org"), /was not valid JSON/);
});

test("sortMessages orders deterministically by timestamp then message ID", () => {
  const m1 = { id: "b", timestamp: 100 };
  const m2 = { id: "a", timestamp: 100 };
  const m3 = { id: "c", timestamp: 50 };
  const sorted = sortMessages([m1, m2, m3]);
  assert.deepEqual(sorted, [m3, m2, m1]);
});
