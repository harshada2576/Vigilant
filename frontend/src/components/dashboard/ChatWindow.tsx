"use client";

import * as React from "react";
import {
  Send,
  Paperclip,
  Lock,
  Hash,
  Users,
  ShieldCheck,
  Loader2,
  X,
  FileText,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMatrixStore, User } from "@/store/matrixStore";
import { matrixService } from "@/services/matrixService";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { safeMediaMime } from "@/services/matrixPayload.mjs";
import { Input } from "@/components/ui/input";

interface ChatWindowProps {
  roomId: string;
}

const EMPTY_MESSAGES: ReturnType<typeof useMatrixStore.getState>["messages"][string] = [];

interface PendingAttachment {
  file: File;
  name: string;
  isImage: boolean;
  fileUrl: string;
  mimeType: string;
}

function formatDateDivider(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const currentUser = useMatrixStore((state) => state.currentUser);
  const rooms = useMatrixStore((state) => state.rooms);
  const allMessages = useMatrixStore((state) => state.messages);
  const users = useMatrixStore((state) => state.users);

  // States
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const text = drafts[roomId] || "";
  const setText = (value: string) => setDrafts((current) => ({ ...current, [roomId]: value }));
  const [isSending, setIsSending] = React.useState(false);
  const [sendAcceptedRooms, setSendAcceptedRooms] = React.useState<Record<string, boolean>>({});
  const [loadingMoreRoomId, setLoadingMoreRoomId] = React.useState<string | null>(null);
  const [sendFailure, setSendFailure] = React.useState<{ roomId: string; message: string } | null>(null);
  const [historyFailure, setHistoryFailure] = React.useState<{
    roomId: string;
    message: string;
  } | null>(null);
  const [historyStatus, setHistoryStatus] = React.useState<{
    roomId: string;
    status: "loading" | "loaded" | "error";
  } | null>(null);
  const [pendingFiles, setPendingFiles] = React.useState<Record<string, PendingAttachment | undefined>>({});
  const pendingFile = pendingFiles[roomId] || null;
  const setPendingFile = (file: PendingAttachment | null) => setPendingFiles((current) => ({ ...current, [roomId]: file || undefined }));
  const sendError = sendFailure?.roomId === roomId ? sendFailure.message : "";
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [inviteUserId, setInviteUserId] = React.useState("");
  const [inviteError, setInviteError] = React.useState("");
  const [inviteSuccess, setInviteSuccess] = React.useState("");
  const [isInviting, setIsInviting] = React.useState(false);

  // Refs
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = React.useRef<string | null>(null);
  const isSendingRef = React.useRef(false);
  const isLoadingMoreRef = React.useRef(false);
  const currentRoomIdRef = React.useRef(roomId);
  const mountedRef = React.useRef(false);
  const fileReaderRef = React.useRef<FileReader | null>(null);

  // Find active room metadata
  const room = rooms.find((r) => r.id === roomId);
  const messages = allMessages[roomId] ?? EMPTY_MESSAGES;
  const historyError = historyFailure?.roomId === roomId ? historyFailure.message : "";
  const currentHistoryStatus = historyStatus?.roomId === roomId ? historyStatus.status : "loading";
  const isLoadingMore = loadingMoreRoomId === roomId;
  const hasMore = useMatrixStore((state) => state.hasMoreMessages[roomId] ?? true);

  React.useEffect(() => {
    currentRoomIdRef.current = roomId;
  }, [roomId]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fileReaderRef.current?.readyState === FileReader.LOADING) fileReaderRef.current.abort();
    };
  }, []);

  // Fetch initial 20 messages whenever room changes
  React.useEffect(() => {
    lastMessageIdRef.current = null;
    let active = true;
    matrixService.getRoomHistory(roomId, 20).then(() => {
      if (active) setHistoryStatus({ roomId, status: "loaded" });
    }).catch((error: unknown) => {
      if (active) {
        setHistoryFailure({
          roomId,
          message: error instanceof Error ? error.message : "Could not load room history.",
        });
        setHistoryStatus({ roomId, status: "error" });
      }
    });
    return () => { active = false; };
  }, [roomId]);

  // Auto-resize textarea to fit content (up to ~6 lines)
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

  // Handle scroll-up to load older messages (20 at a time)
  const handleScroll = async () => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || isLoadingMoreRef.current || !hasMore || currentHistoryStatus !== "loaded") return;

    if (container.scrollTop < 60) {
      isLoadingMoreRef.current = true;
      setLoadingMoreRoomId(roomId);
      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;

      try {
        await matrixService.loadMoreHistory(roomId, 20);
        if (mountedRef.current && currentRoomIdRef.current === roomId) setHistoryFailure(null);
      } catch (error) {
        if (mountedRef.current && currentRoomIdRef.current === roomId) {
          setHistoryFailure({
            roomId,
            message: error instanceof Error ? error.message : "Could not load older messages.",
          });
        }
      }

      requestAnimationFrame(() => {
        if (scrollContainerRef.current && currentRoomIdRef.current === roomId) {
          const newScrollHeight = scrollContainerRef.current.scrollHeight;
          const deltaHeight = newScrollHeight - prevScrollHeight;
          scrollContainerRef.current.scrollTop = prevScrollTop + deltaHeight;
        }
        if (mountedRef.current) {
          setLoadingMoreRoomId((activeRoomId) => activeRoomId === roomId ? null : activeRoomId);
        }
        isLoadingMoreRef.current = false;
      });
    }
  };

  // Auto-scroll to bottom only when a new message is appended or room is loaded
  React.useEffect(() => {
    const currentLastMessage = messages[messages.length - 1];
    const currentLastId = currentLastMessage ? currentLastMessage.id : null;

    if (currentLastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = currentLastId;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!text.trim() && !pendingFile) || !room) return;
    if (isSendingRef.current) return;

    isSendingRef.current = true;
    setIsSending(true);
    setSendFailure(null);
    setSendAcceptedRooms((current) => ({ ...current, [roomId]: false }));
    try {
      if (pendingFile) {
        const buffer = await pendingFile.file.arrayBuffer();
        const fileData = new Uint8Array(buffer);

        await matrixService.sendMessage(
          roomId,
          text.trim() || (pendingFile.isImage ? "" : `Attachment: ${pendingFile.name}`),
          pendingFile.isImage ? "image" : "file",
          pendingFile.name,
          pendingFile.fileUrl,
          fileData,
          pendingFile.mimeType
        );
        setPendingFile(null);
        setText("");
      } else {
        await matrixService.sendMessage(roomId, text.trim(), "text");
        setText("");
      }
      if (mountedRef.current) setSendAcceptedRooms((current) => ({ ...current, [roomId]: true }));
    } catch (error) {
      if (mountedRef.current) setSendFailure({
        roomId,
        message: `${error instanceof Error ? error.message : "Message could not be sent."} Matrix did not confirm acceptance; review the room before retrying because a lost response can leave the outcome uncertain.`,
      });
    } finally {
      isSendingRef.current = false;
      if (mountedRef.current) setIsSending(false);
    }
  };

  // Enter sends; Shift+Enter inserts newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;

    const isImage = safeMediaMime("image", file.type) !== undefined;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      setSendFailure({ roomId, message: "Supported images are JPEG, PNG, GIF, WebP, or AVIF. PDF files are also allowed." });
      return;
    }
    if (isPdf && !file.name.toLowerCase().endsWith(".pdf")) {
      setSendFailure({ roomId, message: "PDF attachments must use a .pdf file name." });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSendFailure({ roomId, message: "Attachments must be 25 MB or smaller." });
      return;
    }

    setSendFailure(null);
    if (fileReaderRef.current?.readyState === FileReader.LOADING) fileReaderRef.current.abort();
    const reader = new FileReader();
    reader.onload = () => {
      if (!mountedRef.current) return;
      const fileUrl = reader.result as string;
      if (typeof fileUrl !== "string") {
        setSendFailure({ roomId, message: "The attachment could not be read. Please select it again." });
        return;
      }
      setPendingFile({
        file,
        name: file.name,
        isImage,
        fileUrl,
        mimeType: isPdf ? "application/pdf" : file.type,
      });
    };
    reader.onerror = () => {
      if (mountedRef.current) setSendFailure({ roomId, message: "The attachment could not be read. Please select it again." });
    };
    fileReaderRef.current = reader;
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 select-none text-center p-6 font-sans">
        <h3 className="text-sm font-bold text-foreground mb-1 font-heading">Room not found</h3>
        <p className="text-xs text-muted-foreground">The requested room does not exist or you do not have permission to view it.</p>
      </div>
    );
  }

  // Get display name for DM rooms
  const getRoomDisplayName = () => {
    if (room.type === "channel") return room.name;
    const currentId = currentUser?.id?.toLowerCase() || "";
    const targetUserId = room.directUserId || room.members.find((member) => member.toLowerCase() !== currentId);
    const matchUser = users.find((user) => user.id.toLowerCase() === targetUserId?.toLowerCase());
    if (matchUser) return matchUser.name;
    if (room.name !== room.id) return room.name;
    return targetUserId?.startsWith("@") ? targetUserId.slice(1).split(":")[0] : room.name;
  };

  const getDMStatus = (): User["status"] => {
    if (room.type !== "dm") return undefined;
    const targetUserId = room.directUserId || room.members.find((member) => member.toLowerCase() !== currentUser?.id.toLowerCase());
    return users.find((user) => user.id.toLowerCase() === targetUserId?.toLowerCase())?.status;
  };

  const retryHistory = () => {
    setHistoryFailure(null);
    setHistoryStatus({ roomId, status: "loading" });
    matrixService.getRoomHistory(roomId, 20).then(() => {
      if (currentRoomIdRef.current === roomId) setHistoryStatus({ roomId, status: "loaded" });
    }).catch((error: unknown) => {
      if (currentRoomIdRef.current === roomId) {
        setHistoryFailure({ roomId, message: error instanceof Error ? error.message : "Could not load room history." });
        setHistoryStatus({ roomId, status: "error" });
      }
    });
  };

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const userId = inviteUserId.trim();
    if (isInviting) return;
    if (!/^@[^:\s]+:.+$/.test(userId)) {
      setInviteError("Enter an exact Matrix user ID such as @name:server.org.");
      return;
    }
    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      await matrixService.inviteUser(roomId, userId);
      setInviteSuccess(`Matrix accepted the invitation for ${userId}.`);
      setInviteUserId("");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Matrix could not invite this user.");
    } finally {
      setIsInviting(false);
    }
  };

  const isComposing = isSending;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-background select-none font-sans relative">
      {/* Header bar */}
      <header className="px-4 h-14 border-b border-border flex items-center justify-between bg-sidebar/20 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
            {room.isEncrypted ? (
              <Lock className="size-4.5" />
            ) : (
              <Hash className="size-4.5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-foreground truncate font-heading flex items-center gap-2">
              {getRoomDisplayName()}
              {room.isEncrypted && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary uppercase tracking-wide">
                  <ShieldCheck className="size-3.5" />
                  E2E Encrypted
                </span>
              )}
            </span>
            {room.type === "dm" ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                {getDMStatus() ? (
                  <>
                    <span className={cn(
                      "size-2 rounded-full",
                      getDMStatus() === "online" && "bg-emerald-500",
                      getDMStatus() === "busy" && "bg-rose-500",
                      getDMStatus() === "away" && "bg-amber-500",
                      getDMStatus() === "offline" && "bg-zinc-500"
                    )} />
                    <span className="capitalize">{getDMStatus()}</span>
                  </>
                ) : <span>Presence unavailable</span>}
              </div>
            ) : room.topic ? (
              <span className="text-xs text-muted-foreground truncate max-w-md">
                {room.topic}
              </span>
            ) : null}
          </div>
        </div>

        {/* Member directory details */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setMembersOpen(true); setInviteError(""); setInviteSuccess(""); }}>
            <Users className="size-4" />
            Members
          </Button>
        </div>
      </header>

      {/* Message List Panel */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar bg-card/5"
      >
        {/* Pagination loader at top */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2 animate-pulse">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Loading earlier messages...</span>
          </div>
        )}

        {/* Start of conversation indicator when no older history exists */}
        {!hasMore && messages.length > 0 && (
          <div className="flex items-center justify-center my-6 py-1 select-none">
            <div className="h-px bg-border/40 flex-1 max-w-[120px]" />
            <span className="mx-3 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Beginning of message history
            </span>
            <div className="h-px bg-border/40 flex-1 max-w-[120px]" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="size-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary border border-primary/20 flex items-center justify-center mb-4 shadow-lg shadow-primary/5">
              {room.type === "channel" ? (
                <Hash className="size-8" />
              ) : (
                <Lock className="size-8" />
              )}
            </div>
            <h3 className="text-xl font-bold text-foreground font-heading mb-1.5">
              {historyError ? "History unavailable" : room.type === "channel" ? `#${room.name}` : getRoomDisplayName()}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-4 leading-relaxed">
              {historyError || (currentHistoryStatus === "loading"
                ? "Loading Matrix messages…"
                : room.topic || (room.type === "channel"
                  ? `Welcome to the start of #${room.name}. Share messages, updates, and files with your team.`
                  : `This is the beginning of your private conversation with ${getRoomDisplayName()}.`))}
            </p>
            {historyError && <Button variant="outline" size="sm" onClick={retryHistory}>Retry history</Button>}
          </div>
        ) : (
          messages.map((msg, index) => {
            const dateLabel = formatDateDivider(msg.timestamp);
            const prevDateLabel = index > 0 ? formatDateDivider(messages[index - 1].timestamp) : null;
            const showDivider = index === 0 || dateLabel !== prevDateLabel;

            return (
              <React.Fragment key={msg.id}>
                {showDivider && (
                  <div className="flex items-center justify-center my-4 py-1 select-none">
                    <div className="h-px bg-border/40 flex-1" />
                    <span className="mx-4 text-[11px] font-bold text-muted-foreground px-3 py-1 rounded-full bg-muted/40 border border-border/60 uppercase tracking-wider backdrop-blur shadow-sm">
                      {dateLabel}
                    </span>
                    <div className="h-px bg-border/40 flex-1" />
                  </div>
                )}
                <ChatBubble
                  senderName={msg.senderName}
                  senderAvatar={msg.senderAvatar}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  isMe={msg.senderId === currentUser?.id}
                  isEncrypted={msg.isEncrypted}
                  type={msg.type}
                  fileName={msg.fileName}
                  fileUrl={msg.fileUrl}
                  mediaSource={msg.mediaSource}
                  mimeType={msg.mimeType}
                />
              </React.Fragment>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Compose Form */}
      <div className="p-3 border-t border-border bg-sidebar/10 shrink-0">
        {(sendError || historyError) && (
          <div role="alert" className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{sendError || historyError}</span>
            {historyError && (
              <button type="button" onClick={retryHistory} className="font-semibold underline underline-offset-2">Retry history</button>
            )}
            {sendError && (
              <button type="button" onClick={() => void handleSend()} disabled={isSending} className="font-semibold underline underline-offset-2">Try again</button>
            )}
          </div>
        )}
        {isSending ? (
          <p role="status" className="mb-2 text-xs text-muted-foreground">Sending to Matrix…</p>
        ) : sendAcceptedRooms[roomId] ? (
          <p role="status" className="mb-2 text-xs text-muted-foreground">Matrix accepted the send request. Delivery receipts are not exposed by the installed bridge.</p>
        ) : null}
        {/* Pending file preview bar */}
        {pendingFile && (
          <div className="mb-2 p-2.5 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {pendingFile.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pendingFile.fileUrl} alt="preview" className="size-10 rounded object-cover border border-border" />
              ) : (
                <div className="size-10 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  <FileText className="size-5" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">{pendingFile.name}</span>
                <span className="text-[10px] text-muted-foreground">{isSending ? "Sending attachment to Matrix…" : "Ready to send. Click Send or press Enter."}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Remove attachment"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2 relative">
          {/* File attach button */}
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={isComposing}
            className="p-2.5 bg-muted/30 hover:bg-muted border border-border hover:border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file (Images/PDFs only)"
          >
            <Paperclip className="size-4.5" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf"
          />

          {/* Auto-growing textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={
              "Send message..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isComposing}
            className={cn(
              "flex-1 min-h-[40px] max-h-36 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto custom-scrollbar"
            )}
          />

          <Button
            type="submit"
            size="default"
            className="h-10 px-4 shrink-0 flex items-center justify-center"
            disabled={(!text.trim() && !pendingFile) || isComposing}
          >
            {isSending ? (
              <Loader2 className="size-4.5 animate-spin" />
            ) : (
              <Send className="size-4.5" />
            )}
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mt-2">
          <span>Press Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
      <Modal isOpen={membersOpen} onClose={() => setMembersOpen(false)} title="Room members">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {room.memberListAvailable
              ? "Member data is available for this room."
              : "The installed Matrix bridge does not expose room member data. Member count and membership status are unavailable."}
          </p>
          <form onSubmit={inviteMember} className="space-y-3">
            <label htmlFor="invite-matrix-user" className="block text-sm font-semibold text-foreground">Invite a Matrix user</label>
            <Input id="invite-matrix-user" value={inviteUserId} onChange={(event) => { setInviteUserId(event.target.value); setInviteError(""); setInviteSuccess(""); }} placeholder="@username:server.org" disabled={isInviting} />
            {inviteError && <p role="alert" className="text-xs text-destructive">{inviteError}</p>}
            {inviteSuccess && <p role="status" className="text-xs text-emerald-500">{inviteSuccess}</p>}
            <Button type="submit" disabled={isInviting || !inviteUserId.trim()}>
              {isInviting ? "Inviting…" : "Invite"}
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
export default ChatWindow;
