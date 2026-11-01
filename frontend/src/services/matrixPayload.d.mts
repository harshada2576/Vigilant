export type BridgeMessageType = "text" | "image" | "file";
export type MatrixPresenceValue = "online" | "unavailable" | "offline" | "unknown";
export type MatrixDisplayStatus = "online" | "offline" | "away" | "busy";

export interface NormalizedDirectoryUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface NormalizedPresence {
  presence: MatrixPresenceValue;
  statusMessage?: string;
}

export interface NormalizedBridgeMessage {
  roomId: string;
  senderId: string;
  body: string;
  timestamp: number;
  type: BridgeMessageType;
  mediaSource?: string;
  mimeType?: string;
}

export interface NormalizedBridgeRoom {
  id: string;
  name: string;
  type: "channel" | "dm";
  members: string[];
  memberListAvailable: false;
  directUserId?: string;
}

export function isMatrixUserId(value: unknown): boolean;
export function isMatrixRoomId(value: unknown): boolean;
export function safeHttpUrl(value: unknown): string | undefined;
export function normalizeDirectoryResponse(payload: unknown): NormalizedDirectoryUser[];
export function normalizePresenceResponse(payload: unknown): NormalizedPresence;
export function displayStatusForPresence(presence: MatrixPresenceValue, statusMessage?: string): MatrixDisplayStatus | undefined;
export function normalizeMessageEvent(payload: unknown): NormalizedBridgeMessage | undefined;
export function parseHistoryResponse(raw: string, roomId: string): { messages: NormalizedBridgeMessage[]; hasMore: boolean };
export function parseJoinedRooms(raw: string): NormalizedBridgeRoom[];
export function parseDirectMessages(raw: string): NormalizedBridgeRoom[];
export function stableMessageId(message: NormalizedBridgeMessage): string;
export function sortMessages<T extends { id: string; timestamp: number }>(messages: T[]): T[];
export function mergeUniqueMessages<T extends { id: string; timestamp: number }>(existing: T[], incoming: T[]): T[];
export function safeMediaMime(type: BridgeMessageType, mimeType?: string): string | undefined;
export function mediaBytesMatchMime(bytes: Uint8Array, mimeType: string): boolean;
