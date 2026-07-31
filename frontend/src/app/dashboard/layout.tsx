"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Hash, 
  Plus, 
  LogOut, 
  Menu, 
  X, 
  Wifi, 
  WifiOff, 
  ChevronRight, 
  Lock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMatrixStore, Room, User } from "@/store/matrixStore";
import { matrixService } from "@/services/matrixService";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Store variables
  const currentUser = useMatrixStore((state) => state.currentUser);
  const rooms = useMatrixStore((state) => state.rooms);
  const users = useMatrixStore((state) => state.users);
  const isConnecting = useMatrixStore((state) => state.isConnecting);
  const isSynced = useMatrixStore((state) => state.isSynced);
  const activeRoomId = useMatrixStore((state) => state.activeRoomId);
  const setActiveRoomId = useMatrixStore((state) => state.setActiveRoomId);

  // Component states
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState("");
  const [newRoomTopic, setNewRoomTopic] = React.useState("");
  const [newRoomIsEncrypted, setNewRoomIsEncrypted] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [startDmModalOpen, setStartDmModalOpen] = React.useState(false);
  const [targetDmInput, setTargetDmInput] = React.useState("");
  const [dmError, setDmError] = React.useState("");

  // Initialize service
  React.useEffect(() => {
    matrixService.init();
    return () => {
      matrixService.destroy();
    };
  }, []);

  // Redirect if not logged in (mock validation)
  React.useEffect(() => {
    const checkUser = setTimeout(() => {
      if (!useMatrixStore.getState().currentUser && !isConnecting) {
        router.push("/login");
      }
    }, 500);
    return () => clearTimeout(checkUser);
  }, [currentUser, isConnecting, router]);

  const handleLogout = () => {
    matrixService.logout();
    window.location.href = "/";
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const newRoom = await matrixService.createRoom(
      newRoomName,
      "channel",
      newRoomTopic,
      newRoomIsEncrypted
    );

    // Reset create variables
    setNewRoomName("");
    setNewRoomTopic("");
    setNewRoomIsEncrypted(false);
    setCreateModalOpen(false);

    // Direct user to the new room
    setActiveRoomId(newRoom.id);
    router.push(`/dashboard/c/${newRoom.id}`);
  };

  const handleStartDM = async (e?: React.FormEvent, selectedUser?: string) => {
    e?.preventDefault();
    const queryName = (selectedUser || targetDmInput).trim();
    if (!queryName) return;

    setDmError("");
    const cleanQuery = queryName.replace("#", "").trim().toLowerCase();

    const targetObj = users.find(
      (u) =>
        u.email.toLowerCase() === cleanQuery ||
        u.name.toLowerCase() === cleanQuery ||
        u.id.toLowerCase() === cleanQuery ||
        u.id.toLowerCase().startsWith(`@${cleanQuery}:`)
    );

    const targetInput = targetObj ? targetObj.id : queryName;

    try {
      const dmRoom = await matrixService.createRoom(
        targetInput,
        "dm",
        "",
        true
      );
      setTargetDmInput("");
      setDmError("");
      setStartDmModalOpen(false);
      setActiveRoomId(dmRoom.id);
      router.push(`/dashboard/dm/${dmRoom.id}`);
    } catch (err) {
      console.error("Failed to start DM:", err);
      setDmError("Failed to open DM with the selected user.");
    }
  };

  const changeStatus = (status: User["status"]) => {
    if (currentUser) {
      useMatrixStore.getState().updateUserStatus(currentUser.id, status);
    }
    setShowStatusDropdown(false);
  };

  // Filter channels and DM rooms based on search query
  const filteredChannels = rooms.filter(
    (room) =>
      room.type === "channel" &&
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    const matching = rooms.filter((room) => {
      if (room.type !== "dm") return false;
      return getDMDisplayName(room).toLowerCase().includes(q);
    });

    // Deduplicate by target member ID or email (preserves distinct users even if they share a first name)
    const seenTargets = new Set<string>();
    return matching.filter((room) => {
      const currentId = currentUser?.id?.toLowerCase() || "";
      const currentEmail = currentUser?.email?.toLowerCase() || "";
      const targetMember = room.members.find(
        (m) => m.toLowerCase() !== currentId && m.toLowerCase() !== currentEmail
      ) || room.id;

      if (seenTargets.has(targetMember.toLowerCase())) return false;
      seenTargets.add(targetMember.toLowerCase());
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, searchQuery, currentUser, users]);

  function getDMDisplayName(room: Room) {
    const currentClean = (currentUser?.name || "").toLowerCase();
    const currentIdClean = (currentUser?.id || "").toLowerCase();
    const currentEmailClean = (currentUser?.email || "").toLowerCase();

    const otherMember = room.members.find(
      (m) =>
        m.toLowerCase() !== currentClean &&
        m.toLowerCase() !== currentIdClean &&
        m.toLowerCase() !== currentEmailClean
    ) || room.name;

    const rawMember = otherMember.trim();
    const cleanMember = rawMember.toLowerCase();
    const username = cleanMember.split(":")[0].replace("@", "").toLowerCase();

    // 1. Check in-memory users in Zustand store
    const matchUser = users.find((u) => {
      const uId = u.id.toLowerCase();
      const uEmail = u.email.toLowerCase();
      const uUsername = u.email.split("@")[0].toLowerCase();

      return (
        uId === cleanMember ||
        uEmail === cleanMember ||
        cleanMember === uUsername ||
        cleanMember.startsWith(`@${uUsername}:`) ||
        cleanMember === uId
      );
    });
    if (matchUser) return matchUser.name;

    // 2. Check localStorage registered users & user map (shared across all tabs)
    if (typeof window !== "undefined") {
      try {
        const regUsers: User[] = JSON.parse(
          localStorage.getItem("vigilant_registered_users") || "[]"
        );
        const regMatch = regUsers.find((u) => {
          const uId = u.id.toLowerCase();
          const uEmail = u.email.toLowerCase();
          const uUsername = u.email.split("@")[0].toLowerCase();
          return (
            uId === cleanMember ||
            uEmail === cleanMember ||
            username === uUsername ||
            cleanMember.startsWith(`@${uUsername}:`)
          );
        });
        if (regMatch) return regMatch.name;

        const userMap = JSON.parse(localStorage.getItem("vigilant_users_map") || "{}");
        if (userMap[cleanMember]) return userMap[cleanMember];
        if (userMap[username]) return userMap[username];
        if (userMap[rawMember]) return userMap[rawMember];
      } catch (e) {}
    }

    if (username.length > 0 && !username.startsWith("!")) {
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return room.name;
  }

  function getDMDisplayStatus(room: Room) {
    const currentClean = (currentUser?.name || "").toLowerCase();
    const currentIdClean = (currentUser?.id || "").toLowerCase();
    const currentEmailClean = (currentUser?.email || "").toLowerCase();

    const otherMember = room.members.find(
      (m) =>
        m.toLowerCase() !== currentClean &&
        m.toLowerCase() !== currentIdClean &&
        m.toLowerCase() !== currentEmailClean
    ) || room.name;

    const cleanMember = otherMember.replace("#", "").trim().toLowerCase();

    const matchUser = users.find((u) => {
      const uId = u.id.toLowerCase();
      const uEmail = u.email.toLowerCase();
      const uUsername = u.email.split("@")[0].toLowerCase();

      return (
        uId === cleanMember ||
        uEmail === cleanMember ||
        cleanMember === uUsername ||
        cleanMember.startsWith(`@${uUsername}:`) ||
        cleanMember === uId
      );
    });

    return matchUser ? matchUser.status : "online";
  }

  if (!currentUser && isConnecting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-base font-semibold text-muted-foreground animate-pulse font-heading">
            Syncing homeserver session...
          </p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Lock className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground font-heading">
              Vigilant HQ
            </span>
            <span className="text-xs text-muted-foreground">
              {currentUser?.email.split("@")[1] || "localhost"}
            </span>
          </div>
        </div>

        {/* Server Sync status badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border">
          {isSynced ? (
            <>
              <Wifi className="size-3.5 text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                Synced
              </span>
            </>
          ) : (
            <>
              <WifiOff className="size-3.5 text-amber-500 animate-spin" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                Connecting
              </span>
            </>
          )}
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="p-3 border-b border-sidebar-border/60">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Navigation Lists */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar text-sm">
        {/* CHANNELS SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            <span>Channels</span>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="p-1 hover:bg-sidebar-accent hover:text-foreground rounded transition-colors"
              title="Create channel"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredChannels.length === 0 ? (
              <span className="block px-2.5 py-1.5 text-sm text-muted-foreground/60 italic">
                No channels found
              </span>
            ) : (
              filteredChannels.map((room) => {
                const isActive = pathname === `/dashboard/c/${room.id}`;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveRoomId(room.id);
                      router.push(`/dashboard/c/${room.id}`);
                      setMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors font-medium text-sm relative group",
                      isActive
                        ? "bg-sidebar-accent text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {room.isEncrypted ? (
                        <Lock className="size-4 shrink-0 text-primary" />
                      ) : (
                        <Hash className="size-4 shrink-0" />
                      )}
                      <span className="truncate">{room.name}</span>
                    </div>

                    {room.unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {room.unreadCount}
                      </span>
                    ) : (
                      <ChevronRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* DIRECT MESSAGES SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            <span>Direct Messages</span>
            <button
              onClick={() => setStartDmModalOpen(true)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Start Direct Message"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredDMs.length === 0 ? (
              <span className="block px-2.5 py-1.5 text-sm text-muted-foreground/60 italic">
                No conversations
              </span>
            ) : (
              filteredDMs.map((room) => {
                const isActive = pathname === `/dashboard/dm/${room.id}`;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveRoomId(room.id);
                      router.push(`/dashboard/dm/${room.id}`);
                      setMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors font-medium text-sm relative group",
                      isActive
                        ? "bg-sidebar-accent text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        name={getDMDisplayName(room)}
                        status={getDMDisplayStatus(room)}
                        size="sm"
                      />
                      <span className="truncate">{getDMDisplayName(room)}</span>
                    </div>

                    {room.unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {room.unreadCount}
                      </span>
                    ) : (
                      <ChevronRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/20 relative">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Avatar
              name={currentUser?.name || "User"}
              status={currentUser?.status || "online"}
              size="md"
              className="border border-border/80 group-hover:border-primary/50 transition-colors"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {currentUser?.name}
              </span>
              <span className="text-xs text-muted-foreground truncate uppercase tracking-wider font-semibold">
                {currentUser?.status || "online"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>

        {/* User Presence Status Dropdown */}
        {showStatusDropdown && (
          <div className="absolute bottom-16 left-3 w-44 rounded-xl bg-card border border-border shadow-lg p-1.5 z-30 glass animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Change Status
            </div>
            <div className="h-px bg-border my-1" />
            {(["online", "busy", "away", "offline"] as const).map((status) => (
              <button
                key={status}
                onClick={() => changeStatus(status)}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-foreground flex items-center gap-2.5 capitalize font-medium"
              >
                <span className={cn(
                  "size-2.5 rounded-full",
                  status === "online" && "bg-emerald-500",
                  status === "busy" && "bg-rose-500",
                  status === "away" && "bg-amber-500",
                  status === "offline" && "bg-zinc-500"
                )} />
                {status}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Main Panel Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Mobile Header Bar */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border/80 bg-sidebar shrink-0 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="size-5.5" />
            </button>
            <span className="text-base font-bold tracking-tight font-heading">Vigilant HQ</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border">
            <Wifi className="size-4 text-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Synced</span>
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col bg-card/10">
          {children}
        </main>

        {/* Mobile sidebar overlay menu */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            {/* Overlay backdrop */}
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Sidebar drawer content */}
            <div className="relative w-64 h-full animate-in slide-in-from-left duration-300">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-background hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground z-50 transition-colors"
              >
                <X className="size-4" />
              </button>
              <SidebarContent />
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Channel"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleCreateRoom}>
              Create Channel
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateRoom} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Channel Name
            </label>
            <Input
              type="text"
              placeholder="Enter channel name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              required
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Topic (Optional)
            </label>
            <Input
              type="text"
              placeholder="Enter channel topic"
              value={newRoomTopic}
              onChange={(e) => setNewRoomTopic(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="size-4 text-primary" />
                Enable E2E Encryption
              </span>
              <span className="text-xs text-muted-foreground max-w-[240px] mt-0.5">
                Encrypt messages with Megolm group keys. Synapse servers will only see ciphertext.
              </span>
            </div>
            <input
              type="checkbox"
              checked={newRoomIsEncrypted}
              onChange={(e) => setNewRoomIsEncrypted(e.target.checked)}
              className="accent-primary size-4.5 cursor-pointer"
            />
          </div>
        </form>
      </Modal>

      {/* Start Direct Message Modal */}
      <Modal
        isOpen={startDmModalOpen}
        onClose={() => {
          setStartDmModalOpen(false);
          setDmError("");
        }}
        title="Start Direct Message"
        footer={
          <>
            <Button variant="outline" onClick={() => setStartDmModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={(e) => handleStartDM(e)}>
              Open Chat
            </Button>
          </>
        }
      >
        <form onSubmit={handleStartDM} className="space-y-4 font-sans">
          {dmError && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{dmError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Select or Type Registered Username / Email
            </label>
            <Input
              type="text"
              placeholder="e.g. Harshada or Rushikesh"
              value={targetDmInput}
              onChange={(e) => {
                setTargetDmInput(e.target.value);
                setDmError("");
              }}
              required
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Valid Registered Users Directory
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-1.5 bg-muted/20 custom-scrollbar">
              {users.filter((u) => u.name.toLowerCase() !== (currentUser?.name || "").toLowerCase()).length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No other registered users found yet. Team members who sign up will appear here automatically.
                </div>
              ) : (
                users
                  .filter((u) => u.name.toLowerCase() !== (currentUser?.name || "").toLowerCase())
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setTargetDmInput(u.email);
                        setDmError("");
                        handleStartDM(undefined, u.email);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted text-left transition-colors font-medium text-sm group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} status={u.status} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground">{u.email}</span>
                        </div>
                      </div>
                      <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Chat →
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
