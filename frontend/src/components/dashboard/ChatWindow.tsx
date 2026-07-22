"use client";

import * as React from "react";
import { 
  Send, 
  Paperclip, 
  Lock, 
  Hash, 
  Users,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { useMatrixStore } from "@/store/matrixStore";
import { matrixService } from "@/services/matrixService";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const currentUser = useMatrixStore((state) => state.currentUser);
  const rooms = useMatrixStore((state) => state.rooms);
  const allMessages = useMatrixStore((state) => state.messages);
  const users = useMatrixStore((state) => state.users);

  // States
  const [text, setText] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadedFileName, setUploadedFileName] = React.useState("");
  
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
  }, [messages, isUploading]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !room) return;

    matrixService.sendMessage(room.id, text, "text");
    setText("");
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      alert("Only Images and PDF files are allowed in the MVP stack.");
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);

    setTimeout(() => {
      const fileUrl = isImage 
        ? URL.createObjectURL(file) 
        : "/mock-files/document.pdf";
      
      matrixService.sendMessage(
        room.id, 
        isImage ? "" : `Uploaded attachment: ${file.name}`,
        isImage ? "image" : "file",
        file.name,
        fileUrl
      );
      
      setIsUploading(false);
      setUploadedFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 1200);
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
    const otherMemberId = room.members.find((m) => m !== currentUser?.id);
    const otherUser = users.find((u) => u.id === otherMemberId);
    return otherUser ? otherUser.name : room.name;
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
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
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
          ))
        )}

        {/* Fake upload message preview */}
        {isUploading && (
          <div className="flex items-start gap-3 max-w-full px-4 py-2 opacity-60">
            <div className="size-7 rounded-full bg-zinc-800 animate-pulse shrink-0" />
            <div className="flex flex-col max-w-[70%]">
              <span className="text-xs font-semibold text-foreground/80">{currentUser?.name}</span>
              <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-4 py-3 mt-1 border border-border">
                <Loader2 className="size-4.5 animate-spin text-primary shrink-0" />
                <span className="text-sm font-medium text-muted-foreground truncate max-w-xs">
                  Uploading {uploadedFileName}...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Compose Form */}
      <div className="p-3 border-t border-border bg-sidebar/10 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 relative">
          {/* File attach button */}
          <button
            type="button"
            onClick={handleAttachClick}
            className="p-2.5 bg-muted/30 hover:bg-muted border border-border hover:border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all"
            title="Attach file (Images/PDFs only)"
            disabled={isUploading}
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
            disabled={isUploading}
            className="flex-1 h-10 rounded-lg text-sm"
          />

          <Button
            type="submit"
            size="default"
            className="h-10 px-4 shrink-0 flex items-center justify-center"
            disabled={!text.trim() || isUploading}
          >
            <Send className="size-4.5" />
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mt-2">
          <span>Press Enter to send</span>
          {room.isEncrypted && (
            <span className="text-primary font-semibold flex items-center gap-1 select-none">
              🔒 Messages will be scrambled on PostgreSQL homeserver.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
export default ChatWindow;
