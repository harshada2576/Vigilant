import { create } from "zustand";
import type { MatrixMessage, MatrixPresence, MatrixRoom, MatrixSyncError, MatrixSyncStatus, MatrixUser } from "../types/matrix";
import { mergeUniqueMessages, sortMessages } from "../services/matrixPayload.mjs";

export type User = MatrixUser;
export type Room = MatrixRoom;
export type Message = MatrixMessage;

interface MatrixState {
  currentUser: User | null;
  rooms: Room[];
  messages: Record<string, Message[]>; // roomId -> messages
  hasMoreMessages: Record<string, boolean>; // roomId -> boolean
  activeRoomId: string | null;
  users: User[]; // User directory for search/DMs
  isConnecting: boolean;
  syncStatus: MatrixSyncStatus;
  connectionError: MatrixSyncError | null;
  connectionMode: "connecting" | "authenticated" | "disconnected" | "error";

  // Actions
  setCurrentUser: (user: User | null) => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  leaveRoom: (roomId: string) => void;
  setActiveRoomId: (roomId: string | null) => void;
  addMessage: (roomId: string, message: Message) => void;
  prependMessages: (roomId: string, messages: Message[]) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  setHasMoreMessages: (roomId: string, hasMore: boolean) => void;
  setUsers: (users: User[]) => void;
  updateUserPresence: (userId: string, presence: MatrixPresence, status?: User["status"], statusMessage?: string) => void;
  setConnecting: (isConnecting: boolean) => void;
  setSyncStatus: (status: MatrixSyncStatus) => void;
  setConnectionError: (error: MatrixSyncError | null) => void;
  setConnectionMode: (mode: "connecting" | "authenticated" | "disconnected" | "error") => void;
  reset: () => void;
}

export const useMatrixStore = create<MatrixState>((set) => ({
  currentUser: null,
  rooms: [],
  messages: {},
  hasMoreMessages: {},
  activeRoomId: null,
  users: [],
  isConnecting: false,
  syncStatus: "idle",
  connectionError: null,
  connectionMode: "disconnected",

  setCurrentUser: (user) => set({ currentUser: user }),
  setRooms: (rooms) => set(() => {
    // Deduplicate channels: keep first occurrence of each room ID
    const seen = new Set<string>();
    // Deduplicate DMs: keep first occurrence for each sorted member fingerprint
    const dmSeen = new Set<string>();
    const deduped: Room[] = [];

    for (const room of rooms) {
      if (seen.has(room.id)) continue;
      seen.add(room.id);

      if (room.type === "dm") {
        // Fingerprint = sorted lowercase members joined — identifies unique conversations
        const fingerprint = (room.directUserId ? [room.directUserId] : room.members)
          .map((m) => m.toLowerCase())
          .sort()
          .join("|");
        if (fingerprint && dmSeen.has(fingerprint)) continue;
        if (fingerprint) dmSeen.add(fingerprint);
      }

      deduped.push(room);
    }

    return { rooms: deduped };
  }),
  addRoom: (room) => set((state) => {
    // Prevent duplicates by ID
    if (state.rooms.some((r) => r.id === room.id)) return {};

    // For DMs: also prevent creating a second room for the same pair of users
    if (room.type === "dm" && room.members.length > 0) {
      const incomingMembers = new Set(room.members.map((m) => m.toLowerCase()));
      const duplicateDM = state.rooms.find((r) => {
        if (r.type !== "dm" || r.members.length === 0) return false;
        const existingMembers = new Set(r.members.map((m) => m.toLowerCase()));
        // If every member in the new room is already in an existing room, it's a duplicate
        let overlap = 0;
        incomingMembers.forEach((m) => { if (existingMembers.has(m)) overlap++; });
        return overlap >= Math.min(incomingMembers.size, existingMembers.size) && overlap >= 1;
      });
      if (duplicateDM) return {};
    }

    return { rooms: [room, ...state.rooms] };
  }),
  leaveRoom: (roomId) => set((state) => ({
    rooms: state.rooms.filter((r) => r.id !== roomId),
    activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
  })),
  setActiveRoomId: (roomId) => set((state) => {
    // Clear only counts accumulated from real events received in this session.
    const updatedRooms = state.rooms.map((room) =>
      room.id === roomId && room.unreadCount !== undefined ? { ...room, unreadCount: 0 } : room
    );
    return { activeRoomId: roomId, rooms: updatedRooms };
  }),
  addMessage: (roomId, message) => set((state) => {
    const roomMessages = state.messages[roomId] || [];
    // Bridge 0.1.4 does not expose Matrix event IDs, so message IDs are stable
    // fingerprints derived at the service boundary. Do not collapse separate
    // messages merely because their displayed text and timestamp happen to match.
    if (roomMessages.some((m) => m.id === message.id)) {
      return {};
    }

    const updatedMessages = mergeUniqueMessages(roomMessages, [message]);

    // Update room unread count if the room is not active
    const updatedRooms = state.rooms.map((room) => {
      if (room.id === roomId && state.activeRoomId !== roomId) {
        return { ...room, unreadCount: (room.unreadCount ?? 0) + 1 };
      }
      return room;
    });

    return {
      messages: {
        ...state.messages,
        [roomId]: updatedMessages,
      },
      rooms: updatedRooms,
    };
  }),
  prependMessages: (roomId, newOlderMessages) => set((state) => {
    const current = state.messages[roomId] || [];
    const merged = mergeUniqueMessages(current, newOlderMessages);
    if (merged.length === current.length) return {};
    return {
      messages: {
        ...state.messages,
        [roomId]: merged,
      },
    };
  }),
  setMessages: (roomId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [roomId]: sortMessages(messages),
    },
  })),
  setHasMoreMessages: (roomId, hasMore) => set((state) => ({
    hasMoreMessages: {
      ...state.hasMoreMessages,
      [roomId]: hasMore,
    },
  })),
  setUsers: (users) => set({ users }),
  updateUserPresence: (userId, presence, status, statusMessage) => set((state) => {
    const update = (user: User): User => ({ ...user, presence, status, statusMessage });
    return {
      currentUser: state.currentUser?.id === userId ? update(state.currentUser) : state.currentUser,
    };
  }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setConnectionError: (connectionError) => set({ connectionError }),
  setConnectionMode: (connectionMode) => set({ connectionMode }),
  reset: () => set({
    currentUser: null,
    rooms: [],
    messages: {},
    hasMoreMessages: {},
    activeRoomId: null,
    users: [],
    isConnecting: false,
    syncStatus: "idle",
    connectionError: null,
    connectionMode: "disconnected",
  }),
}));
