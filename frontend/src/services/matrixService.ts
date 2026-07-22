import { useMatrixStore, User, Room, Message } from "../store/matrixStore";

// Pre-seeded mock users
const MOCK_USERS: User[] = [
  { id: "user_lakshya", name: "Lakshya (You)", email: "lakshya@vigilant.co", avatarUrl: "", status: "online" },
  { id: "user_harshada", name: "Harshada", email: "harshada@vigilant.co", avatarUrl: "", status: "online" },
  { id: "user_alice", name: "Alice Smith (CISO)", email: "alice@vigilant.co", avatarUrl: "", status: "busy" },
  { id: "user_bob", name: "Bob Jones (DevOps)", email: "bob@vigilant.co", avatarUrl: "", status: "offline" },
  { id: "user_synapse", name: "Synapse Bot", email: "bot@synapse.local", avatarUrl: "", status: "online" },
];

// Pre-seeded mock rooms
const MOCK_ROOMS: Room[] = [
  {
    id: "room_general",
    name: "general",
    topic: "Company-wide discussions and watercooler talk",
    type: "channel",
    unreadCount: 0,
    members: ["user_lakshya", "user_harshada", "user_alice", "user_bob", "user_synapse"],
    isEncrypted: false,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "room_announcements",
    name: "announcements",
    topic: "Important announcements and policy updates",
    type: "channel",
    unreadCount: 0,
    members: ["user_lakshya", "user_harshada", "user_alice", "user_bob"],
    isEncrypted: false,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: "room_security",
    name: "security-compliance 🔒",
    topic: "E2E Encrypted channel for secure audits, keys and keys escrow discussion",
    type: "channel",
    unreadCount: 0,
    members: ["user_lakshya", "user_harshada", "user_alice"],
    isEncrypted: true,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "room_dm_harshada",
    name: "Harshada",
    type: "dm",
    unreadCount: 2,
    members: ["user_lakshya", "user_harshada"],
    isEncrypted: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "room_dm_alice",
    name: "Alice Smith",
    type: "dm",
    unreadCount: 0,
    members: ["user_lakshya", "user_alice"],
    isEncrypted: true,
    createdAt: Date.now() - 86400000 * 2,
  },
];

// Pre-seeded mock messages
const MOCK_MESSAGES: Record<string, Message[]> = {
  room_general: [
    {
      id: "msg_g1",
      roomId: "room_general",
      senderId: "user_synapse",
      senderName: "Synapse Bot",
      content: "Welcome to Vigilant! Synapse Homeserver is online and PostgreSQL is connected.",
      timestamp: Date.now() - 3600000 * 4,
      type: "text",
      isEncrypted: false,
    },
    {
      id: "msg_g2",
      roomId: "room_general",
      senderId: "user_bob",
      senderName: "Bob Jones (DevOps)",
      content: "Docker stack is fully deployed. CPU utilization is looking healthy at 2%. Let me know if anyone experiences delays.",
      timestamp: Date.now() - 3600000 * 3,
      type: "text",
      isEncrypted: false,
    },
    {
      id: "msg_g3",
      roomId: "room_general",
      senderId: "user_harshada",
      senderName: "Harshada",
      content: "Looks great Bob! I'm starting work on the landing page UI layout today.",
      timestamp: Date.now() - 3600000 * 2,
      type: "text",
      isEncrypted: false,
    },
  ],
  room_announcements: [
    {
      id: "msg_a1",
      roomId: "room_announcements",
      senderId: "user_alice",
      senderName: "Alice Smith (CISO)",
      content: "Reminder: All communication containing customer identifiers or architectural credentials MUST be sent in encrypted rooms. Check the room settings to ensure Megolm encryption is enabled.",
      timestamp: Date.now() - 3600000 * 24,
      type: "text",
      isEncrypted: false,
    },
  ],
  room_security: [
    {
      id: "msg_s1",
      roomId: "room_security",
      senderId: "user_alice",
      senderName: "Alice Smith (CISO)",
      content: "I have configured the Megolm sessions. The key rotation policy is set to 100 messages or 7 days.",
      timestamp: Date.now() - 3600000 * 5,
      type: "text",
      isEncrypted: true,
    },
    {
      id: "msg_s2",
      roomId: "room_security",
      senderId: "user_lakshya",
      senderName: "Lakshya (You)",
      content: "Perfect, the Rust WASM client local store is configured to cache keys in an encrypted SQLite database on the client side.",
      timestamp: Date.now() - 3600000 * 4,
      type: "text",
      isEncrypted: true,
    },
    {
      id: "msg_s3",
      roomId: "room_security",
      senderId: "user_alice",
      senderName: "Alice Smith (CISO)",
      content: "Excellent. Here is the PDF mapping our sovereign key escrow design.",
      timestamp: Date.now() - 3600000 * 3,
      type: "file",
      fileName: "sovereign-key-escrow.pdf",
      fileUrl: "/mock-files/sovereign-key-escrow.pdf",
      isEncrypted: true,
    },
  ],
  room_dm_harshada: [
    {
      id: "msg_dh1",
      roomId: "room_dm_harshada",
      senderId: "user_lakshya",
      senderName: "Lakshya (You)",
      content: "Hey Harshada, did you finish the layout specs for the login page?",
      timestamp: Date.now() - 3600000 * 2,
      type: "text",
      isEncrypted: true,
    },
    {
      id: "msg_dh2",
      roomId: "room_dm_harshada",
      senderId: "user_harshada",
      senderName: "Harshada",
      content: "Yes, I uploaded the mockup files here. Let me know what you think of the gradient accents!",
      timestamp: Date.now() - 3600000 * 1,
      type: "text",
      isEncrypted: true,
    },
    {
      id: "msg_dh3",
      roomId: "room_dm_harshada",
      senderId: "user_harshada",
      senderName: "Harshada",
      content: "Here is the desktop mock image:",
      timestamp: Date.now() - 3600000 * 0.9,
      type: "image",
      fileName: "login-mock.png",
      fileUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
      isEncrypted: true,
    },
  ],
  room_dm_alice: [
    {
      id: "msg_da1",
      roomId: "room_dm_alice",
      senderId: "user_alice",
      senderName: "Alice Smith (CISO)",
      content: "Hey, are we still on track for checking the SAS verification flow?",
      timestamp: Date.now() - 3600000 * 12,
      type: "text",
      isEncrypted: true,
    },
    {
      id: "msg_da2",
      roomId: "room_dm_alice",
      senderId: "user_lakshya",
      senderName: "Lakshya (You)",
      content: "Yes, we will show the SAS Emoji dialog interface where you can cross-compare the short code string with Alice's screen.",
      timestamp: Date.now() - 3600000 * 11,
      type: "text",
      isEncrypted: true,
    },
  ],
};

let notificationPermission: string = "default";
if (typeof window !== "undefined") {
  notificationPermission = Notification.permission;
}

class MatrixService {
  private syncTimer: NodeJS.Timeout | null = null;
  private botMessageTimer: NodeJS.Timeout | null = null;

  init() {
    const store = useMatrixStore.getState();
    store.setConnecting(true);

    // Load state from local storage or fall back to defaults
    const savedUser = typeof window !== "undefined" ? localStorage.getItem("vigilant_user") : null;
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        store.setCurrentUser(user);
      } catch (e) {
        console.error("Failed to parse saved user credentials", e);
      }
    }

    // Simulate connecting & syncing to Synapse Homeserver
    this.syncTimer = setTimeout(() => {
      store.setConnecting(false);
      store.setSynced(true);
      store.setUsers(MOCK_USERS);
      
      // Load preseeded rooms and messages
      store.setRooms(MOCK_ROOMS);
      Object.entries(MOCK_MESSAGES).forEach(([roomId, msgs]) => {
        store.setMessages(roomId, msgs);
      });

      console.log("Matrix SDK mock synced successfully with Synapse homeserver.");
      
      // Start dynamic messages simulation
      this.startSimulation();
    }, 1200);

    // Request notification permission if available
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        notificationPermission = perm;
      });
    }
  }

  destroy() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    if (this.botMessageTimer) clearInterval(this.botMessageTimer);
  }

  async login(email: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const normalizedEmail = email.toLowerCase().trim();
        // Map admin credentials to the lakshya profile for demo continuity
        const targetSearch = (normalizedEmail === "admin@vigilant.co" || normalizedEmail === "admin")
          ? "lakshya@vigilant.co"
          : normalizedEmail;

        const matchedUser = MOCK_USERS.find(
          (u) => 
            u.email.toLowerCase() === targetSearch ||
            u.email.split("@")[0].toLowerCase() === targetSearch ||
            u.name.toLowerCase().replace(/\s*\(you\)/, "").toLowerCase().trim() === targetSearch
        ) || {
          id: `user_${Math.random().toString(36).substring(2, 9)}`,
          name: email.split("@")[0],
          email: email,
          avatarUrl: "",
          status: "online" as const,
        };

        const store = useMatrixStore.getState();
        store.setCurrentUser(matchedUser);

        if (typeof window !== "undefined") {
          localStorage.setItem("vigilant_user", JSON.stringify(matchedUser));
        }

        resolve(matchedUser);
      }, 500);
    });
  }

  async register(name: string, email: string): Promise<User> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 9)}`,
          name,
          email,
          avatarUrl: "",
          status: "online",
        };

        const store = useMatrixStore.getState();
        store.setCurrentUser(newUser);

        if (typeof window !== "undefined") {
          localStorage.setItem("vigilant_user", JSON.stringify(newUser));
        }

        resolve(newUser);
      }, 600);
    });
  }

  logout() {
    const store = useMatrixStore.getState();
    store.reset();
    if (typeof window !== "undefined") {
      localStorage.removeItem("vigilant_user");
    }
    this.destroy();
  }

  createRoom(name: string, type: "channel" | "dm", topic?: string, isEncrypted = false): Room {
    const store = useMatrixStore.getState();
    const currentUser = store.currentUser;
    const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;
    
    const newRoom: Room = {
      id: roomId,
      name: name.replace("#", "").trim(),
      topic,
      type,
      unreadCount: 0,
      members: currentUser ? [currentUser.id] : [],
      isEncrypted,
      createdAt: Date.now(),
    };

    store.addRoom(newRoom);
    store.setMessages(roomId, []);
    return newRoom;
  }

  leaveRoom(roomId: string) {
    const store = useMatrixStore.getState();
    store.leaveRoom(roomId);
  }

  sendMessage(
    roomId: string,
    content: string,
    type: "text" | "image" | "file" = "text",
    fileName?: string,
    fileUrl?: string
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

    // Trigger mock auto-reply simulation
    this.triggerMockReply(roomId, content);
  }

  private triggerMockReply(roomId: string, userMessage: string) {
    const store = useMatrixStore.getState();
    const room = store.rooms.find((r) => r.id === roomId);
    if (!room) return;

    // Pick a mock respondent (anyone other than the current user)
    const activeUserId = store.currentUser?.id;
    const responders = room.members.filter((m) => m !== activeUserId && m !== "user_synapse");

    if (responders.length === 0) return;

    const randomResponderId = responders[Math.floor(Math.random() * responders.length)];
    const responder = store.users.find((u) => u.id === randomResponderId) || MOCK_USERS[1];

    // Determine an appropriate reply
    let replyContent = "Understood. I will check the logs and update you shortly.";
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("design") || lowerMessage.includes("mockup") || lowerMessage.includes("layout")) {
      replyContent = "The frontend layouts are ready. I will create a branch and update the dashboard structure.";
    } else if (lowerMessage.includes("key") || lowerMessage.includes("encrypt") || lowerMessage.includes("olm")) {
      replyContent = "Remember that Olm keys are verified out-of-band using SAS Emoji strings. Let's schedule a session.";
    } else if (lowerMessage.includes("hello") || lowerMessage.includes("hey")) {
      replyContent = `Hey! How's the foundation layout coming along?`;
    } else if (lowerMessage.includes("deploy") || lowerMessage.includes("docker")) {
      replyContent = "I'm monitoring the synapse container. The sync token polling latency is under 40ms.";
    }

    setTimeout(() => {
      const mockReply: Message = {
        id: `msg_${Math.random().toString(36).substring(2, 9)}`,
        roomId,
        senderId: responder.id,
        senderName: responder.name,
        senderAvatar: responder.avatarUrl,
        content: replyContent,
        timestamp: Date.now(),
        type: "text",
        isEncrypted: room.isEncrypted,
      };

      store.addMessage(roomId, mockReply);
      this.triggerPushNotification(room.name, `${responder.name}: ${replyContent}`);
    }, 1500 + Math.random() * 1000);
  }

  private startSimulation() {
    // Periodically post mock updates to `#general` or checkups in DMs to simulate active work environment
    this.botMessageTimer = setInterval(() => {
      const store = useMatrixStore.getState();
      if (!store.currentUser) return;

      const randomEvent = Math.random();
      
      // 30% chance of a simulation message
      if (randomEvent < 0.35) {
        const channels = ["room_general", "room_security"];
        const targetRoomId = channels[Math.floor(Math.random() * channels.length)];
        const room = store.rooms.find((r) => r.id === targetRoomId);
        
        if (!room) return;

        const sender = MOCK_USERS[Math.floor(Math.random() * 2) + 2]; // Alice or Bob
        
        const generalQuotes = [
          "I am checking the MinIO S3 media store connectivity. Works cleanly locally.",
          "We should implement the custom matrix-sdk wrapper once the WASM build completes.",
          "I updated the Postgres indices for room history sync speedups.",
        ];

        const securityQuotes = [
          "Make sure to test keys backup to the passphrase encrypted storage.",
          "I am reviewing the client-side session authentication verification design.",
          "Let's ensure the matrix-sdk-bridge rust bindings compile with wasm-pack.",
        ];

        const quotes = targetRoomId === "room_general" ? generalQuotes : securityQuotes;
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        const simMessage: Message = {
          id: `msg_${Math.random().toString(36).substring(2, 9)}`,
          roomId: targetRoomId,
          senderId: sender.id,
          senderName: sender.name,
          senderAvatar: sender.avatarUrl,
          content: randomQuote,
          timestamp: Date.now(),
          type: "text",
          isEncrypted: room.isEncrypted,
        };

        store.addMessage(targetRoomId, simMessage);
        this.triggerPushNotification(`#${room.name}`, `${sender.name}: ${randomQuote}`);
      }
    }, 45000); // Trigger every 45s
  }

  private triggerPushNotification(title: string, body: string) {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(`Vigilant - ${title}`, {
        body,
        icon: "/next.svg",
      });
    }
  }
}

export const matrixService = new MatrixService();
export default matrixService;
