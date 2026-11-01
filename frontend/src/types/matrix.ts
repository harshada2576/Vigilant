/** Frontend domain contracts. They describe data the UI can hold; they do not
 * add methods to the published WASM bridge. */
import type { MatrixBridge } from "@seucra/matrix-sdk-bridge";

/** Exact installed package API; generated declarations remain authoritative. */
export type PublishedMatrixBridgeApi = MatrixBridge;

/** Matrix protocol presence. `unknown` is intentionally distinct from offline. */
export type MatrixPresence = "online" | "unavailable" | "offline" | "unknown";
/** Product display labels derived from a confirmed Matrix presence response. */
export type MatrixDisplayStatus = "online" | "offline" | "away" | "busy";

export interface MatrixUser {
  id: string;
  name: string;
  avatarUrl?: string;
  presence?: MatrixPresence;
  status?: MatrixDisplayStatus;
  statusMessage?: string;
}

export interface MatrixUserProfile {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  presence?: MatrixPresence;
  statusMessage?: string;
}

export interface MatrixRoomMember {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  membership: "join" | "invite" | "leave" | "ban" | "unknown";
  presence?: MatrixPresence;
}

export interface MatrixRoom {
  id: string;
  name: string;
  topic?: string;
  type: "channel" | "dm";
  avatarUrl?: string;
  unreadCount?: number;
  /** IDs observed for a direct conversation; not a verified member list. */
  members: string[];
  memberListAvailable?: boolean;
  directUserId?: string;
  isEncrypted?: boolean;
  createdAt?: number;
}

export interface MatrixMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
  type: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
  mediaSource?: string;
  mimeType?: string;
  isEncrypted?: boolean;
}

export interface MatrixMedia {
  source: string;
  mimeType?: string;
  fileName?: string;
  size?: number;
}

export type MatrixSyncStatus =
  | "idle"
  | "initializing"
  | "authenticated"
  | "syncing"
  | "unknown"
  | "disconnected"
  | "error";

export interface MatrixSyncError {
  phase: "wasm" | "homeserver" | "auth" | "sync" | "history" | "send" | "media";
  message: string;
  retryable: boolean;
}

export interface MatrixPresenceSnapshot {
  presence: MatrixPresence;
  status?: MatrixDisplayStatus;
  statusMessage?: string;
}

export interface MatrixTypingEvent {
  roomId: string;
  userId: string;
  typing: boolean;
}

export interface MatrixReadReceipt {
  roomId: string;
  userId: string;
  eventId: string;
  timestamp?: number;
}
