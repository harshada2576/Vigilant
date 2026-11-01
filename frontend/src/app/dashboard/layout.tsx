"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Hash, 
  Plus, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Lock,
  AlertCircle,
  Loader2,
  Info,
  UserRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMatrixStore, Room, User } from "@/store/matrixStore";
import { matrixService } from "@/services/matrixService";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import type { MatrixPresence } from "@/types/matrix";

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
  const connectionMode = useMatrixStore((state) => state.connectionMode);
  const connectionError = useMatrixStore((state) => state.connectionError);
  const setActiveRoomId = useMatrixStore((state) => state.setActiveRoomId);

  // Component states
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState("");
  const [createRoomError, setCreateRoomError] = React.useState("");
  const [isCreatingRoom, setIsCreatingRoom] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [startDmModalOpen, setStartDmModalOpen] = React.useState(false);
  const [targetDmInput, setTargetDmInput] = React.useState("");
  const [dmError, setDmError] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<User[]>([]);
  const [directoryError, setDirectoryError] = React.useState("");
  const [statusError, setStatusError] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showSyncInfoModal, setShowSyncInfoModal] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [isStartingDm, setIsStartingDm] = React.useState(false);
  const [selectedDirectoryUser, setSelectedDirectoryUser] = React.useState<User | null>(null);
  const [profilePresenceLookup, setProfilePresenceLookup] = React.useState<{
    userId: string;
    status?: User["status"];
    presence?: MatrixPresence;
    statusMessage?: string;
    error?: string;
    loading: boolean;
  } | null>(null);
  const profilePresenceRequestRef = React.useRef(0);

  const openDirectoryProfile = (user: User) => {
    profilePresenceRequestRef.current += 1;
    setSelectedDirectoryUser(user);
    setProfilePresenceLookup({ userId: user.id, loading: false });
  };

  const closeDirectoryProfile = () => {
    profilePresenceRequestRef.current += 1;
    setSelectedDirectoryUser(null);
  };

  const loadProfilePresence = async () => {
    const user = selectedDirectoryUser;
    if (!user || profilePresenceLookup?.loading) return;
    const requestId = ++profilePresenceRequestRef.current;
    setProfilePresenceLookup({ userId: user.id, loading: true });
    try {
      const snapshot = await matrixService.getUserPresence(user.id);
      if (profilePresenceRequestRef.current === requestId) {
        setProfilePresenceLookup({ userId: user.id, ...snapshot, loading: false });
      }
    } catch (error) {
      if (profilePresenceRequestRef.current === requestId) {
        setProfilePresenceLookup({ userId: user.id, error: error instanceof Error ? error.message : "Matrix presence could not be loaded.", loading: false });
      }
    }
  };

  // Debounced homeserver user directory search
  React.useEffect(() => {
    if (!startDmModalOpen) {
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setDirectoryError("");
      try {
        const results = await matrixService.searchUsers(targetDmInput);
        if (!active) return;
        setSearchResults(
          results.filter(
            (u) =>
              u.id.toLowerCase() !== currentUser?.id?.toLowerCase() &&
              u.name.toLowerCase() !== currentUser?.name?.toLowerCase()
          )
        );
      } catch (error) {
        if (!active) return;
        setSearchResults([]);
        setDirectoryError(error instanceof Error ? error.message : "Matrix user search failed.");
      } finally {
        if (active) setIsSearching(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [targetDmInput, startDmModalOpen, currentUser]);

  // Initialize service
  React.useEffect(() => {
    matrixService.init();
  }, []);

  React.useEffect(() => () => { profilePresenceRequestRef.current += 1; }, []);

  // Check auth and redirect smoothly
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const state = useMatrixStore.getState();
      if (!state.currentUser && !state.isConnecting) {
        if (state.connectionMode === "error") {
          setAuthChecked(true);
        } else {
          router.push("/login");
        }
      } else if (state.currentUser) {
        setAuthChecked(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [currentUser, isConnecting, router]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await matrixService.logout();
      window.location.href = "/";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout could not be confirmed by Matrix.";
      useMatrixStore.getState().setConnectionMode("error");
      useMatrixStore.getState().setConnectionError({ phase: "auth", message, retryable: false });
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || isCreatingRoom) return;
    setIsCreatingRoom(true);
    setCreateRoomError("");
    try {
      const newRoom = await matrixService.createRoom(newRoomName, "channel");
      setNewRoomName("");
      setCreateModalOpen(false);
      setActiveRoomId(newRoom.id);
      router.push(`/dashboard/c/${newRoom.id}`);
    } catch (error) {
      setCreateRoomError(error instanceof Error ? error.message : "Matrix could not create this room.");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleStartDM = async (e?: React.FormEvent, selectedUser?: string) => {
    e?.preventDefault();
    const queryName = (selectedUser || targetDmInput).trim();
    if (!queryName || isStartingDm) return;

    setDmError("");
    const cleanQuery = queryName.replace("#", "").trim().toLowerCase();

    const targetObj = users.find(
      (u) =>
        u.id.toLowerCase() === cleanQuery
    );

    const targetInput = targetObj ? targetObj.id : queryName;

    setIsStartingDm(true);
    try {
      const dmRoom = await matrixService.createRoom(targetInput, "dm");
      setTargetDmInput("");
      setDmError("");
      setStartDmModalOpen(false);
      setActiveRoomId(dmRoom.id);
      router.push(`/dashboard/dm/${dmRoom.id}`);
    } catch (err) {
      console.error("Failed to start DM:", err);
      setDmError(err instanceof Error ? err.message : "Failed to open a Matrix direct message.");
    } finally {
      setIsStartingDm(false);
    }
  };

  const changeStatus = async (status: User["status"]) => {
    if (currentUser && status) {
      setStatusError("");
      try {
        await matrixService.setUserPresence(status);
      } catch (error) {
        setStatusError(error instanceof Error ? error.message : "Could not update Matrix presence.");
      }
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

    // Prefer the exact peer ID when the bridge provides it.
    const seenTargets = new Set<string>();
    return matching.filter((room) => {
      const targetMember = room.directUserId?.toLowerCase() || room.id;

      if (seenTargets.has(targetMember.toLowerCase())) return false;
      seenTargets.add(targetMember.toLowerCase());
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, searchQuery, currentUser, users]);

  function getDMDisplayName(room: Room) {
    const targetUserId = room.directUserId || room.members.find(
      (member) => member.toLowerCase() !== currentUser?.id.toLowerCase()
    );
    const matchUser = targetUserId && users.find((user) => user.id.toLowerCase() === targetUserId.toLowerCase());
    if (matchUser) return matchUser.name;
    if (room.name !== room.id) return room.name;
    const localpart = targetUserId?.startsWith("@") ? targetUserId.slice(1).split(":")[0] : "";
    return localpart || room.name;
  }

  function getDMDisplayStatus(room: Room) {
    const targetUserId = room.directUserId || room.members.find(
      (member) => member.toLowerCase() !== currentUser?.id.toLowerCase()
    );
    return users.find((user) => user.id.toLowerCase() === targetUserId?.toLowerCase())?.status;
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

  if (!currentUser && authChecked && connectionMode === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card/30 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            <h1 className="font-semibold">{connectionError?.phase === "auth" ? "Matrix session unavailable" : "Matrix session could not be restored"}</h1>
          </div>
          <p role="alert" className="text-sm text-muted-foreground">
            {connectionError?.message || "Check the Matrix homeserver configuration, then retry or sign in."}
          </p>
          <div className="flex flex-wrap gap-2">
            {connectionError?.retryable && (
              <Button variant="outline" onClick={() => void matrixService.init()}>
                Retry session restore
              </Button>
            )}
            <Button variant="default" onClick={() => router.push("/login")}>
              Go to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderSidebarContent = () => (
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
              {currentUser?.id.split(":")[1] || "Matrix homeserver"}
            </span>
          </div>
        </div>

        {/* Server Sync status badge */}
        <div className="flex items-center">
          {connectionMode === "authenticated" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>Signed in · Sync unknown</span>
            </div>
          ) : connectionMode === "connecting" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              <Loader2 className="size-3 animate-spin text-amber-400" />
              <span>Connecting</span>
            </div>
          ) : (
            <button
              onClick={() => setShowSyncInfoModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              title="Click for Connection Details"
            >
              <span className="size-2 rounded-full bg-primary" />
              <span>{connectionMode === "error" ? "Connection error" : "Disconnected"}</span>
            </button>
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

                    {(room.unreadCount ?? 0) > 0 ? (
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

                    {(room.unreadCount ?? 0) > 0 ? (
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
              size="md"
              className="border border-border/80 group-hover:border-primary/50 transition-colors"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {currentUser?.name}
              </span>
              <span className="text-xs text-muted-foreground truncate uppercase tracking-wider font-semibold">
                {currentUser?.status ? `Last update accepted: ${currentUser.status}` : "Presence not checked"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>

        {statusError && (
          <p role="alert" className="mt-2 text-xs text-destructive">{statusError}</p>
        )}

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

  if (!authChecked && !currentUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center animate-pulse">
            <Lock className="size-5.5" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Restoring secure session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-full">
        {renderSidebarContent()}
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
            <span className={cn("size-2 rounded-full", connectionMode === "authenticated" ? "bg-emerald-500" : connectionMode === "connecting" ? "bg-amber-500" : "bg-zinc-500")} />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {connectionMode === "authenticated" ? "Signed in · Sync unknown" : connectionMode === "connecting" ? "Connecting" : connectionMode === "error" ? "Connection error" : "Disconnected"}
            </span>
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
              {renderSidebarContent()}
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
            <Button variant="default" type="submit" form="create-channel-form" disabled={isCreatingRoom}>
              {isCreatingRoom ? "Creating…" : "Create Channel"}
            </Button>
          </>
        }
      >
        <form id="create-channel-form" onSubmit={handleCreateRoom} className="space-y-4 font-sans">
          {createRoomError && <p role="alert" className="text-xs text-destructive">{createRoomError}</p>}
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

          <p className="text-xs text-muted-foreground">The installed Matrix bridge creates a named room. Topic and encryption controls are unavailable in this bridge version.</p>
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
            <Button variant="default" type="button" disabled={isStartingDm} onClick={() => handleStartDM()}>
              {isStartingDm ? "Opening…" : "Open Chat"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleStartDM} className="space-y-4 font-sans">
          {(dmError || directoryError) && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{dmError || directoryError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Search Matrix users or enter an exact Matrix user ID
            </label>
            <Input
              type="text"
              placeholder="@username:server.org"
              value={targetDmInput}
              onChange={(e) => {
                setTargetDmInput(e.target.value);
                setDmError("");
              }}
              required
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Matrix Directory Results
              </span>
              {isSearching && (
                <div className="flex items-center gap-1.5 text-xs text-primary animate-pulse font-medium">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Searching...</span>
                </div>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-1.5 bg-muted/20 custom-scrollbar">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {isSearching ? (
                    "Querying Matrix homeserver user directory..."
                  ) : targetDmInput.trim() ? (
                    `No users found matching "${targetDmInput}". Enter an exact Matrix ID like @username:domain to start a chat directly.`
                  ) : (
                    "Type a name, username, or Matrix ID above to search all accounts."
                  )}
                </div>
              ) : (
                searchResults.map((u) => (
                  <div key={u.id} className="w-full flex items-center gap-1 px-2 py-2 rounded-md hover:bg-muted text-sm">
                    <button
                      type="button"
                      onClick={() => handleStartDM(undefined, u.id)}
                      disabled={isStartingDm}
                      className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                    >
                      <Avatar name={u.name} src={u.avatarUrl} status={u.status} size="sm" />
                      <span className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">{u.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{u.id}</span>
                      </span>
                    </button>
                    <button type="button" aria-label={`View available profile details for ${u.id}`} onClick={() => openDirectoryProfile(u)} className="p-2 rounded hover:bg-background text-muted-foreground" title="Profile details">
                      <UserRound className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Sign Out"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sign Out
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Are you sure you want to sign out of this Matrix account on this device? The local session will be cleared; the bridge will also request a remote Matrix logout.
        </p>
      </Modal>

      {/* Connection Architecture Info Modal */}
      <Modal
        isOpen={showSyncInfoModal}
        onClose={() => setShowSyncInfoModal(false)}
        title="Connection Architecture Status"
        footer={
          <>
            {connectionMode === "error" && connectionError?.retryable && (
              <Button variant="outline" onClick={() => void matrixService.init()}>
                Retry connection
              </Button>
            )}
            <Button variant="default" onClick={() => setShowSyncInfoModal(false)}>
              Close
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-muted-foreground font-sans">
          <div className="p-3 rounded-lg border border-primary/25 bg-primary/10 text-foreground flex items-start gap-2.5">
            <Info className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-xs uppercase tracking-wide text-primary">
                {connectionMode === "authenticated" ? "Authenticated · Sync status unknown" : connectionMode === "error" ? "Matrix connection failed" : "Disconnected from Matrix"}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {connectionMode === "authenticated"
                  ? "The bridge restored an authenticated Matrix session. This bridge version does not report sync connection state, so live synchronization cannot be confirmed."
                  : connectionError?.message || (connectionMode === "error"
                    ? "The Matrix session could not be restored. Check the homeserver configuration and retry."
                    : "Vigilant is not connected to a Matrix homeserver. Sign in to restore a valid Matrix session.")}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Connection status</h4>
            <p className="text-xs">Authentication is confirmed by a successful bridge session restore. A sync callback is not present in the installed bridge API.</p>
          </div>
        </div>
      </Modal>
      <Modal isOpen={Boolean(selectedDirectoryUser)} onClose={closeDirectoryProfile} title="Matrix user profile">
        {selectedDirectoryUser && (
          <div className="flex items-center gap-3">
            <Avatar name={selectedDirectoryUser.name} src={selectedDirectoryUser.avatarUrl} status={profilePresenceLookup?.userId === selectedDirectoryUser.id ? profilePresenceLookup.status : undefined} size="lg" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{selectedDirectoryUser.name}</p>
              <p className="text-xs break-all">{selectedDirectoryUser.id}</p>
              <p className="text-xs mt-2">
                {profilePresenceLookup?.userId !== selectedDirectoryUser.id || profilePresenceLookup.loading
                  ? "Presence has not been loaded."
                  : profilePresenceLookup.error
                    ? "Presence unavailable because the lookup failed."
                    : `Matrix presence: ${profilePresenceLookup.presence || "unknown"}${profilePresenceLookup.status ? ` (${profilePresenceLookup.status})` : ""}`}
              </p>
              {profilePresenceLookup?.statusMessage && <p className="text-xs mt-1">{profilePresenceLookup.statusMessage}</p>}
              <p className="text-xs mt-1">Additional profile fields are unavailable in the installed bridge.</p>
              {profilePresenceLookup?.error && <p role="alert" className="text-xs text-destructive mt-1">{profilePresenceLookup.error}</p>}
              <Button variant="outline" size="sm" className="mt-3" disabled={profilePresenceLookup?.loading} onClick={() => void loadProfilePresence()}>
                {profilePresenceLookup?.loading ? "Loading presence…" : "Load current presence"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
