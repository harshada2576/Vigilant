import { useMatrixStore, User, Room, Message } from "../store/matrixStore";

let bridgeInstance: any = null;

// Pre-seeded mock data for interactive local mode
const MOCK_USERS: User[] = [
  { id: "user_harshada", name: "Harshada", email: "harshada@vigilant.co", status: "online" },
  { id: "user_rushikesh", name: "Rushikesh", email: "rushikesh@vigilant.co", status: "online" },
  { id: "user_alice", name: "Alice Smith (CISO)", email: "alice@vigilant.co", status: "busy" },
  { id: "user_bob", name: "Bob Jones (DevOps)", email: "bob@vigilant.co", status: "offline" },
];

const MOCK_ROOMS: Room[] = [
  {
    id: "room_general",
    name: "general",
    topic: "Company-wide discussions and watercooler talk",
    type: "channel",
    unreadCount: 0,
    members: ["user_harshada", "user_rushikesh", "user_alice", "user_bob"],
    isEncrypted: false,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "room_announcements",
    name: "announcements",
    topic: "Important announcements and policy updates",
    type: "channel",
    unreadCount: 0,
    members: ["user_harshada", "user_rushikesh", "user_alice", "user_bob"],
    isEncrypted: false,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: "room_security",
    name: "security-compliance 🔒",
    topic: "E2E Encrypted channel for secure audits, keys and keys escrow discussion",
    type: "channel",
    unreadCount: 0,
    members: ["user_harshada", "user_rushikesh", "user_alice"],
    isEncrypted: true,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  room_general: [
    {
      id: "msg_g0",
      roomId: "room_general",
      senderId: "user_alice",
      senderName: "Alice Smith (CISO)",
      content: "Workspace initialization completed and compliance policy deployed.",
      timestamp: Date.now() - 86400000 * 2,
      type: "text",
      isEncrypted: false,
    },
    {
      id: "msg_g1",
      roomId: "room_general",
      senderId: "user_bob",
      senderName: "Bob Jones (DevOps)",
      content: "Welcome to Vigilant Workspace! Infrastructure is ready for live messaging.",
      timestamp: Date.now() - 86400000 * 1,
      type: "text",
      isEncrypted: false,
    },
    {
      id: "msg_g2",
      roomId: "room_general",
      senderId: "user_harshada",
      senderName: "Harshada",
      content: "Feel free to explore the channels, create new rooms, and test DMs!",
      timestamp: Date.now() - 3600000 * 2,
      type: "text",
      isEncrypted: false,
    },
  ],
  room_security: [
    {
      id: "msg_s0",
      roomId: "room_security",
      senderId: "user_bob",
      senderName: "Bob Jones (DevOps)",
      content: "Megolm cryptographic ratchets generated for room key escrow.",
      timestamp: Date.now() - 86400000 * 3,
      type: "text",
      isEncrypted: true,
    },
    {
      id: "msg_s1",
      roomId: "room_security",
      senderId: "user_alice",
      senderName: "Alice Smith (CISO)",
      content: "All communication inside this channel is End-to-End Encrypted via Megolm.",
      timestamp: Date.now() - 86400000 * 1,
      type: "text",
      isEncrypted: true,
    },
  ],
};

// Dynamic wrapper to safely import WASM on the client side only
async function getBridgeInstance() {
  if (typeof window === "undefined") return null;
  if (bridgeInstance) return bridgeInstance;

  try {
    const wasm = await import("@seucra/matrix-sdk-bridge");
    try {
      await wasm.default();
    } catch (e) {
      console.warn("Package-relative WASM load failed, falling back to public folder:", e);
      await wasm.default("/matrix_sdk_bridge_bg.wasm");
    }
    
    const homeserverUrl = process.env.NEXT_PUBLIC_HOMESERVER_URL || "http://localhost:8008";
    console.log("Initializing Matrix WASM bridge targeting:", homeserverUrl);
    
    bridgeInstance = await wasm.MatrixBridge.init(homeserverUrl);
    return bridgeInstance;
  } catch (error) {
    console.warn("Matrix WASM SDK Bridge not reachable directly:", error);
    return null;
  }
}

class MatrixService {
  private isInitialised = false;

  async init() {
    if (typeof window === "undefined" || this.isInitialised) return;
    this.isInitialised = true;

    const store = useMatrixStore.getState();
    store.setConnecting(true);

    try {
      const savedUserJson = localStorage.getItem("vigilant_user");

      if (savedUserJson) {
        const currentUser = JSON.parse(savedUserJson);
        store.setCurrentUser(currentUser);
        this.loadMockData(store);

        const bridge = await getBridgeInstance();
        const savedSession = localStorage.getItem("matrix_session");

        if (bridge && savedSession) {
          try {
            console.log("Restoring active Matrix session...");
            await bridge.restore_session(savedSession);
            this.setupCallbacks(bridge);
            bridge.start_sync();
            await this.syncRooms(bridge);
          } catch (e) {
            console.warn("Remote session restore skipped, using local state:", e);
          }
        }
        
        store.setSynced(true);
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
    } finally {
      store.setConnecting(false);
    }
  }

  private loadMockData(store: any) {
    const currentUser = store.currentUser;
    let allUsers = [...MOCK_USERS];
    
    if (typeof window !== "undefined") {
      try {
        const savedRegistered = JSON.parse(localStorage.getItem("vigilant_registered_users") || "[]");
        savedRegistered.forEach((u: User) => {
          if (!allUsers.some(existing => existing.email.toLowerCase() === u.email.toLowerCase() || existing.id === u.id)) {
            allUsers.push(u);
          }
        });
      } catch (e) {}
    }
    store.setUsers(allUsers);
    
    // Load shared rooms across users
    let sharedRooms: Room[] = [...MOCK_ROOMS];
    if (typeof window !== "undefined") {
      try {
        const savedRooms = JSON.parse(localStorage.getItem("vigilant_shared_rooms") || "[]");
        savedRooms.forEach((sr: Room) => {
          if (!sharedRooms.some((r) => r.id === sr.id)) {
            sharedRooms.push(sr);
          }
        });
      } catch (e) {}
    }

    // Filter rooms visible to current logged in user
    if (currentUser) {
      const currentUserNameClean = currentUser.name.toLowerCase();
      const currentUserIdClean = currentUser.id.toLowerCase();
      const currentUserEmailClean = currentUser.email.toLowerCase();

      const userVisibleRooms = sharedRooms.filter((room) => {
        if (room.type === "channel") return true;
        
        // DM room visibility check
        const isMember = room.members.some((m) => {
          const mClean = m.toLowerCase();
          return mClean === currentUserIdClean || mClean === currentUserNameClean || mClean.includes(currentUserNameClean);
        });

        const isNameMatch = room.name.toLowerCase() === currentUserNameClean || room.name.toLowerCase() === currentUserEmailClean;

        return isMember || isNameMatch;
      });

      store.setRooms(userVisibleRooms);

      // Load messages for each room
      userVisibleRooms.forEach((r) => {
        const savedMsgs = localStorage.getItem(`vigilant_shared_messages_${r.id}`);
        if (savedMsgs) {
          try {
            store.setMessages(r.id, JSON.parse(savedMsgs));
          } catch (e) {}
        } else if (MOCK_MESSAGES[r.id]) {
          store.setMessages(r.id, MOCK_MESSAGES[r.id]);
        }
      });
    } else {
      store.setRooms(sharedRooms);
    }
  }

  syncRoomMessages(roomId: string) {
    const store = useMatrixStore.getState();
    if (typeof window === "undefined") return;

    const savedMsgs = localStorage.getItem(`vigilant_shared_messages_${roomId}`);
    if (savedMsgs) {
      try {
        const parsed: Message[] = JSON.parse(savedMsgs);
        const current = store.messages[roomId] || [];
        if (parsed.length !== current.length) {
          store.setMessages(roomId, parsed);
        }
      } catch (e) {}
    }
  }

  private setupCallbacks(bridge: any) {
    const store = useMatrixStore.getState();

    bridge.on_message((jsonMsg: string) => {
      try {
        const msg = JSON.parse(jsonMsg);
        
        const existingMessages = store.messages[msg.room_id] || [];
        const isDuplicate = existingMessages.some(
          (m) => m.timestamp === msg.timestamp && m.content === msg.body
        );
        if (isDuplicate) return;

        const senderLocalpart = msg.sender.split(":")[0].substring(1);

        const translatedMessage: Message = {
          id: `${msg.room_id}_${msg.timestamp}_${Math.random().toString(36).substring(2, 7)}`,
          roomId: msg.room_id,
          senderId: msg.sender,
          senderName: senderLocalpart,
          content: msg.body,
          timestamp: msg.timestamp,
          type: msg.message_type as "text" | "image" | "file",
          isEncrypted: msg.message_uri !== null || msg.mime_type !== null,
          fileName: msg.body.includes(".") ? msg.body : undefined,
        };

        store.addMessage(msg.room_id, translatedMessage);
      } catch (err) {
        console.error("Error parsing incoming live message:", err);
      }
    });

    bridge.on_notification((jsonNotif: string) => {
      try {
        const notif = JSON.parse(jsonNotif);
        if (typeof window !== "undefined" && Notification.permission === "granted") {
          const senderLocal = notif.sender.split(":")[0].substring(1);
          new Notification(`Vigilant - Secure Chat`, {
            body: `${senderLocal}: ${notif.body}`,
          });
        }
      } catch (err) {
        console.error("Error parsing incoming notification:", err);
      }
    });
  }

  async syncRooms(bridge: any) {
    const store = useMatrixStore.getState();
    try {
      const rawChannels = await bridge.list_joined_rooms();
      const joinedChannels = JSON.parse(rawChannels);
      
      const channelsList: Room[] = joinedChannels.map((c: any) => ({
        id: c.room_id,
        name: c.name,
        topic: "Sync-active Matrix channel",
        type: "channel" as const,
        unreadCount: 0,
        members: [],
        isEncrypted: false,
        createdAt: Date.now(),
      }));

      const rawDMs = await bridge.list_direct_messages();
      const joinedDMs = JSON.parse(rawDMs);
      
      const dmsList: Room[] = joinedDMs.map((dm: any) => ({
        id: dm.room_id,
        name: dm.name,
        topic: "Direct message",
        type: "dm" as const,
        unreadCount: 0,
        members: dm.targets || [],
        isEncrypted: true,
        createdAt: Date.now(),
      }));

      if (channelsList.length > 0 || dmsList.length > 0) {
        store.setRooms([...channelsList, ...dmsList]);
      }
    } catch (err) {
      console.error("Failed to sync rooms from WASM bridge:", err);
    }
  }

  async login(email: string, password: string): Promise<User> {
    const store = useMatrixStore.getState();
    store.setConnecting(true);

    const username = email.includes("@") ? email.split("@")[0] : email;

    try {
      const bridge = await getBridgeInstance();
      if (bridge) {
        console.log(`Attempting login via WASM bridge for: ${username}`);
        await bridge.login(username, password);

        const exportedSession = bridge.export_session();
        if (exportedSession) {
          localStorage.setItem("matrix_session", exportedSession);
        }

        let displayName = username;
        if (typeof window !== "undefined") {
          try {
            const userMap = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");
            if (userMap[email]) displayName = userMap[email];
            else if (userMap[username]) displayName = userMap[username];
          } catch (e) {}
        }

        const loggedUser: User = {
          id: `@${username}:localhost`,
          name: displayName,
          email: email.includes("@") ? email : `${username}@vigilant.co`,
          status: "online",
        };

        localStorage.setItem("vigilant_user", JSON.stringify(loggedUser));
        store.setCurrentUser(loggedUser);

        this.setupCallbacks(bridge);
        bridge.start_sync();
        await this.syncRooms(bridge);
        store.setSynced(true);

        return loggedUser;
      }
    } catch (error: any) {
      console.warn("WASM bridge login failed, switching to local interactive mode:", error);
    }

    // Fallback mode when WASM bridge/homeserver is not active locally
    let displayName = username.charAt(0).toUpperCase() + username.slice(1);
    if (username.toLowerCase() === "harshada" || email.toLowerCase().includes("harshada")) {
      displayName = "Harshada";
    } else if (username.toLowerCase() === "rushikesh" || email.toLowerCase().includes("rushikesh")) {
      displayName = "Rushikesh";
    }

    if (typeof window !== "undefined") {
      try {
        const userMap = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");
        if (userMap[email] && userMap[email] !== "Duplicate Test") displayName = userMap[email];
        else if (userMap[username] && userMap[username] !== "Duplicate Test") displayName = userMap[username];
      } catch (e) {}
    }

    const loggedUser: User = {
      id: `user_${username}`,
      name: displayName,
      email: email.includes("@") ? email : `${username}@vigilant.co`,
      status: "online",
    };

    localStorage.setItem("vigilant_user", JSON.stringify(loggedUser));
    store.setCurrentUser(loggedUser);
    this.loadMockData(store);
    store.setSynced(true);
    store.setConnecting(false);

    return loggedUser;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const store = useMatrixStore.getState();
    store.setConnecting(true);

    const cleanEmail = email.trim().toLowerCase();

    // Check unique email constraint
    if (typeof window !== "undefined") {
      try {
        const userMap = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");
        if (userMap[cleanEmail]) {
          store.setConnecting(false);
          throw new Error("An account with this email address already exists. Please sign in or use a different email.");
        }
      } catch (e: any) {
        if (e.message.includes("already exists")) {
          throw e;
        }
      }
    }

    const username = cleanEmail.includes("@") ? cleanEmail.split("@")[0] : cleanEmail;
    const finalDisplayName = name.trim() || username;

    try {
      const bridge = await getBridgeInstance();
      if (bridge) {
        console.log(`Registering account via WASM bridge for: ${username}`);
        await bridge.register(username, password);
        await bridge.login(username, password);

        const exportedSession = bridge.export_session();
        if (exportedSession) {
          localStorage.setItem("matrix_session", exportedSession);
        }

        const registeredUser: User = {
          id: `@${username}:localhost`,
          name: finalDisplayName,
          email: cleanEmail,
          status: "online",
        };

        if (typeof window !== "undefined") {
          try {
            const userMap = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");
            userMap[cleanEmail] = finalDisplayName;
            userMap[username] = finalDisplayName;
            localStorage.setItem("vigilant_users_map", JSON.stringify(userMap));

            const userList = JSON.parse(localStorage.getItem("vigilant_registered_users") || "[]");
            if (!userList.some((u: User) => u.email === cleanEmail)) {
              userList.push(registeredUser);
              localStorage.setItem("vigilant_registered_users", JSON.stringify(userList));
            }
          } catch (e) {}
        }

        localStorage.setItem("vigilant_user", JSON.stringify(registeredUser));
        store.setCurrentUser(registeredUser);

        this.setupCallbacks(bridge);
        bridge.start_sync();
        await this.syncRooms(bridge);
        store.setSynced(true);

        return registeredUser;
      }
    } catch (error: any) {
      if (error.message && error.message.includes("already exists")) {
        throw error;
      }
      console.warn("WASM bridge registration failed, switching to local interactive mode:", error);
    }

    // Fallback mode when WASM bridge/homeserver is not active locally
    const registeredUser: User = {
      id: `user_${username}`,
      name: finalDisplayName,
      email: cleanEmail,
      status: "online",
    };

    if (typeof window !== "undefined") {
      try {
        const userMap = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");
        userMap[cleanEmail] = finalDisplayName;
        userMap[username] = finalDisplayName;
        localStorage.setItem("vigilant_users_map", JSON.stringify(userMap));

        const userList = JSON.parse(localStorage.getItem("vigilant_registered_users") || "[]");
        if (!userList.some((u: User) => u.email === cleanEmail)) {
          userList.push(registeredUser);
          localStorage.setItem("vigilant_registered_users", JSON.stringify(userList));
        }
      } catch (e) {}
    }

    localStorage.setItem("vigilant_user", JSON.stringify(registeredUser));
    store.setCurrentUser(registeredUser);
    this.loadMockData(store);
    store.setSynced(true);
    store.setConnecting(false);

    return registeredUser;
  }

  destroy() {
    this.isInitialised = false;
    getBridgeInstance().then((bridge) => {
      if (bridge) {
        try {
          bridge.stop_sync();
        } catch (e) {
          console.warn("WASM bridge stop sync error:", e);
        }
      }
    });
  }

  async logout() {
    const store = useMatrixStore.getState();
    try {
      const bridge = await getBridgeInstance();
      if (bridge) {
        bridge.stop_sync();
        await bridge.logout();
      }
    } catch (err) {
      console.error("Error logging out of bridge session:", err);
    } finally {
      this.clearLocalSession();
      store.reset();
      this.isInitialised = false;
    }
  }

  private clearLocalSession() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("matrix_session");
      localStorage.removeItem("vigilant_user");
    }
  }

  async getRoomHistory(roomId: string, limit = 50) {
    const store = useMatrixStore.getState();
    try {
      const bridge = await getBridgeInstance();
      if (!bridge) return;

      const rawHistory = await bridge.get_room_history(roomId, limit);
      const history = JSON.parse(rawHistory);

      const translatedMessages: Message[] = (history.messages || []).map((msg: any) => {
        const senderLocal = msg.sender.split(":")[0].substring(1);
        return {
          id: `${msg.room_id}_${msg.timestamp}_${Math.random().toString(36).substring(2, 7)}`,
          roomId: msg.room_id,
          senderId: msg.sender,
          senderName: senderLocal,
          content: msg.body,
          timestamp: msg.timestamp,
          type: msg.message_type as "text" | "image" | "file",
          isEncrypted: msg.message_uri !== null || msg.mime_type !== null,
          fileName: msg.body.includes(".") ? msg.body : undefined,
        };
      });

      if (translatedMessages.length > 0) {
        store.setMessages(roomId, translatedMessages);
      }
    } catch (err) {
      console.error(`Failed to load room history for ${roomId}:`, err);
    }
  }

  createRoom(name: string, type: "channel" | "dm", topic?: string, isEncrypted = false): Room {
    const store = useMatrixStore.getState();
    const currentUser = store.currentUser;
    const cleanTargetName = name.replace("#", "").trim();

    // Check if DM room between these users already exists
    if (type === "dm") {
      const existingDM = store.rooms.find(
        (r) => r.type === "dm" && (r.name.toLowerCase() === cleanTargetName.toLowerCase() || r.members.some(m => m.toLowerCase().includes(cleanTargetName.toLowerCase())))
      );
      if (existingDM) {
        return existingDM;
      }
    }

    const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;

    // Perform background creation attempt if WASM bridge is active
    getBridgeInstance().then(async (bridge) => {
      if (bridge) {
        try {
          if (type === "channel") {
            const rId = await bridge.create_room(cleanTargetName);
            await bridge.join_room(rId);
          } else {
            const targetUserId = cleanTargetName.includes(":") ? cleanTargetName : `@${cleanTargetName}:localhost`;
            await bridge.get_or_create_direct_message(targetUserId);
          }
        } catch (e) {
          console.warn("WASM bridge room creation skipped:", e);
        }
      }
    });

    // Lookup target user metadata for DM rooms
    let membersList = currentUser ? [currentUser.id, currentUser.name] : [];
    if (type === "dm") {
      membersList.push(cleanTargetName);
      const targetUserObj = store.users.find(
        (u) => u.name.toLowerCase() === cleanTargetName.toLowerCase() || u.email.toLowerCase() === cleanTargetName.toLowerCase()
      );
      if (targetUserObj) {
        membersList.push(targetUserObj.id, targetUserObj.name);
      }
    }

    const newRoom: Room = {
      id: roomId,
      name: cleanTargetName,
      topic: topic || "",
      type,
      unreadCount: 0,
      members: Array.from(new Set(membersList)),
      isEncrypted: isEncrypted || type === "dm",
      createdAt: Date.now(),
    };

    store.addRoom(newRoom);

    // Save to shared rooms in local storage
    if (typeof window !== "undefined") {
      try {
        const sharedRooms: Room[] = JSON.parse(localStorage.getItem("vigilant_shared_rooms") || "[]");
        if (!sharedRooms.some((r) => r.id === newRoom.id)) {
          sharedRooms.push(newRoom);
          localStorage.setItem("vigilant_shared_rooms", JSON.stringify(sharedRooms));
        }
      } catch (e) {}
    }

    store.setMessages(roomId, []);
    return newRoom;
  }

  leaveRoom(roomId: string) {
    const store = useMatrixStore.getState();
    getBridgeInstance().then(async (bridge) => {
      if (bridge) {
        try {
          await bridge.leave_room(roomId);
        } catch (e) {
          console.warn("WASM bridge leave room error:", e);
        }
      }
    });
    store.leaveRoom(roomId);
  }

  sendMessage(
    roomId: string,
    content: string,
    type: "text" | "image" | "file" = "text",
    fileName?: string,
    fileUrl?: string,
    fileData?: Uint8Array
  ) {
    const store = useMatrixStore.getState();
    const currentUser = store.currentUser;

    if (!currentUser) return;

    const newMessage: Message = {
      id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      roomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      content,
      timestamp: Date.now(),
      type,
      fileName,
      fileUrl,
      isEncrypted: store.rooms.find((r) => r.id === roomId)?.isEncrypted || false,
    };

    store.addMessage(roomId, newMessage);

    // Save message to shared local storage across sessions
    if (typeof window !== "undefined") {
      try {
        const roomKey = `vigilant_shared_messages_${roomId}`;
        const existing: Message[] = JSON.parse(localStorage.getItem(roomKey) || "[]");
        existing.push(newMessage);
        localStorage.setItem(roomKey, JSON.stringify(existing));
        window.dispatchEvent(new Event("vigilant_message_sent"));
      } catch (e) {}
    }

    // Perform WASM bridge background send if active
    getBridgeInstance().then(async (bridge) => {
      if (bridge) {
        try {
          if (type === "text") {
            await bridge.send_message(roomId, content);
          } else if (type === "image" && fileData && fileName) {
            const mimeType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";
            await bridge.send_image(roomId, fileData, fileName, mimeType);
          } else if (type === "file" && fileData && fileName) {
            await bridge.send_file(roomId, fileData, fileName, "application/pdf");
          }
        } catch (e) {
          console.warn("WASM bridge message send error:", e);
        }
      }
    });
  }
}

export const matrixService = new MatrixService();
export default matrixService;
