const MESSAGE_TYPES = new Set(["text", "image", "file"]);
const PRESENCE_VALUES = new Set(["online", "unavailable", "offline"]);
const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} was not valid JSON.`);
  }
}

export function isMatrixUserId(value) {
  return typeof value === "string" && /^@[^:\s]+:.+$/.test(value) && !/[\r\n]/.test(value);
}

export function isMatrixRoomId(value) {
  return typeof value === "string" && /^![^:\s]+:.+$/.test(value) && !/[\r\n]/.test(value);
}

export function safeHttpUrl(value) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeDirectoryResponse(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new Error("Matrix user directory returned an invalid response.");
  }

  return payload.results.flatMap((entry) => {
    if (!isRecord(entry) || !isMatrixUserId(entry.user_id)) return [];
    const userId = entry.user_id;
    const localpart = userId.slice(1, userId.indexOf(":"));
    const displayName = typeof entry.display_name === "string" && entry.display_name.trim()
      ? entry.display_name.trim()
      : localpart;
    return [{
      id: userId,
      name: displayName,
      avatarUrl: safeHttpUrl(entry.avatar_url),
    }];
  });
}

export function normalizePresenceResponse(payload) {
  if (!isRecord(payload)) {
    throw new Error("Matrix presence returned an invalid response.");
  }
  const presence = PRESENCE_VALUES.has(payload.presence) ? payload.presence : "unknown";
  const statusMessage = typeof payload.status_msg === "string" && payload.status_msg.trim()
    ? payload.status_msg.trim()
    : undefined;
  return { presence, statusMessage };
}

export function displayStatusForPresence(presence, statusMessage) {
  if (presence === "online" || presence === "offline") return presence;
  if (presence === "unavailable") {
    return statusMessage?.trim().toLowerCase() === "do not disturb" ? "busy" : "away";
  }
  return undefined;
}

function normalizeMessage(payload, roomId) {
  if (!isRecord(payload)) throw new Error("Matrix history contained an invalid message.");
  if (!isMatrixRoomId(payload.room_id) || payload.room_id !== roomId) {
    throw new Error("Matrix history contained a message for an unexpected room.");
  }
  if (!isMatrixUserId(payload.sender) || typeof payload.body !== "string") {
    throw new Error("Matrix history contained an invalid sender or message body.");
  }
  if (!Number.isSafeInteger(payload.timestamp) || payload.timestamp < 0) {
    throw new Error("Matrix history contained an invalid message timestamp.");
  }
  if (!MESSAGE_TYPES.has(payload.message_type)) return undefined;
  if (payload.media_source !== undefined && typeof payload.media_source !== "string") {
    throw new Error("Matrix history contained an invalid media source.");
  }
  if (payload.mime_type !== undefined && typeof payload.mime_type !== "string") {
    throw new Error("Matrix history contained an invalid media type.");
  }
  return {
    roomId: payload.room_id,
    senderId: payload.sender,
    body: payload.body,
    timestamp: payload.timestamp,
    type: payload.message_type,
    mediaSource: payload.media_source || undefined,
    mimeType: payload.mime_type || undefined,
  };
}

export function normalizeMessageEvent(payload) {
  if (!isRecord(payload)) throw new Error("Matrix sync returned an invalid message event.");
  if (!isMatrixRoomId(payload.room_id)) throw new Error("Matrix sync returned an invalid room ID.");
  return normalizeMessage(payload, payload.room_id);
}

export function parseHistoryResponse(raw, roomId) {
  const payload = parseJson(raw, "Matrix room history");
  if (!isMatrixRoomId(roomId) || !isRecord(payload) || !Array.isArray(payload.messages) || typeof payload.has_more !== "boolean") {
    throw new Error("Matrix room history returned an invalid response.");
  }
  const messages = payload.messages.flatMap((message) => {
    const normalized = normalizeMessage(message, roomId);
    return normalized ? [normalized] : [];
  });
  return { messages, hasMore: payload.has_more };
}

export function parseJoinedRooms(raw) {
  const payload = parseJson(raw, "Matrix joined rooms");
  if (!Array.isArray(payload)) throw new Error("Matrix joined rooms returned an invalid response.");
  return payload.map((entry) => {
    if (!isRecord(entry) || !isMatrixRoomId(entry.room_id)) {
      throw new Error("Matrix joined rooms contained an invalid room.");
    }
    return {
      id: entry.room_id,
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : entry.room_id,
      type: "channel",
      members: [],
      memberListAvailable: false,
    };
  });
}

export function parseDirectMessages(raw) {
  const payload = parseJson(raw, "Matrix direct messages");
  if (!Array.isArray(payload)) throw new Error("Matrix direct messages returned an invalid response.");
  return payload.map((entry) => {
    if (!isRecord(entry) || !isMatrixRoomId(entry.room_id)) {
      throw new Error("Matrix direct messages contained an invalid room.");
    }
    if (entry.targets !== undefined && (!Array.isArray(entry.targets) || !entry.targets.every(isMatrixUserId))) {
      throw new Error("Matrix direct messages contained invalid participant IDs.");
    }
    const targets = entry.targets || [];
    return {
      id: entry.room_id,
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : entry.room_id,
      type: "dm",
      members: targets,
      memberListAvailable: false,
      directUserId: targets.length === 1 ? targets[0] : undefined,
    };
  });
}

export function stableMessageId(message) {
  const input = [message.roomId, message.senderId, message.timestamp, message.type, message.body, message.mediaSource || ""].join("\u001f");
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `matrix:${first.toString(16)}${second.toString(16)}`;
}

export function sortMessages(messages) {
  return [...messages].sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));
}

export function mergeUniqueMessages(existing, incoming) {
  const seen = new Set(existing.map((message) => message.id));
  const additions = incoming.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
  return sortMessages([...existing, ...additions]);
}

export function safeMediaMime(type, mimeType) {
  if (type === "image" && IMAGE_MIME_TYPES.has(mimeType)) return mimeType;
  if (type === "file" && mimeType === "application/pdf") return mimeType;
  if (type === "image") return undefined;
  if (type === "file") return undefined;
  return undefined;
}

export function mediaBytesMatchMime(bytes, mimeType) {
  if (!(bytes instanceof Uint8Array)) return false;
  const ascii = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (mimeType === "application/pdf") return ascii(0, 5) === "%PDF-";
  if (mimeType === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 3) === "PNG";
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/gif") return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
  if (mimeType === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (mimeType === "image/avif") return ascii(4, 4) === "ftyp" && /^(avif|avis)$/.test(ascii(8, 4));
  return false;
}
