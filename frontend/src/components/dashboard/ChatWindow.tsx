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
  FileText
} from "lucide-react";
import { useMatrixStore } from "@/store/matrixStore";
import { matrixService } from "@/services/matrixService";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatWindowProps {
  roomId: string;
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
  const [text, setText] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<{
    file: File;
    name: string;
    isImage: boolean;
    fileUrl: string;
  } | null>(null);
  
  // Refs
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Find active room metadata
  const room = rooms.find((r) => r.id === roomId);
  const messages = allMessages[roomId] || [];

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isUploading, pendingFile]);

  // Sync messages on storage event (cross-tab) or custom event (same tab)
  React.useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      // Only react to changes for this specific room's messages
      if (
        event.key === null ||
        event.key === `vigilant_shared_messages_${roomId}`
      ) {
        matrixService.syncRoomMessages(roomId);
      }
    };

    const handleSameTabEvent = () => {
      if (roomId) matrixService.syncRoomMessages(roomId);
    };

    window.addEventListener("storage", handleStorageEvent as EventListener);
    window.addEventListener("vigilant_message_sent", handleSameTabEvent);

    // Poll every 1.5s as fallback (e.g. when Synapse delivers via bridge callback)
    const interval = setInterval(handleSameTabEvent, 1500);
    return () => {
      window.removeEventListener("storage", handleStorageEvent as EventListener);
      window.removeEventListener("vigilant_message_sent", handleSameTabEvent);
      clearInterval(interval);
    };
  }, [roomId]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!text.trim() && !pendingFile) || !room) return;

    if (pendingFile) {
      let fileData: Uint8Array | undefined;
      try {
        const buffer = await pendingFile.file.arrayBuffer();
        fileData = new Uint8Array(buffer);
      } catch (err) {
        console.warn("Failed to convert file buffer to Uint8Array:", err);
      }

      matrixService.sendMessage(
        room.id,
        text.trim() || (pendingFile.isImage ? "" : `Attachment: ${pendingFile.name}`),
        pendingFile.isImage ? "image" : "file",
        pendingFile.name,
        pendingFile.fileUrl,
        fileData
      );
      setPendingFile(null);
      setText("");
    } else {
      matrixService.sendMessage(room.id, text.trim(), "text");
      setText("");
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      alert("Only Images and PDF files are allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileUrl = reader.result as string;
      setPendingFile({
        file,
        name: file.name,
        isImage,
        fileUrl
      });
    };
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
    const currentEmail = currentUser?.email?.toLowerCase() || "";
    const currentName = currentUser?.name?.toLowerCase() || "";

    const otherMember = room.members.find(
      (m) =>
        m.toLowerCase() !== currentId &&
        m.toLowerCase() !== currentEmail &&
        m.toLowerCase() !== currentName
    ) || room.name;

    const rawMember = otherMember.trim();
    const cleanMember = rawMember.toLowerCase();
    const username = cleanMember.split(":")[0].replace("@", "").toLowerCase();

    // 1. Check in-memory store
    const matchUser = users.find((u) => {
      const uId = u.id.toLowerCase();
      const uEmail = u.email.toLowerCase();
      const uUsername = u.email.split("@")[0].toLowerCase();

      return (
        uId === cleanMember ||
        uEmail === cleanMember ||
        cleanMember === uUsername ||
        cleanMember.startsWith(`@${uUsername}:`)
      );
    });
    if (matchUser) return matchUser.name;

    // 2. Check shared localStorage registered users & map
    if (typeof window !== "undefined") {
      try {
        const regUsers = JSON.parse(localStorage.getItem("vigilant_registered_users") || "[]");
        const regMatch = regUsers.find((u: any) => {
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
  };

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
            {room.topic && (
              <span className="text-xs text-muted-foreground truncate max-w-md">
                {room.topic}
              </span>
            )}
          </div>
        </div>

        {/* Member directory details */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground px-3 py-1 rounded-lg border border-border bg-muted/20">
            <Users className="size-4" />
            <span>{room.members.length} Members</span>
          </div>
        </div>
      </header>

      {/* Message List Panel */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar bg-card/5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="size-11 rounded-full bg-primary/5 text-primary/40 border border-primary/10 flex items-center justify-center mb-3">
              <Hash className="size-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground font-heading">No messages yet</h4>
            <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
              This is the beginning of the {room.type === "channel" ? `#${room.name} channel` : `direct conversation`}.
            </p>
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
                />
              </React.Fragment>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Compose Form */}
      <div className="p-3 border-t border-border bg-sidebar/10 shrink-0">
        {/* Pending file preview bar */}
        {pendingFile && (
          <div className="mb-2 p-2.5 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {pendingFile.isImage ? (
                <img src={pendingFile.fileUrl} alt="preview" className="size-10 rounded object-cover border border-border" />
              ) : (
                <div className="size-10 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  <FileText className="size-5" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">{pendingFile.name}</span>
                <span className="text-[10px] text-muted-foreground">Ready to send. Click Send or press Enter.</span>
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

        <form onSubmit={handleSend} className="flex items-center gap-2 relative">
          {/* File attach button */}
          <button
            type="button"
            onClick={handleAttachClick}
            className="p-2.5 bg-muted/30 hover:bg-muted border border-border hover:border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all"
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

          <Input
            type="text"
            placeholder={
              room.isEncrypted 
                ? "Send encrypted message..." 
                : "Send message..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 h-10 rounded-lg text-sm"
          />

          <Button
            type="submit"
            size="default"
            className="h-10 px-4 shrink-0 flex items-center justify-center"
            disabled={!text.trim() && !pendingFile}
          >
            <Send className="size-4.5" />
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mt-2">
          <span>Press Enter to send</span>
          {room.isEncrypted && (
            <span className="text-primary font-semibold flex items-center gap-1 select-none">
              🔒 End-to-End Encrypted
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
export default ChatWindow;
