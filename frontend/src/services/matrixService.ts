import { useMatrixStore, User, Room, Message } from "../store/matrixStore";

let bridgeInstance: any = null;

// Dynamic wrapper to safely import WASM on the client side only
async function getBridgeInstance() {
  if (typeof window === "undefined") return null;
  if (bridgeInstance) return bridgeInstance;

  try {
    const wasm = await import("@seucra/matrix-sdk-bridge");
    await wasm.default(); // Initialize WASM compilation
    
    // Fall back to localhost:8008 if process env is not specified
    const homeserverUrl = process.env.NEXT_PUBLIC_HOMESERVER_URL || "http://localhost:8008";
    console.log("Initializing Matrix WASM bridge targeting:", homeserverUrl);
    
    bridgeInstance = await wasm.MatrixBridge.init(homeserverUrl);
    return bridgeInstance;
  } catch (error) {
    console.error("Failed to initialize Matrix WASM SDK Bridge:", error);
    throw new Error("Matrix WASM client initialization failed. Please make sure the homeserver is online.");
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
      const bridge = await getBridgeInstance();
      if (!bridge) return;

      const savedSession = localStorage.getItem("matrix_session");
      const savedUserJson = localStorage.getItem("vigilant_user");

      if (savedSession && savedUserJson) {
        console.log("Restoring active Matrix session...");
        await bridge.restore_session(savedSession);
        
        const currentUser = JSON.parse(savedUserJson);
        store.setCurrentUser(currentUser);
        
        // Register callbacks & start syncing
        this.setupCallbacks(bridge);
        bridge.start_sync();
        
        await this.syncRooms(bridge);
        store.setSynced(true);
      }
    } catch (error) {
      console.error("Failed to restore session or start sync:", error);
      // Clear session if token is expired/invalid (M_UNKNOWN_TOKEN)
      this.clearLocalSession();
    } finally {
      store.setConnecting(false);
    }
  }

  private setupCallbacks(bridge: any) {
    const store = useMatrixStore.getState();

    // Handle real-time incoming messages
    bridge.on_message((jsonMsg: string) => {
      try {
        const msg = JSON.parse(jsonMsg);
        
        // Check if message is already in our store to avoid duplicates
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

    // Handle real-time system notifications
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
      // 1. Fetch joined public channels
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

      // 2. Fetch direct message rooms
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

      store.setRooms([...channelsList, ...dmsList]);
    } catch (err) {
      console.error("Failed to sync channels/DMs from WASM bridge:", err);
    }
  }

  async login(email: string, password: string): Promise<User> {
    const bridge = await getBridgeInstance();
    const store = useMatrixStore.getState();

    store.setConnecting(true);

    try {
      // Extract local username part if an email is provided
      const username = email.includes("@") ? email.split("@")[0] : email;
      console.log(`Attempting login for user: ${username}`);
      
      await bridge.login(username, password);

      // Save credentials and session to local storage
      const exportedSession = bridge.export_session();
      if (exportedSession) {
        localStorage.setItem("matrix_session", exportedSession);
      }

      const loggedUser: User = {
        id: `@${username}:localhost`, // Estimate Matrix ID representation
        name: username,
        email: email.includes("@") ? email : `${username}@vigilant.co`,
        status: "online",
      };

      localStorage.setItem("vigilant_user", JSON.stringify(loggedUser));
      store.setCurrentUser(loggedUser);

      // Register callbacks and initiate synchronization
      this.setupCallbacks(bridge);
      bridge.start_sync();

      await this.syncRooms(bridge);
      store.setSynced(true);

      return loggedUser;
    } catch (error: any) {
      console.error("Login failed via WASM bridge:", error);
      throw new Error(error?.message || "Invalid credentials or homeserver unreachable.");
    } finally {
      store.setConnecting(false);
    }
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const bridge = await getBridgeInstance();
    const store = useMatrixStore.getState();

    store.setConnecting(true);

    try {
      // Extract local username part from corporate email
      const username = email.includes("@") ? email.split("@")[0] : email;
      console.log(`Registering account for username: ${username}`);
      
      await bridge.register(username, password);
      
      // Auto login after successful registration
      await bridge.login(username, password);

      const exportedSession = bridge.export_session();
      if (exportedSession) {
        localStorage.setItem("matrix_session", exportedSession);
      }

      const registeredUser: User = {
        id: `@${username}:localhost`,
        name: name,
        email: email,
        status: "online",
      };

      localStorage.setItem("vigilant_user", JSON.stringify(registeredUser));
      store.setCurrentUser(registeredUser);

      // Set callbacks & start syncing
      this.setupCallbacks(bridge);
      bridge.start_sync();

      await this.syncRooms(bridge);
      store.setSynced(true);

      return registeredUser;
    } catch (error: any) {
      console.error("Registration failed via WASM bridge:", error);
      throw new Error(error?.message || "Registration failed. Try a different username or verify if the homeserver is running.");
    } finally {
      store.setConnecting(false);
    }
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

      console.log(`Loading history for room: ${roomId}`);
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

      store.setMessages(roomId, translatedMessages);
    } catch (err) {
      console.error(`Failed to load room history for ${roomId}:`, err);
    }
  }

  async loadMoreHistory(roomId: string, limit = 50) {
    const store = useMatrixStore.getState();
    try {
      const bridge = await getBridgeInstance();
      if (!bridge) return;

      const rawHistory = await bridge.load_more_history(roomId, limit);
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

      const currentMessages = store.messages[roomId] || [];
      store.setMessages(roomId, [...translatedMessages, ...currentMessages]);
    } catch (err) {
      console.error(`Failed to load more history for ${roomId}:`, err);
    }
  }

  async createRoom(name: string, type: "channel" | "dm", topic?: string, isEncrypted = false): Promise<Room> {
    const bridge = await getBridgeInstance();
    const store = useMatrixStore.getState();
    const currentUser = store.currentUser;

    if (!bridge) throw new Error("Matrix bridge is not initialized.");

    try {
      let roomId = "";

      if (type === "channel") {
        roomId = await bridge.create_room(name.replace("#", "").trim());
        // Auto-join the channel
        await bridge.join_room(roomId);
      } else {
        // Direct messages: resolve target Matrix user
        const targetUserId = name.includes(":") ? name : `@${name}:localhost`;
        roomId = await bridge.get_or_create_direct_message(targetUserId);
      }

      const newRoom: Room = {
        id: roomId,
        name: name.replace("#", "").trim(),
        topic: topic || "",
        type,
        unreadCount: 0,
        members: currentUser ? [currentUser.id, name] : [name],
        isEncrypted: isEncrypted || type === "dm",
        createdAt: Date.now(),
      };

      store.addRoom(newRoom);
      store.setMessages(roomId, []);
      
      // Refresh room list
      await this.syncRooms(bridge);

      return newRoom;
    } catch (err: any) {
      console.error("Failed to create room via WASM bridge:", err);
      throw new Error(err?.message || "Failed to create channel/DM.");
    }
  }

  async leaveRoom(roomId: string) {
    const store = useMatrixStore.getState();
    try {
      const bridge = await getBridgeInstance();
      if (bridge) {
        await bridge.leave_room(roomId);
        store.leaveRoom(roomId);
      }
    } catch (err) {
      console.error(`Failed to leave room ${roomId} via WASM bridge:`, err);
    }
  }

  async sendMessage(
    roomId: string,
    content: string,
    type: "text" | "image" | "file" = "text",
    fileName?: string,
    fileData?: Uint8Array
  ) {
    const bridge = await getBridgeInstance();
    if (!bridge) return;

    try {
      if (type === "text") {
        await bridge.send_message(roomId, content);
      } else if (type === "image" && fileData && fileName) {
        const mimeType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";
        await bridge.send_image(roomId, fileData, fileName, mimeType);
      } else if (type === "file" && fileData && fileName) {
        await bridge.send_file(roomId, fileData, fileName, "application/pdf");
      }
    } catch (err) {
      console.error(`Failed to send message to room ${roomId}:`, err);
    }
  }

  async downloadMedia(mediaSourceJson: string): Promise<Uint8Array | null> {
    try {
      const bridge = await getBridgeInstance();
      if (!bridge) return null;
      return await bridge.get_media(mediaSourceJson);
    } catch (err) {
      console.error("Failed to retrieve media via WASM bridge:", err);
      return null;
    }
  }
}

export const matrixService = new MatrixService();
export default matrixService;
