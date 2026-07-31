import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status?: "online" | "offline" | "away" | "busy";
}

export interface Room {
  id: string;
  name: string;
  topic?: string;
  type: "channel" | "dm";
  avatarUrl?: string;
  unreadCount: number;
  members: string[]; // User IDs
  isEncrypted: boolean;
  createdAt: number;
}

export interface Message {
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
  isEncrypted: boolean;
}

interface MatrixState {
  currentUser: User | null;
  rooms: Room[];
  messages: Record<string, Message[]>; // roomId -> messages
  activeRoomId: string | null;
  users: User[]; // User directory for search/DMs
  isConnecting: boolean;
  isSynced: boolean;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  leaveRoom: (roomId: string) => void;
  setActiveRoomId: (roomId: string | null) => void;
  addMessage: (roomId: string, message: Message) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  setUsers: (users: User[]) => void;
  updateUserStatus: (userId: string, status: User["status"]) => void;
  setConnecting: (isConnecting: boolean) => void;
  setSynced: (isSynced: boolean) => void;
  reset: () => void;
}

export const useMatrixStore = create<MatrixState>((set) => ({
  currentUser: null,
  rooms: [],
  messages: {},
  activeRoomId: null,
  users: [],
  isConnecting: false,
  isSynced: false,

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
        const fingerprint = room.members
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
    // Clear unread counts for this room
    const updatedRooms = state.rooms.map((room) =>
      room.id === roomId ? { ...room, unreadCount: 0 } : room
    );
    return { activeRoomId: roomId, rooms: updatedRooms };
  }),
  addMessage: (roomId, message) => set((state) => {
    const roomMessages = state.messages[roomId] || [];
    // Prevent duplicate messages by ID
    if (roomMessages.some((m) => m.id === message.id)) return {};
    
    const updatedMessages = [...roomMessages, message];
    
    // Update room unread count if the room is not active
    const updatedRooms = state.rooms.map((room) => {
      if (room.id === roomId && state.activeRoomId !== roomId) {
        return { ...room, unreadCount: room.unreadCount + 1 };
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
  setMessages: (roomId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [roomId]: messages,
    },
  })),
  setUsers: (users) => set({ users }),
  updateUserStatus: (userId, status) => set((state) => {
    const updatedUsers = state.users.map((u) =>
      u.id === userId ? { ...u, status } : u
    );
    // Also update currentUser if it's the same user
    const updatedCurrentUser = state.currentUser?.id === userId 
      ? { ...state.currentUser, status } 
      : state.currentUser;
      
    return { users: updatedUsers, currentUser: updatedCurrentUser };
  }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setSynced: (isSynced) => set({ isSynced }),
  reset: () => set({
    currentUser: null,
    rooms: [],
    messages: {},
    activeRoomId: null,
    users: [],
    isConnecting: false,
    isSynced: false,
  }),
}));
