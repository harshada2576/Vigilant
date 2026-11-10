/**
 * matrixService.ts
 *
 * Frontend integration layer for @seucra/matrix-sdk-bridge (WebAssembly).
 * Uses only APIs present in the installed @seucra/matrix-sdk-bridge declarations.
 *
 * Matrix/Synapse is authoritative. Most calls use the WASM bridge; directory
 * search and presence are explicit temporary HTTP exceptions because 0.1.4
 * has no corresponding exports. sessionStorage stores only the bridge session.
 */

import { useMatrixStore, User, Room, Message } from "../store/matrixStore";
import type { MatrixBridge } from "@seucra/matrix-sdk-bridge";
import type { MatrixPresenceSnapshot } from "../types/matrix";
import {
  displayStatusForPresence,
  isMatrixRoomId,
  isMatrixUserId,
  mediaBytesMatchMime,
  normalizeDirectoryResponse,
  normalizeMessageEvent,
  normalizePresenceResponse,
  parseDirectMessages,
  parseHistoryResponse,
  parseJoinedRooms,
  safeMediaMime,
  stableMessageId,
} from "./matrixPayload.mjs";

let bridgeInstance: MatrixBridge | null = null;
let bridgeInitialization: Promise<MatrixBridge> | null = null;
let bridgeInitializationGeneration = 0;
const bridgesWithCallbacks = new WeakSet<MatrixBridge>();

function bridgeInitializationPhase(error: unknown): "wasm" | "homeserver" {
  const message = error instanceof Error ? error.message : String(error);
  return /WASM|bridge package/i.test(message) ? "wasm" : "homeserver";
}

function configuredHomeserverUrl(): string {
  const configured = process.env.NEXT_PUBLIC_HOMESERVER_URL?.trim();
  if (!configured) {
    throw new Error("Set NEXT_PUBLIC_HOMESERVER_URL to your Matrix homeserver before signing in.");
  }
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_HOMESERVER_URL must be a valid HTTP or HTTPS URL.");
  }
}

/** The bridge accepts a homeserver-local username, not an email or full MXID. */
function matrixUsernameFromInput(input: string): string {
  const value = input.trim();
  if (isMatrixUserId(value)) return value.slice(1, value.indexOf(":"));
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value.slice(0, value.indexOf("@"));
  if (/^[a-z0-9._=/-]+$/i.test(value)) return value;
  throw new Error("Enter a Matrix username, account email-style username, or full Matrix user ID.");
}

/**
 * Lazy-loads and initialises the WASM bridge singleton.
 *
 * - Throws on SSR (window === undefined).
 * - Throws on any WASM / homeserver init failure.
 *
 * Callers must handle errors and surface them to the UI.
 * No local fallback is permitted.
 */
async function getBridgeInstance(): Promise<MatrixBridge> {
  if (typeof window === "undefined") {
    throw new Error("Matrix WASM bridge can only run in the browser.");
  }
  if (bridgeInstance) return bridgeInstance;
  if (!bridgeInitialization) {
    const generation = bridgeInitializationGeneration;
    const initialization = (async () => {
      const homeserverUrl = configuredHomeserverUrl();
      let wasm: typeof import("@seucra/matrix-sdk-bridge");
      try {
        wasm = await import("@seucra/matrix-sdk-bridge");
      } catch (error) {
        throw new Error(`WASM bridge package could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
      }
      try {
        await wasm.default("/matrix_sdk_bridge_bg.wasm");
      } catch (error) {
        throw new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      let bridge: MatrixBridge;
      try {
        bridge = await wasm.MatrixBridge.init(homeserverUrl);
      } catch (error) {
        throw new Error(`Matrix homeserver initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (bridgeInitializationGeneration !== generation) {
        bridge.stop_sync();
        throw new Error("Matrix bridge initialization was cancelled by logout.");
      }
      bridgeInstance = bridge;
      return bridge;
    })().catch((error) => {
      if (bridgeInitializationGeneration === generation) bridgeInitialization = null;
      throw error;
    });
    bridgeInitialization = initialization;
  }
  return bridgeInitialization;
}

// ---------------------------------------------------------------------------

class MatrixService {
  private isInitialised = false;
  private authGeneration = 0;

  private ensureCurrentOperation(generation: number): void {
    if (generation !== this.authGeneration) throw new Error("This Matrix session operation was cancelled.");
  }

  private requireAuthenticatedBridge(): MatrixBridge {
    if (!useMatrixStore.getState().currentUser || !bridgeInstance) {
      throw new Error("An authenticated Matrix session is required for this operation.");
    }
    return bridgeInstance;
  }

  private async persistSession(session: string, bridge: MatrixBridge): Promise<void> {
    try {
      sessionStorage.setItem("matrix_session", session);
    } catch {
      bridge.stop_sync();
      try {
        await bridge.logout();
      } catch {
        throw new Error("Matrix signed in, but this browser could not save the session or complete remote logout. Clear this tab's session and sign in again.");
      }
      throw new Error("Matrix signed in, but this browser could not save the session. Enable session storage and sign in again.");
    }
  }

  /**
   * Called once on dashboard mount.
   * Restores a legitimate Matrix session from sessionStorage if one exists.
   * If restoration fails, retains the session so a transient network failure can be retried.
   * No local fallback — all state must originate from Synapse.
   */
  async init() {
    if (typeof window === "undefined" || this.isInitialised) return;
    this.isInitialised = true;
    const generation = this.authGeneration;

    const store = useMatrixStore.getState();
    store.setConnectionMode("connecting");
    store.setSyncStatus("initializing");
    store.setConnectionError(null);
    store.setConnecting(true);

    try {
      // Tab-scoped — each tab has its own authenticated user
      const savedSession = sessionStorage.getItem("matrix_session");
      if (!savedSession) {
        store.setConnecting(false);
        store.setConnectionMode("disconnected");
        store.setSyncStatus("disconnected");
        return;
      }

      try {
        const bridge = await getBridgeInstance();
        this.ensureCurrentOperation(generation);
        await bridge.restore_session(savedSession);
        this.ensureCurrentOperation(generation);
        const currentUser = this.userFromSession(savedSession);
        store.setCurrentUser(currentUser);
        // Register callbacks BEFORE start_sync per API lifecycle doc
        this.registerCallbacks(bridge);
        bridge.start_sync();
        store.setSyncStatus("unknown");
        // Rooms are populated from bridge after sync settles
        await this.fetchRoomsFromBridge(bridge, store, () => generation === this.authGeneration);
        this.ensureCurrentOperation(generation);
        store.setConnectionMode("authenticated");
        store.setConnectionError(null);
      } catch (e) {
        if (generation !== this.authGeneration) return;
        store.setConnectionMode("error");
        store.setSyncStatus("error");
        store.setConnectionError({
          phase: bridgeInitializationPhase(e),
          message: e instanceof Error ? e.message : String(e),
          retryable: true,
        });
        this.isInitialised = false;
      }
    } catch (error) {
      if (generation !== this.authGeneration) return;
      store.setConnectionMode("error");
      store.setSyncStatus("error");
      store.setConnectionError({
        phase: bridgeInitializationPhase(error),
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      });
      this.isInitialised = false;
    } finally {
      if (generation === this.authGeneration) store.setConnecting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // WASM bridge callbacks (registered before start_sync per API doc)
  // ---------------------------------------------------------------------------

  private registerCallbacks(bridge: MatrixBridge) {
    if (bridgesWithCallbacks.has(bridge)) return;
    bridgesWithCallbacks.add(bridge);
    bridge.on_message((jsonMsg: string) => {
      try {
        if (bridgeInstance !== bridge || !useMatrixStore.getState().currentUser) return;
        const msg = normalizeMessageEvent(JSON.parse(jsonMsg));
        if (!msg) return;

        // Always read LIVE store state
        const liveStore = useMatrixStore.getState();
        const existing: Message[] = liveStore.messages[msg.roomId] || [];
        const messageId = stableMessageId(msg);
        if (existing.some((message) => message.id === messageId)) return;

        const senderUsername = msg.senderId.slice(1, msg.senderId.indexOf(":"));
        const senderUser = liveStore.users.find(
          (u) => u.id.toLowerCase() === msg.senderId.toLowerCase()
        );
        const senderName = senderUser ? senderUser.name : senderUsername;
        const isFileMsg = msg.type === "image" || msg.type === "file";

        const message: Message = {
          id: messageId,
          roomId: msg.roomId,
          senderId: msg.senderId,
          senderName,
          content: msg.body,
          timestamp: msg.timestamp,
          type: msg.type,
          fileName: isFileMsg ? msg.body : undefined,
          mediaSource: msg.mediaSource,
          mimeType: msg.mimeType,
        };

        liveStore.addMessage(msg.roomId, message);
      } catch {
        console.error("[MatrixBridge] Ignored an invalid message event from the bridge.");
      }
    });

    bridge.on_notification((jsonNotif: string) => {
      try {
        if (bridgeInstance !== bridge || !useMatrixStore.getState().currentUser) return;
        const notif = JSON.parse(jsonNotif);
        if (typeof notif?.sender !== "string" || typeof notif?.body !== "string") return;
        if (typeof Notification === "undefined") return;
        if (Notification.permission === "granted") {
          const sender = notif.sender.startsWith("@") ? notif.sender.slice(1).split(":")[0] : "Matrix user";
          new Notification("Vigilant — New Message", {
            body: `${sender}: ${notif.body}`,
          });
        }
      } catch {
        console.error("[MatrixBridge] Ignored an invalid notification event from the bridge.");
      }
    });

    if (typeof bridge.on_typing === "function") {
      bridge.on_typing((jsonTyping: string | unknown) => {
        try {
          if (bridgeInstance !== bridge || !useMatrixStore.getState().currentUser) return;
          const data = typeof jsonTyping === "string" ? JSON.parse(jsonTyping) : jsonTyping;
          if (!data || typeof data !== "object") return;
          const roomId = (data as { room_id?: string; roomId?: string }).room_id || (data as { roomId?: string }).roomId;
          const userIds = Array.isArray((data as { user_ids?: string[] }).user_ids)
            ? (data as { user_ids: string[] }).user_ids
            : Array.isArray((data as { userIds?: string[] }).userIds)
              ? (data as { userIds: string[] }).userIds
              : [];
          if (typeof roomId === "string") {
            useMatrixStore.getState().setTypingUsers(roomId, userIds);
          }
        } catch {
          console.error("[MatrixBridge] Ignored an invalid typing event from the bridge.");
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Sync rooms from Synapse via bridge
  // ---------------------------------------------------------------------------

  async fetchRoomsFromBridge(
    bridge: MatrixBridge,
    store: ReturnType<typeof useMatrixStore.getState>,
    isCurrent: () => boolean = () => true
  ) {
    try {
      const rawChannels = await bridge.list_joined_rooms();
      if (!isCurrent()) return;
      const bridgeChannels = parseJoinedRooms(rawChannels);

      const rawDMs = await bridge.list_direct_messages();
      if (!isCurrent()) return;
      const bridgeDMs = parseDirectMessages(rawDMs);

      const allRooms = [...bridgeChannels, ...bridgeDMs];
      if (isCurrent()) store.setRooms(allRooms);
    } catch (err) {
      if (isCurrent()) {
        store.setConnectionMode("error");
        store.setSyncStatus("error");
        store.setConnectionError({
          phase: "sync",
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
        });
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  private async finishAuthentication(
    bridge: MatrixBridge,
    session: string,
    generation: number,
  ): Promise<User> {
    const store = useMatrixStore.getState();
    const user = this.userFromSession(session);
    await this.persistSession(session, bridge);
    this.ensureCurrentOperation(generation);
    store.setCurrentUser(user);
    this.registerCallbacks(bridge);
    try {
      bridge.start_sync();
      // The published bridge has no sync lifecycle callback. A successful call
      // only means startup was requested, not that a sync completed.
      store.setSyncStatus("unknown");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.setConnectionMode("error");
      store.setSyncStatus("error");
      store.setConnectionError({ phase: "sync", message, retryable: true });
      throw new Error(`Matrix synchronization could not start: ${message}`);
    }
    await this.fetchRoomsFromBridge(bridge, store, () => generation === this.authGeneration);
    this.ensureCurrentOperation(generation);
    store.setConnectionMode("authenticated");
    store.setConnectionError(null);
    this.isInitialised = true;
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const store = useMatrixStore.getState();
    let username: string;
    try {
      username = matrixUsernameFromInput(email);
    } catch (error) {
      throw error instanceof Error ? error : new Error("Enter a valid Matrix username.");
    }
    const generation = ++this.authGeneration;
    store.setConnecting(true);
    store.setConnectionMode("connecting");
    store.setSyncStatus("initializing");
    store.setConnectionError(null);

    try {
      const bridge = await getBridgeInstance();
      this.ensureCurrentOperation(generation);
      await bridge.login(username, password);
      this.ensureCurrentOperation(generation);
      const session = bridge.export_session();
      if (!session) throw new Error("Matrix login succeeded without a restorable session.");
      return await this.finishAuthentication(bridge, session, generation);
    } catch (error) {
      if (generation === this.authGeneration) {
        store.setConnecting(false);
        if (useMatrixStore.getState().connectionError === null) {
          const message = error instanceof Error ? error.message : String(error);
          const phase = /WASM|bridge package/i.test(message) ? "wasm" : /homeserver|NEXT_PUBLIC/i.test(message) ? "homeserver" : "auth";
          store.setConnectionMode("error");
          store.setSyncStatus("error");
          store.setConnectionError({ phase, message, retryable: true });
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      if (/M_LIMIT_EXCEEDED/.test(message)) throw new Error("Too many login attempts. Please wait before trying again.");
      if (/M_FORBIDDEN|M_UNKNOWN|invalid password|invalid username/i.test(message)) throw new Error("The homeserver rejected these sign-in details.");
      if (/ECONNREFUSED|Failed to fetch|network|connect/i.test(message)) throw new Error("Cannot reach the homeserver. Check your network connection.");
      throw error instanceof Error ? error : new Error("Matrix sign-in failed.");
    } finally {
      if (generation === this.authGeneration) store.setConnecting(false);
    }
  }

  async register(email: string, password: string): Promise<User> {
    const store = useMatrixStore.getState();
    let username: string;
    try {
      username = matrixUsernameFromInput(email);
    } catch (error) {
      throw error instanceof Error ? error : new Error("Enter a valid Matrix username.");
    }
    const generation = ++this.authGeneration;
    store.setConnecting(true);
    store.setConnectionMode("connecting");
    store.setSyncStatus("initializing");
    store.setConnectionError(null);

    try {
      const bridge = await getBridgeInstance();
      this.ensureCurrentOperation(generation);
      await bridge.register(username, password);
      this.ensureCurrentOperation(generation);

      let session = bridge.export_session();
      if (!session) {
        // Registration is not documented to authenticate in the published API.
        // Use its real login export when registration returned no session.
        await bridge.login(username, password);
        this.ensureCurrentOperation(generation);
        session = bridge.export_session();
      }
      if (!session) throw new Error("Registration succeeded, but the bridge did not return a restorable session after sign-in.");
      return await this.finishAuthentication(bridge, session, generation);
    } catch (error) {
      if (generation === this.authGeneration) {
        store.setConnecting(false);
        if (useMatrixStore.getState().connectionError === null) {
          const message = error instanceof Error ? error.message : String(error);
          store.setConnectionMode("error");
          store.setSyncStatus("error");
          store.setConnectionError({ phase: /WASM|bridge package/i.test(message) ? "wasm" : "auth", message, retryable: true });
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists|M_USER_IN_USE/.test(message)) throw new Error("This homeserver already has that account. Try signing in.");
      if (/M_FORBIDDEN|Registration/.test(message)) throw new Error("Registration is not permitted on this homeserver.");
      if (/ECONNREFUSED|Failed to fetch|network/i.test(message)) throw new Error("Cannot reach the homeserver. Check your network connection.");
      throw error instanceof Error ? error : new Error("Matrix registration failed.");
    } finally {
      if (generation === this.authGeneration) store.setConnecting(false);
    }
  }

  async logout(): Promise<void> {
    const store = useMatrixStore.getState();
    ++this.authGeneration;
    ++bridgeInitializationGeneration;
    const bridge = bridgeInstance;
    const failures: string[] = [];
    if (bridge) {
      try {
        bridge.stop_sync();
      } catch (error) {
        failures.push(`Matrix synchronization could not be stopped: ${error instanceof Error ? error.message : String(error)}`);
      }
      try {
        await bridge.logout();
      } catch (error) {
        failures.push(`Matrix remote logout failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    try {
      if (typeof window !== "undefined") sessionStorage.removeItem("matrix_session");
    } catch {
      failures.push("The saved session could not be removed from this browser.");
    } finally {
      store.reset();
      this.isInitialised = false;
      bridgeInstance = null;
      bridgeInitialization = null;
    }
    if (failures.length > 0) throw new Error(failures.join(" "));
  }

  destroy() {
    this.isInitialised = false;
  }

  // ---------------------------------------------------------------------------
  // Room management
  // ---------------------------------------------------------------------------

  async createRoom(
    targetInput: string,
    type: "channel" | "dm"
  ): Promise<Room> {
    const store = useMatrixStore.getState();
    const bridge = this.requireAuthenticatedBridge();
    const cleanInput = targetInput.trim();

    if (type === "dm") {
      const inputLower = cleanInput.toLowerCase();
      // Check if a DM with this exact user already exists in store
      const targetUser = store.users.find((u) => u.id.toLowerCase() === inputLower);

      const targetId = targetUser?.id || cleanInput;
      if (!isMatrixUserId(targetId)) {
        throw new Error("Enter an exact Matrix user ID such as @name:server.org.");
      }

      const targetName = targetUser?.name || targetId;

      // Check for existing DM in store
      const existing = store.rooms.find((r) => {
        if (r.type !== "dm") return false;
        const memberLowers = r.members.map((m) => m.toLowerCase());
        return (
          memberLowers.includes(targetId.toLowerCase()) ||
          r.directUserId?.toLowerCase() === targetId.toLowerCase()
        );
      });
      if (existing) return existing;

      // Must reach bridge — no local fabrication
      const roomId = await bridge.get_or_create_direct_message(targetId);
      if (!isMatrixRoomId(roomId)) throw new Error("Matrix returned an invalid direct-message room ID.");

      const newRoom: Room = {
        id: roomId,
        name: targetName,
        type: "dm",
        unreadCount: 0,
        members: [],
        memberListAvailable: false,
        directUserId: targetId,
        createdAt: Date.now(),
      };

      store.addRoom(newRoom);
      store.setMessages(roomId, []);
      return newRoom;
    }

    // Channel room creation — must reach bridge
    const roomName = cleanInput.replace(/^#/, "").trim();
    if (!roomName) throw new Error("Enter a channel name.");
    const roomId = await bridge.create_room(roomName);
    if (!isMatrixRoomId(roomId)) throw new Error("Matrix returned an invalid room ID.");
    await bridge.join_room(roomId);

    const newRoom: Room = {
      id: roomId,
      name: roomName,
      type: "channel",
      members: [],
      memberListAvailable: false,
    };

    store.addRoom(newRoom);
    store.setMessages(roomId, []);
    return newRoom;
  }

  async leaveRoom(roomId: string): Promise<void> {
    const store = useMatrixStore.getState();
    if (!isMatrixRoomId(roomId)) throw new Error("Enter a valid Matrix room ID.");
    const bridge = this.requireAuthenticatedBridge();
    await bridge.leave_room(roomId);
    store.leaveRoom(roomId);
  }

  async inviteUser(roomId: string, userId: string): Promise<void> {
    if (!isMatrixRoomId(roomId) || !isMatrixUserId(userId)) throw new Error("Enter a valid Matrix room ID and user ID.");
    const bridge = this.requireAuthenticatedBridge();
    await bridge.invite_user(roomId, userId);
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  async sendMessage(
    roomId: string,
    content: string,
    type: "text" | "image" | "file" = "text",
    fileName?: string,
    fileUrl?: string,
    fileData?: Uint8Array,
    mimeType?: string
  ): Promise<string> {
    const store = useMatrixStore.getState();
    const currentUser = store.currentUser;
    if (!currentUser) throw new Error("Sign in before sending a message.");
    if (!isMatrixRoomId(roomId)) throw new Error("This is not a valid Matrix room ID.");
    if (type === "text" && !content.trim()) throw new Error("Enter a message before sending.");
    if (!store.rooms.some((room) => room.id === roomId)) {
      throw new Error("This room is not available in your Matrix session.");
    }
    if (type !== "text" && (!fileData || !fileName)) {
      throw new Error("The attachment could not be read. Please select it again.");
    }
    if (fileData && fileData.byteLength > 25 * 1024 * 1024) {
      throw new Error("Attachments must be 25 MB or smaller.");
    }
    if (type === "image" && (!mimeType?.startsWith("image/") || mimeType === "image/svg+xml")) {
      throw new Error("Only supported raster image attachments can be sent.");
    }
    if (type === "file" && (mimeType !== "application/pdf" || !fileName?.toLowerCase().endsWith(".pdf"))) {
      throw new Error("Only PDF attachments are supported.");
    }
    if (type === "file" && fileData && new TextDecoder().decode(fileData.subarray(0, 5)) !== "%PDF-") {
      throw new Error("The selected file does not contain a valid PDF signature.");
    }
    if (fileData && mimeType && !mediaBytesMatchMime(fileData, mimeType)) {
      throw new Error("The attachment content does not match its declared media type.");
    }

    try {
      const bridge = this.requireAuthenticatedBridge();
      if (type === "text") {
        return await bridge.send_message(roomId, content);
      } else if (type === "image" && fileData && fileName) {
        const mime = safeMediaMime("image", mimeType);
        if (!mime) throw new Error("Only JPEG, PNG, GIF, WebP, and AVIF image attachments are supported.");
        return await bridge.send_image(roomId, fileData, fileName, mime);
      } else if (type === "file" && fileData && fileName) {
        const mime = safeMediaMime("file", mimeType);
        if (!mime) throw new Error("Only PDF attachments are supported.");
        return await bridge.send_file(roomId, fileData, fileName, mime);
      }
      throw new Error("Unsupported Matrix message payload.");
    } catch (e) {
      throw new Error(`Message was not accepted by Matrix: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async sendTypingNotice(roomId: string, typing: boolean): Promise<void> {
    if (!isMatrixRoomId(roomId)) throw new Error("This is not a valid Matrix room ID.");
    const bridge = this.requireAuthenticatedBridge();
    if (typeof bridge.send_typing_notice === "function") {
      try {
        await bridge.send_typing_notice(roomId, typing);
      } catch (e) {
        console.warn("[MatrixBridge] Failed to send typing notice:", e);
      }
    }
  }

  async markAsRead(roomId: string, eventId: string): Promise<void> {
    if (!isMatrixRoomId(roomId)) throw new Error("This is not a valid Matrix room ID.");
    if (!eventId || typeof eventId !== "string") throw new Error("A valid event ID is required to mark as read.");
    const bridge = this.requireAuthenticatedBridge();
    if (typeof bridge.mark_as_read === "function") {
      try {
        await bridge.mark_as_read(roomId, eventId);
      } catch (e) {
        console.warn("[MatrixBridge] Failed to mark event as read:", e);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Room history and pagination — bridge only, no local fallback
  // ---------------------------------------------------------------------------

  async getRoomHistory(roomId: string, limit = 20) {
    const store = useMatrixStore.getState();
    if (!isMatrixRoomId(roomId)) {
      throw new Error("Cannot load history for an invalid Matrix room ID.");
    }
    if (!store.rooms.some((room) => room.id === roomId)) throw new Error("This room is not available in your Matrix session.");

    try {
      const bridge = this.requireAuthenticatedBridge();
      const raw = await bridge.get_room_history(roomId, limit);
      const history = parseHistoryResponse(raw, roomId);
      const messages: Message[] = history.messages.map((message) => ({
        id: stableMessageId(message),
        roomId: message.roomId,
        senderId: message.senderId,
        senderName: message.senderId.slice(1, message.senderId.indexOf(":")),
        content: message.body,
        timestamp: message.timestamp,
        type: message.type,
        fileName: message.type !== "text" ? message.body : undefined,
        mediaSource: message.mediaSource,
        mimeType: message.mimeType,
      }));
      store.setMessages(roomId, messages);
      store.setHasMoreMessages(roomId, history.hasMore);
    } catch (err) {
      throw new Error(`Could not load Matrix room history: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async loadMoreHistory(
    roomId: string,
    limit = 20
  ): Promise<{ messages: Message[]; has_more: boolean }> {
    const store = useMatrixStore.getState();
    if (!isMatrixRoomId(roomId)) {
      throw new Error("Cannot paginate an invalid Matrix room ID.");
    }
    if (!store.rooms.some((room) => room.id === roomId)) throw new Error("This room is not available in your Matrix session.");

    try {
      const bridge = this.requireAuthenticatedBridge();
      const raw = await bridge.load_more_history(roomId, limit);
      const history = parseHistoryResponse(raw, roomId);
      const messages: Message[] = history.messages.map((message) => ({
        id: stableMessageId(message),
        roomId: message.roomId,
        senderId: message.senderId,
        senderName: message.senderId.slice(1, message.senderId.indexOf(":")),
        content: message.body,
        timestamp: message.timestamp,
        type: message.type,
        fileName: message.type !== "text" ? message.body : undefined,
        mediaSource: message.mediaSource,
        mimeType: message.mimeType,
      }));

      if (messages.length > 0) {
        store.prependMessages(roomId, messages);
      }
      const hasMore = history.hasMore;
      store.setHasMoreMessages(roomId, hasMore);
      return { messages, has_more: hasMore };
    } catch (err) {
      throw new Error(`Could not load older Matrix messages: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * get_media() — Retrieve media bytes from an image or file message.
   *
   * `mediaSourceJson` must come directly from the `media_source` field
   * of a JsMessage. Treat it as opaque bridge data — do not construct it manually.
   */
  async getMedia(mediaSourceJson: string): Promise<Uint8Array> {
    try {
      if (!mediaSourceJson.trim()) throw new Error("The Matrix media source is missing.");
      const bridge = this.requireAuthenticatedBridge();
      const bytes = await bridge.get_media(mediaSourceJson);
      if (!(bytes instanceof Uint8Array)) throw new Error("The bridge returned invalid media data.");
      if (bytes.byteLength > 25 * 1024 * 1024) throw new Error("Matrix media exceeds the 25 MB display limit.");
      return bytes;
    } catch (err) {
      throw new Error(`Could not retrieve Matrix media: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEMPORARY DIRECT HTTP EXCEPTION — published bridge 0.1.4 has no directory
  // search method. Replace only after Developer A ships and verifies that API.
  // ---------------------------------------------------------------------------

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    this.requireAuthenticatedBridge();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
    const data = await this.fetchMatrix(
      "/_matrix/client/v3/user_directory/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search_term: trimmed, limit: safeLimit }),
      },
      "Matrix user directory search",
    );
    const results: User[] = normalizeDirectoryResponse(data);
    useMatrixStore.getState().setUsers(results);
    return results;
  }

  // ---------------------------------------------------------------------------
  // TEMPORARY DIRECT HTTP EXCEPTION — published bridge 0.1.4 has no presence
  // read or write methods. Replace after Developer A verifies both capabilities.
  // ---------------------------------------------------------------------------

  async setUserPresence(
    status: "online" | "busy" | "away" | "offline"
  ): Promise<void> {
    const store = useMatrixStore.getState();
    const currentUser = store.currentUser;
    if (!currentUser) throw new Error("Sign in before changing presence.");

    // Send presence state to Matrix homeserver; update the UI only after acceptance.
    const sessionData = this.getSessionData();
    const targetUserId = sessionData.userId || currentUser.id;

    if (!sessionData.accessToken || !isMatrixUserId(targetUserId)) throw new Error("No active Matrix session is available to update presence.");
    const matrixPresence = status === "away" || status === "busy" ? "unavailable" : status;
    const statusMessage = status === "busy" ? "Do Not Disturb" : status === "away" ? "Away" : "";
    await this.fetchMatrix(
      `/_matrix/client/v3/presence/${encodeURIComponent(targetUserId)}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presence: matrixPresence, status_msg: statusMessage }),
      },
      "Matrix presence update",
    );
    store.updateUserPresence(currentUser.id, matrixPresence, status, statusMessage || undefined);
  }

  async getUserPresence(userId: string): Promise<MatrixPresenceSnapshot> {
    if (!isMatrixUserId(userId)) throw new Error("Enter a valid Matrix user ID to look up presence.");
    const sessionData = this.getSessionData();
    if (!sessionData.accessToken) throw new Error("No active Matrix session is available to look up presence.");
    const payload = await this.fetchMatrix(
      `/_matrix/client/v3/presence/${encodeURIComponent(userId)}/status`,
      {},
      "Matrix presence lookup",
    );
    const normalized = normalizePresenceResponse(payload);
    const status = displayStatusForPresence(normalized.presence, normalized.statusMessage);
    return { ...normalized, status };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async fetchMatrix(path: string, init: RequestInit, operation: string): Promise<unknown> {
    const sessionData = this.getSessionData();
    if (!sessionData.accessToken) throw new Error("Sign in to use Matrix directory and presence services.");
    let response: Response;
    try {
      response = await fetch(`${configuredHomeserverUrl()}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${sessionData.accessToken}`,
        },
      });
    } catch (error) {
      throw new Error(`${operation} could not reach the homeserver: ${error instanceof Error ? error.message : "network request failed"}`);
    }
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        throw new Error(`${operation} was rate limited${retryAfter ? `; retry after ${retryAfter} seconds` : "; wait before retrying"}.`);
      }
      throw new Error(`${operation} failed (${response.status}).`);
    }
    if (init.method === "PUT") return undefined;
    try {
      return await response.json() as unknown;
    } catch {
      throw new Error(`${operation} returned invalid JSON.`);
    }
  }

  private getSessionData(): { accessToken?: string; userId?: string } {
    if (typeof window === "undefined") return {};
    try {
      const raw = sessionStorage.getItem("matrix_session");
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      const session = parsed as Record<string, unknown>;
      const tokens = typeof session.tokens === "object" && session.tokens !== null
        ? session.tokens as Record<string, unknown>
        : undefined;
      const meta = typeof session.meta === "object" && session.meta !== null
        ? session.meta as Record<string, unknown>
        : undefined;
      const accessToken = typeof tokens?.access_token === "string"
        ? tokens.access_token
        : typeof session.access_token === "string" ? session.access_token : undefined;
      const userId = typeof session.user_id === "string"
        ? session.user_id
        : typeof meta?.user_id === "string" ? meta.user_id : undefined;
      return { accessToken, userId: isMatrixUserId(userId) ? userId : undefined };
    } catch {
      return {};
    }
  }

  private userFromSession(session: string): User {
    const parsed: unknown = JSON.parse(session);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Matrix session did not contain a valid session object.");
    }
    const sessionObject = parsed as Record<string, unknown>;
    const meta = typeof sessionObject.meta === "object" && sessionObject.meta !== null
      ? sessionObject.meta as Record<string, unknown>
      : undefined;
    const userId = typeof sessionObject.user_id === "string"
      ? sessionObject.user_id
      : meta?.user_id;
    if (typeof userId !== "string" || !isMatrixUserId(userId)) {
      throw new Error("Matrix session did not contain a valid user ID.");
    }
    const localpart = userId.slice(1, userId.indexOf(":"));
    return { id: userId, name: localpart };
  }
}

export const matrixService = new MatrixService();
export default matrixService;
