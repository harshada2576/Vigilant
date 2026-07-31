/**
 * matrixService.ts
 *
 * Frontend integration layer for @seucra/matrix-sdk-bridge (WebAssembly).
 * Follows the Vigilant Matrix SDK Bridge API Reference (Backend Cycle 1 · v0.1).
 *
 * Key API contract notes from the docs:
 * - register(username, password): Creates and AUTOMATICALLY authenticates the session.
 *   Do NOT call login() after register() — the bridge is already authenticated.
 * - login(username, password): Authenticates an existing account.
 * - export_session() / restore_session(): Used for session persistence across reloads.
 * - Callbacks (on_message, on_notification) must be registered BEFORE start_sync().
 */

import { useMatrixStore, User, Room, Message } from "../store/matrixStore";

let bridgeInstance: any = null;

// Default workspace channels (no mock users, no mock messages — Synapse is authoritative)
const DEFAULT_CHANNELS: Room[] = [
  {
    id: "room_general",
    name: "general",
    topic: "Company-wide discussions and watercooler talk",
    type: "channel",
    unreadCount: 0,
    members: [],
    isEncrypted: false,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "room_announcements",
    name: "announcements",
    topic: "Important announcements and policy updates",
    type: "channel",
    unreadCount: 0,
    members: [],
    isEncrypted: false,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: "room_security",
    name: "security-compliance 🔒",
    topic: "E2E Encrypted channel for secure audits, keys and key escrow discussion",
    type: "channel",
    unreadCount: 0,
    members: [],
    isEncrypted: true,
    createdAt: Date.now() - 86400000 * 3,
  },
];

/**
 * Validate that an email is syntactically valid — any domain is allowed.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Resolve the homeserver URL.
 * Uses NEXT_PUBLIC_HOMESERVER_URL env var if set, otherwise defaults to http://localhost:8008.
 */
function resolveHomeserverUrl(): string {
  return process.env.NEXT_PUBLIC_HOMESERVER_URL || "http://localhost:8008";
}

/**
 * Lazy-loads and initializes the WASM bridge (singleton).
 * WASM binary must exist at /matrix_sdk_bridge_bg.wasm (public/).
 * The postinstall script in package.json copies it there automatically.
 */
async function getBridgeInstance(): Promise<any | null> {
  if (typeof window === "undefined") return null;
  if (bridgeInstance) return bridgeInstance;

  try {
    const wasm = await import("@seucra/matrix-sdk-bridge");
    // Load static WASM from public/ (copied by postinstall script)
    await wasm.default({ module_or_path: "/matrix_sdk_bridge_bg.wasm" });

    const homeserverUrl = resolveHomeserverUrl();
    console.log("[MatrixBridge] Initializing → targeting homeserver:", homeserverUrl);
    bridgeInstance = await wasm.MatrixBridge.init(homeserverUrl);
    return bridgeInstance;
  } catch (error) {
    console.warn("[MatrixBridge] WASM bridge unavailable, using local fallback mode:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------

class MatrixService {
  private isInitialised = false;
  private crossTabSyncCleanup: (() => void) | null = null;

  /**
   * Called once on dashboard mount.
   * Restores session from SESSIONSTORAGE (tab-scoped — each tab has its own user).
   * Uses localStorage only for shared data: registered users, rooms, messages.
   */
  async init() {
    if (typeof window === "undefined" || this.isInitialised) return;
    this.isInitialised = true;

    const store = useMatrixStore.getState();
    store.setConnecting(true);

    try {
      // ✅ sessionStorage is TAB-SCOPED — Tab 1 and Tab 2 never share this key
      const savedUserJson = sessionStorage.getItem("vigilant_user");
      if (!savedUserJson) {
        store.setConnecting(false);
        return;
      }

      const currentUser: User = JSON.parse(savedUserJson);
      store.setCurrentUser(currentUser);
      this.hydrateLocalData(store);

      // Start cross-tab user list sync (picks up newly registered users in other tabs)
      this.startCrossTabSync(store);

      const bridge = await getBridgeInstance();
      // ✅ matrix_session is also tab-scoped
      const savedSession = sessionStorage.getItem("matrix_session");

      if (bridge && savedSession) {
        try {
          console.log("[MatrixBridge] Restoring session…");
          await bridge.restore_session(savedSession);
          // Register callbacks before sync (per API lifecycle doc)
          this.registerCallbacks(bridge, store);
          bridge.start_sync();
          await this.fetchRoomsFromBridge(bridge, store);
        } catch (e) {
          console.warn("[MatrixBridge] Session restore failed, using local state:", e);
          // Clear corrupted session
          sessionStorage.removeItem("matrix_session");
        }
      }

      store.setSynced(true);
    } catch (error) {
      console.error("[MatrixService] init error:", error);
    } finally {
      store.setConnecting(false);
    }
  }

  /**
   * Listen for cross-tab localStorage changes:
   * - vigilant_registered_users: another tab registered a new user → update users list live
   * - vigilant_shared_messages_*: another tab/user sent a message → handled by syncRoomMessages
   */
  /**
   * Listen for cross-tab localStorage changes:
   * - vigilant_registered_users: another tab registered a new user → update users list live
   * - vigilant_shared_rooms: another tab/user created a DM with current user → hydrate rooms live
   * - vigilant_shared_messages_*: another tab/user sent a message → sync room messages live
   */
  private startCrossTabSync(store: any) {
    const handler = (event: StorageEvent) => {
      if (event.key === "vigilant_registered_users" && event.newValue) {
        try {
          const updatedUsers: User[] = JSON.parse(event.newValue);
          const currentUser = store.currentUser as User | null;
          const allUsers = updatedUsers.some(
            (u) => u.email.toLowerCase() === currentUser?.email?.toLowerCase()
          )
            ? updatedUsers
            : currentUser
            ? [...updatedUsers, currentUser]
            : updatedUsers;
          useMatrixStore.getState().setUsers(allUsers);
        } catch (e) {}
      }

      if (event.key === "vigilant_shared_rooms" && event.newValue) {
        try {
          const liveStore = useMatrixStore.getState();
          if (liveStore.currentUser) {
            this.hydrateLocalData(liveStore);
          }
        } catch (e) {}
      }

      if (event.key?.startsWith("vigilant_shared_messages_")) {
        const roomId = event.key.replace("vigilant_shared_messages_", "");
        if (roomId) {
          this.syncRoomMessages(roomId);
        }
      }
    };

    window.addEventListener("storage", handler);
    this.crossTabSyncCleanup = () => window.removeEventListener("storage", handler);
  }

  // ---------------------------------------------------------------------------
  // Local data hydration (only real registered users + saved rooms/messages)
  // ---------------------------------------------------------------------------

  private hydrateLocalData(store: any) {
    const currentUser: User | null = store.currentUser;

    // Users: only those who have actually registered via this app
    const registeredUsers: User[] = this.loadRegisteredUsers();
    const allUsers = registeredUsers.some(
      (u) => u.email.toLowerCase() === currentUser?.email?.toLowerCase()
    )
      ? registeredUsers
      : currentUser
      ? [...registeredUsers, currentUser]
      : registeredUsers;
    store.setUsers(allUsers);

    // Rooms: default channels + any user-created rooms from localStorage
    const savedRooms: Room[] = this.loadSavedRooms();

    // Clean duplicate DMs from localStorage
    const cleanedSavedRooms = this.deduplicateRooms(savedRooms);
    if (cleanedSavedRooms.length !== savedRooms.length) {
      try {
        localStorage.setItem("vigilant_shared_rooms", JSON.stringify(cleanedSavedRooms));
      } catch (e) {}
    }

    const allRooms = this.mergeRooms(DEFAULT_CHANNELS, cleanedSavedRooms);

    // Filter DMs to only show rooms the current user is a member of
    const visibleRooms = currentUser
      ? allRooms.filter((room) => {
          if (room.type === "channel") return true;
          const uId = currentUser.id.toLowerCase();
          const uName = currentUser.name.toLowerCase();
          const uEmail = currentUser.email.toLowerCase();
          const uUsername = uEmail.split("@")[0].toLowerCase();

          return room.members.some((m) => {
            const low = m.toLowerCase();
            return (
              low === uId ||
              low === uName ||
              low === uEmail ||
              low === uUsername ||
              low.startsWith(`@${uUsername}:`)
            );
          });
        })
      : allRooms;

    store.setRooms(visibleRooms);

    // Messages: load from localStorage for each visible room
    visibleRooms.forEach((r) => {
      const saved = localStorage.getItem(`vigilant_shared_messages_${r.id}`);
      if (saved) {
        try {
          store.setMessages(r.id, JSON.parse(saved));
        } catch (e) {}
      }
    });
  }

  /** Deduplicate rooms: by ID for all rooms, by member fingerprint for DMs */
  private deduplicateRooms(rooms: Room[]): Room[] {
    const seen = new Set<string>();
    const dmSeen = new Set<string>();
    const result: Room[] = [];
    for (const room of rooms) {
      if (seen.has(room.id)) continue;
      seen.add(room.id);
      if (room.type === "dm") {
        const fp = room.members.map((m) => m.toLowerCase()).sort().join("|");
        if (fp && dmSeen.has(fp)) continue;
        if (fp) dmSeen.add(fp);
      }
      result.push(room);
    }
    return result;
  }

  private loadRegisteredUsers(): User[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("vigilant_registered_users") || "[]");
    } catch {
      return [];
    }
  }

  private loadSavedRooms(): Room[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("vigilant_shared_rooms") || "[]");
    } catch {
      return [];
    }
  }

  private mergeRooms(base: Room[], extra: Room[]): Room[] {
    const merged = [...base];
    extra.forEach((r) => {
      if (!merged.some((b) => b.id === r.id)) merged.push(r);
    });
    return merged;
  }

  // ---------------------------------------------------------------------------
  // WASM bridge callbacks (registered before start_sync per API doc)
  // ---------------------------------------------------------------------------

  private registerCallbacks(bridge: any, _store: any) {
    bridge.on_message((jsonMsg: string) => {
      try {
        const msg = JSON.parse(jsonMsg);

        // Always read LIVE store state
        const liveStore = useMatrixStore.getState();
        const existing: Message[] = liveStore.messages[msg.room_id] || [];

        // Deduplicate: same sender + same timestamp + same body
        const isDuplicate = existing.some(
          (m) =>
            m.timestamp === msg.timestamp &&
            m.senderId === msg.sender &&
            m.content === msg.body
        );
        if (isDuplicate) return;

        const senderUsername = msg.sender.split(":")[0].replace("@", "");
        const senderUser = liveStore.users.find(
          (u) =>
            u.id.toLowerCase() === msg.sender.toLowerCase() ||
            u.email.split("@")[0].toLowerCase() === senderUsername.toLowerCase()
        );
        const senderName = senderUser ? senderUser.name : senderUsername;
        const isFileMsg = msg.message_type === "image" || msg.message_type === "file";

        // Auto-add DM room to recipient's sidebar if not present yet
        const roomExists = liveStore.rooms.some((r) => r.id === msg.room_id);
        if (!roomExists && liveStore.currentUser) {
          const newRoom: Room = {
            id: msg.room_id,
            name: senderName,
            topic: "",
            type: "dm",
            unreadCount: 1,
            members: [liveStore.currentUser.id, msg.sender, senderUsername],
            isEncrypted: true,
            createdAt: msg.timestamp || Date.now(),
          };
          liveStore.addRoom(newRoom);
        }

        const message: Message = {
          id: `${msg.room_id}_${msg.timestamp}_${Math.random().toString(36).slice(2, 7)}`,
          roomId: msg.room_id,
          senderId: msg.sender,
          senderName,
          content: isFileMsg ? (msg.filename || msg.body || "") : msg.body,
          timestamp: msg.timestamp,
          type: msg.message_type as "text" | "image" | "file",
          isEncrypted: Boolean(msg.message_uri || msg.mime_type),
          fileName: isFileMsg ? (msg.filename || msg.body) : undefined,
          fileUrl: isFileMsg ? (msg.message_uri || undefined) : undefined,
        };

        liveStore.addMessage(msg.room_id, message);

        // Also persist incoming messages so the recipient's reload retains them
        try {
          const key = `vigilant_shared_messages_${msg.room_id}`;
          const persisted: Message[] = JSON.parse(localStorage.getItem(key) || "[]");
          const alreadyPersisted = persisted.some(
            (m) => m.timestamp === message.timestamp && m.senderId === message.senderId && m.content === message.content
          );
          if (!alreadyPersisted) {
            persisted.push(message);
            localStorage.setItem(key, JSON.stringify(persisted));
          }
        } catch (e) {}
      } catch (err) {
        console.error("[MatrixBridge] on_message parse error:", err);
      }
    });

    bridge.on_notification((jsonNotif: string) => {
      try {
        const notif = JSON.parse(jsonNotif);
        if (Notification.permission === "granted") {
          const sender = notif.sender.split(":")[0].replace("@", "");
          new Notification("Vigilant — New Message", { body: `${sender}: ${notif.body}` });
        }
      } catch (err) {
        console.error("[MatrixBridge] on_notification parse error:", err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Sync rooms from Synapse via bridge
  // ---------------------------------------------------------------------------

  async fetchRoomsFromBridge(bridge: any, store: any) {
    try {
      const rawChannels = await bridge.list_joined_rooms();
      const bridgeChannels: Room[] = JSON.parse(rawChannels).map((c: any) => ({
        id: c.room_id,
        name: c.name || c.room_id,
        topic: "",
        type: "channel" as const,
        unreadCount: 0,
        members: [],
        isEncrypted: false,
        createdAt: Date.now(),
      }));

      const rawDMs = await bridge.list_direct_messages();
      const bridgeDMs: Room[] = JSON.parse(rawDMs).map((dm: any) => ({
        id: dm.room_id,
        name: dm.name || dm.room_id,
        topic: "",
        type: "dm" as const,
        unreadCount: 0,
        members: dm.targets || [],
        isEncrypted: true,
        createdAt: Date.now(),
      }));

      if (bridgeChannels.length > 0 || bridgeDMs.length > 0) {
        // MERGE with existing local rooms — do not overwrite (preserves locally-created rooms)
        const existing = store.rooms as Room[];
        const merged = [...existing];
        [...bridgeChannels, ...bridgeDMs].forEach((r) => {
          if (!merged.some((e) => e.id === r.id)) merged.push(r);
        });
        store.setRooms(merged);

        // Persist merged rooms
        try {
          const savedRooms = this.loadSavedRooms();
          const finalSaved = [...savedRooms];
          merged.forEach((r) => {
            if (!finalSaved.some((s) => s.id === r.id)) finalSaved.push(r);
          });
          localStorage.setItem("vigilant_shared_rooms", JSON.stringify(finalSaved));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("[MatrixBridge] fetchRoomsFromBridge failed:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // Periodic message sync (local storage → store, for same-browser cross-tab)
  // ---------------------------------------------------------------------------

  syncRoomMessages(roomId: string) {
    if (typeof window === "undefined") return;
    const store = useMatrixStore.getState();
    const saved = localStorage.getItem(`vigilant_shared_messages_${roomId}`);
    if (!saved) return;
    try {
      const parsed: Message[] = JSON.parse(saved);
      if (parsed.length === 0) return;
      const current = store.messages[roomId] || [];

      // Build a Set of existing message fingerprints for O(1) dedup
      const existingKeys = new Set(
        current.map((m) => `${m.senderId}|${m.timestamp}|${m.content}`)
      );

      const newMessages = parsed.filter(
        (p) => !existingKeys.has(`${p.senderId}|${p.timestamp}|${p.content}`)
      );
      if (newMessages.length === 0) return;

      const merged = [...current, ...newMessages].sort((a, b) => a.timestamp - b.timestamp);
      store.setMessages(roomId, merged);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  async login(email: string, password: string): Promise<User> {
    const store = useMatrixStore.getState();
    store.setConnecting(true);

    if (!isValidEmail(email)) {
      store.setConnecting(false);
      throw new Error("Please enter a valid email address.");
    }

    const username = email.split("@")[0].toLowerCase();

    // Attempt Synapse login via WASM bridge
    try {
      const bridge = await getBridgeInstance();
      if (bridge) {
        console.log(`[MatrixBridge] login() → username: ${username}`);
        await bridge.login(username, password);

        const session = bridge.export_session();
        // ✅ Tab-scoped: sessionStorage so other tabs keep their own sessions
        if (session) sessionStorage.setItem("matrix_session", session);

        const displayName = this.resolveDisplayName(email, username);
        const user: User = {
          id: `@${username}:${this.matrixDomain()}`,
          name: displayName,
          email,
          status: "online",
        };

        // ✅ Tab-scoped: sessionStorage keeps this user only in this tab
        sessionStorage.setItem("vigilant_user", JSON.stringify(user));
        store.setCurrentUser(user);

        this.startCrossTabSync(store);
        this.registerCallbacks(bridge, store);
        bridge.start_sync();
        await this.fetchRoomsFromBridge(bridge, store);
        store.setSynced(true);
        store.setConnecting(false);
        return user;
      }
    } catch (error: any) {
      console.warn("[MatrixBridge] login() failed:", error?.message || error);
      if (
        error?.message?.includes("M_FORBIDDEN") ||
        error?.message?.includes("Invalid") ||
        error?.message?.includes("forbidden")
      ) {
        store.setConnecting(false);
        throw new Error("Invalid email or password. Please try again.");
      }
    }

    // Local fallback mode (Synapse not reachable — still requires email registered locally)
    const registered = this.loadRegisteredUsers();
    const found = registered.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      store.setConnecting(false);
      throw new Error("No account found for this email. Please register first.");
    }

    // ✅ Tab-scoped
    sessionStorage.setItem("vigilant_user", JSON.stringify(found));
    store.setCurrentUser(found);
    this.startCrossTabSync(store);
    this.hydrateLocalData(store);
    store.setSynced(true);
    store.setConnecting(false);
    return found;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const store = useMatrixStore.getState();
    store.setConnecting(true);

    if (!isValidEmail(email)) {
      store.setConnecting(false);
      throw new Error("Please enter a valid email address.");
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = this.loadRegisteredUsers();
    if (existing.some((u) => u.email.toLowerCase() === cleanEmail)) {
      store.setConnecting(false);
      throw new Error(
        "An account with this email already exists. Please sign in or use a different email."
      );
    }

    const username = cleanEmail.split("@")[0];
    const displayName = name.trim() || username.charAt(0).toUpperCase() + username.slice(1);

    try {
      const bridge = await getBridgeInstance();
      if (bridge) {
        console.log(`[MatrixBridge] register() → username: ${username}`);
        await bridge.register(username, password);

        const session = bridge.export_session();
        // ✅ Tab-scoped
        if (session) sessionStorage.setItem("matrix_session", session);

        const user: User = {
          id: `@${username}:${this.matrixDomain()}`,
          name: displayName,
          email: cleanEmail,
          status: "online",
        };

        this.persistUserRegistration(user);
        // ✅ Tab-scoped
        sessionStorage.setItem("vigilant_user", JSON.stringify(user));
        store.setCurrentUser(user);

        this.startCrossTabSync(store);
        this.registerCallbacks(bridge, store);
        bridge.start_sync();
        await this.fetchRoomsFromBridge(bridge, store);
        store.setSynced(true);
        store.setConnecting(false);
        return user;
      }
    } catch (error: any) {
      if (
        error?.message?.includes("already exists") ||
        error?.message?.includes("M_USER_IN_USE")
      ) {
        store.setConnecting(false);
        throw new Error(
          "An account with this username already exists on the server. Please sign in."
        );
      }
      console.warn("[MatrixBridge] register() failed, using local fallback:", error?.message || error);
    }

    const user: User = {
      id: `@${username}:${this.matrixDomain()}`,
      name: displayName,
      email: cleanEmail,
      status: "online",
    };

    this.persistUserRegistration(user);
    // ✅ Tab-scoped
    sessionStorage.setItem("vigilant_user", JSON.stringify(user));
    store.setCurrentUser(user);
    this.startCrossTabSync(store);
    this.hydrateLocalData(store);
    store.setSynced(true);
    store.setConnecting(false);
    return user;
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
      console.warn("[MatrixBridge] logout error:", err);
    } finally {
      // ✅ Clear only tab-scoped session — leave shared localStorage untouched
      sessionStorage.removeItem("matrix_session");
      sessionStorage.removeItem("vigilant_user");
      this.crossTabSyncCleanup?.();
      this.crossTabSyncCleanup = null;
      store.reset();
      this.isInitialised = false;
      bridgeInstance = null;
    }
  }

  destroy() {
    // Intentionally left minimal — stop_sync is called during logout
    // Removing matrixService.destroy() from layout.tsx cleanup is recommended (per integration notes)
    this.isInitialised = false;
  }

  // ---------------------------------------------------------------------------
  // Room management
  // ---------------------------------------------------------------------------

  async createRoom(
    targetInput: string,
    type: "channel" | "dm",
    topic?: string,
    isEncrypted = false
  ): Promise<Room> {
    const store = useMatrixStore.getState();
    const currentUser = store.currentUser;
    const cleanInput = targetInput.replace("#", "").trim();

    if (type === "dm") {
      const inputLower = cleanInput.toLowerCase();
      // Find exact target user in store
      const targetUser = store.users.find(
        (u) =>
          u.id.toLowerCase() === inputLower ||
          u.email.toLowerCase() === inputLower ||
          u.name.toLowerCase() === inputLower ||
          u.id.toLowerCase().startsWith(`@${inputLower}:`)
      );

      const targetId = targetUser
        ? targetUser.id
        : cleanInput.includes(":")
        ? cleanInput
        : `@${cleanInput.toLowerCase()}:${this.matrixDomain()}`;

      const targetEmail = targetUser ? targetUser.email.toLowerCase() : "";
      const targetName = targetUser ? targetUser.name : cleanInput;

      // Check if a DM with this exact user already exists
      const existing = store.rooms.find((r) => {
        if (r.type !== "dm") return false;
        const memberLowers = r.members.map((m) => m.toLowerCase());
        return (
          memberLowers.includes(targetId.toLowerCase()) ||
          (targetEmail && memberLowers.includes(targetEmail)) ||
          r.name.toLowerCase() === targetName.toLowerCase()
        );
      });
      if (existing) return existing;

      let roomId = `room_${Math.random().toString(36).slice(2, 9)}`;

      // Try bridge room creation
      try {
        const bridge = await getBridgeInstance();
        if (bridge) {
          const dmId = await bridge.get_or_create_direct_message(targetId);
          if (dmId) roomId = dmId;
        }
      } catch (e) {
        console.warn("[MatrixBridge] createRoom bridge call skipped:", e);
      }

      const members: string[] = currentUser
        ? [currentUser.id, currentUser.name, currentUser.email]
        : [];
      members.push(targetId, targetName);
      if (targetEmail) members.push(targetEmail);

      const newRoom: Room = {
        id: roomId,
        name: targetName,
        topic: topic || "",
        type: "dm",
        unreadCount: 0,
        members: Array.from(new Set(members)),
        isEncrypted: isEncrypted || true,
        createdAt: Date.now(),
      };

      store.addRoom(newRoom);

      try {
        const saved = this.loadSavedRooms();
        if (!saved.some((r) => r.id === newRoom.id)) {
          saved.push(newRoom);
          localStorage.setItem("vigilant_shared_rooms", JSON.stringify(saved));
        }
      } catch (e) {}

      store.setMessages(roomId, []);
      return newRoom;
    }

    // Channel room creation
    let roomId = `room_${Math.random().toString(36).slice(2, 9)}`;
    try {
      const bridge = await getBridgeInstance();
      if (bridge) {
        const rId = await bridge.create_room(cleanInput);
        if (rId) roomId = rId;
        await bridge.join_room(roomId);
      }
    } catch (e) {
      console.warn("[MatrixBridge] createRoom bridge call skipped:", e);
    }

    const members: string[] = currentUser
      ? [currentUser.id, currentUser.name]
      : [];

    const newRoom: Room = {
      id: roomId,
      name: cleanInput,
      topic: topic || "",
      type: "channel",
      unreadCount: 0,
      members: Array.from(new Set(members)),
      isEncrypted,
      createdAt: Date.now(),
    };

    store.addRoom(newRoom);

    try {
      const saved = this.loadSavedRooms();
      if (!saved.some((r) => r.id === newRoom.id)) {
        saved.push(newRoom);
        localStorage.setItem("vigilant_shared_rooms", JSON.stringify(saved));
      }
    } catch (e) {}

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
          console.warn("[MatrixBridge] leaveRoom error:", e);
        }
      }
    });
    store.leaveRoom(roomId);
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

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

    const msg: Message = {
      id: `msg_${Math.random().toString(36).slice(2, 9)}`,
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

    store.addMessage(roomId, msg);

    // Persist for cross-tab sync
    try {
      const key = `vigilant_shared_messages_${roomId}`;
      const existing: Message[] = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(msg);
      localStorage.setItem(key, JSON.stringify(existing));
      window.dispatchEvent(new Event("vigilant_message_sent"));
    } catch (e) {}

    // Send via WASM bridge (background)
    getBridgeInstance().then(async (bridge) => {
      if (!bridge) return;
      try {
        // Matrix room IDs must start with '!' sigil for the Matrix Rust SDK
        if (!roomId.startsWith("!")) return;

        if (type === "text") {
          await bridge.send_message(roomId, content);
        } else if (type === "image" && fileData && fileName) {
          const mime = fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
          await bridge.send_image(roomId, fileData, fileName, mime);
        } else if (type === "file" && fileData && fileName) {
          await bridge.send_file(roomId, fileData, fileName, "application/pdf");
        }
      } catch (e) {
        console.warn("[MatrixBridge] sendMessage bridge error:", e);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Room history (WASM bridge)
  // ---------------------------------------------------------------------------

  async getRoomHistory(roomId: string, limit = 50) {
    const store = useMatrixStore.getState();
    const bridge = await getBridgeInstance();
    if (!bridge) return;
    try {
      const raw = await bridge.get_room_history(roomId, limit);
      const history = JSON.parse(raw);
      const messages: Message[] = (history.messages || []).map((m: any) => ({
        id: `${m.room_id}_${m.timestamp}_${Math.random().toString(36).slice(2, 7)}`,
        roomId: m.room_id,
        senderId: m.sender,
        senderName: m.sender.split(":")[0].replace("@", ""),
        content: m.body,
        timestamp: m.timestamp,
        type: m.message_type as "text" | "image" | "file",
        isEncrypted: Boolean(m.message_uri || m.mime_type),
        fileName: m.message_type !== "text" ? m.body : undefined,
      }));
      if (messages.length > 0) store.setMessages(roomId, messages);
    } catch (err) {
      console.warn(`[MatrixBridge] getRoomHistory(${roomId}) failed:`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private matrixDomain(): string {
    return process.env.NEXT_PUBLIC_MATRIX_DOMAIN || "matrix.seucra.tech";
  }

  private resolveDisplayName(email: string, username: string): string {
    if (typeof window === "undefined") return username;
    try {
      const map = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");
      if (map[email.toLowerCase()]) return map[email.toLowerCase()];
      if (map[username]) return map[username];
    } catch (e) {}
    return username.charAt(0).toUpperCase() + username.slice(1);
  }

  private persistUserRegistration(user: User) {
    if (typeof window === "undefined") return;
    try {
      const username = user.email.split("@")[0].toLowerCase();
      const map = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");

      map[user.email.toLowerCase()] = user.name;
      map[username] = user.name;
      map[user.id.toLowerCase()] = user.name;
      map[`@${username}:${this.matrixDomain().toLowerCase()}`] = user.name;

      localStorage.setItem("vigilant_users_map", JSON.stringify(map));

      const list: User[] = JSON.parse(
        localStorage.getItem("vigilant_registered_users") || "[]"
      );
      const existingIdx = list.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (existingIdx >= 0) {
        list[existingIdx] = user;
      } else {
        list.push(user);
      }
      localStorage.setItem("vigilant_registered_users", JSON.stringify(list));

      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  }
}

export const matrixService = new MatrixService();
export default matrixService;
