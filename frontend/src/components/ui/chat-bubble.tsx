import * as React from "react";
import { ShieldCheck, FileText, Download, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { matrixService } from "@/services/matrixService";
import { mediaBytesMatchMime, safeHttpUrl, safeMediaMime } from "@/services/matrixPayload.mjs";

interface ChatBubbleProps {
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
  isMe: boolean;
  isEncrypted?: boolean;
  type?: "text" | "image" | "file";
  fileName?: string;
  fileUrl?: string;
  mediaSource?: string;
  mimeType?: string;
  className?: string;
}

export function ChatBubble({
  senderName,
  senderAvatar,
  content,
  timestamp,
  isMe,
  isEncrypted = false,
  type = "text",
  fileName,
  fileUrl,
  mediaSource,
  mimeType,
  className,
}: ChatBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const [downloadedMedia, setDownloadedMedia] = React.useState<{
    source: string;
    url: string;
  } | null>(null);
  const safeFileUrl = safeHttpUrl(fileUrl);
  const resolvedUrl = safeFileUrl || (downloadedMedia?.source === mediaSource ? downloadedMedia?.url : undefined);
  const [mediaState, setMediaState] = React.useState<{
    source: string;
    error?: string;
  } | null>(null);
  const [mediaAttempt, setMediaAttempt] = React.useState(0);
  const loadingMedia = Boolean(
    mediaSource && !safeFileUrl && mediaState?.source !== mediaSource
  );
  const mediaError = mediaState?.source === mediaSource ? mediaState?.error || "" : "";

  React.useEffect(() => {
    if (safeFileUrl || !mediaSource) return;
    {
      let isMounted = true;
      let objectUrl: string | undefined;
      matrixService.getMedia(mediaSource).then((bytes) => {
        if (!isMounted) return;
        try {
          const supportedMime = safeMediaMime(type, mimeType);
          if (!supportedMime || !mediaBytesMatchMime(bytes, supportedMime)) {
            throw new Error("Matrix media content did not match a supported file type.");
          }
          const blob = new Blob([bytes.slice().buffer], {
            type: supportedMime,
          });
          objectUrl = URL.createObjectURL(blob);
          setDownloadedMedia({ source: mediaSource, url: objectUrl });
          setMediaState({ source: mediaSource });
        } catch {
          setMediaState({ source: mediaSource, error: "Matrix media could not be displayed." });
        }
      }).catch((error: unknown) => {
        if (isMounted) {
          setMediaState({
            source: mediaSource,
            error: error instanceof Error ? error.message : "Matrix media could not be loaded.",
          });
        }
      });

      return () => {
        isMounted = false;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
  }, [safeFileUrl, mediaSource, mimeType, type, mediaAttempt]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatFullTimestamp = (ts: number) => {
    const date = new Date(ts);
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

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) return `Today at ${timeStr}`;
    if (isYesterday) return `Yesterday at ${timeStr}`;

    const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    return `${dateStr} at ${timeStr}`;
  };

  const copyToClipboard = () => {
    if (type === "text") {
      navigator.clipboard.writeText(content);
    } else if (fileName) {
      navigator.clipboard.writeText(fileName);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3.5 max-w-full px-4 py-3 hover:bg-muted/10 transition-colors duration-150 rounded-lg relative",
        isMe && "flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <Avatar name={senderName} src={senderAvatar} size="sm" className="mt-0.5" />

      {/* Message Box */}
      <div className={cn("flex flex-col max-w-[75%]", isMe && "items-end")}>
        {/* Header (Sender Name & Time) */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-sm font-semibold text-foreground/90">{senderName}</span>
          <span className="text-xs text-muted-foreground cursor-help" title={formatFullTimestamp(timestamp)}>
            {formatTime(timestamp)}
          </span>
          {isEncrypted && (
            <span title="End-to-End Encrypted via Megolm">
              <ShieldCheck className="size-4 text-primary" />
            </span>
          )}
        </div>

        {/* Content Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-base shadow-sm relative break-words whitespace-pre-wrap leading-relaxed transition-all",
            isMe
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-muted/20 text-foreground border border-border rounded-tl-none"
          )}
        >
          {type === "text" && <p className="leading-normal">{content}</p>}

          {type === "image" && (
            <div className="flex flex-col gap-2.5">
              {content && <p className="mb-1">{content}</p>}
              <div className="overflow-hidden rounded-lg border border-border bg-black/20 max-w-xs sm:max-w-md min-h-[140px] max-h-72 flex items-center justify-center p-1">
                {mediaError ? (
                  <div role="alert" className="px-3 py-6 text-center text-xs text-destructive">
                    <p>{mediaError}</p>
                    <button type="button" onClick={() => { setMediaState(null); setMediaAttempt((attempt) => attempt + 1); }} className="mt-2 font-semibold underline underline-offset-2">Retry media</button>
                  </div>
                ) : loadingMedia ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-8">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Loading media…</span>
                  </div>
                ) : resolvedUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={resolvedUrl} 
                    alt={fileName || "Image"} 
                    className="w-full object-contain max-h-68 rounded transition-transform duration-200 hover:scale-[1.01]" 
                  />
                ) : (
                  <div className="text-xs text-muted-foreground py-6">Image attachment unavailable</div>
                )}
              </div>
            </div>
          )}

          {type === "file" && (
            <div className="flex items-center gap-3 bg-background/40 dark:bg-background/25 rounded-lg p-3 border border-border/80 min-w-[220px]">
              <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
                {loadingMedia ? <Loader2 className="size-5 animate-spin" /> : <FileText className="size-5.5" />}
              </div>
              <div className="flex flex-col min-w-[110px] flex-1 max-w-[240px]">
                <span className="text-sm font-medium truncate text-foreground" title={fileName}>
                  {fileName || "Document.pdf"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {mediaError || (loadingMedia ? "Loading media…" : "PDF Document")}
                </span>
              </div>
              {mediaError && (
                <button type="button" onClick={() => { setMediaState(null); setMediaAttempt((attempt) => attempt + 1); }} className="text-[10px] text-destructive underline underline-offset-2">Retry</button>
              )}
              <a
                href={resolvedUrl || "#"}
                download={fileName || "document.pdf"}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "p-1.5 hover:bg-muted/50 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0",
                  (!resolvedUrl || loadingMedia) && "pointer-events-none opacity-40"
                )}
                title={`Download ${fileName || "document.pdf"}`}
              >
                <Download className="size-4.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions overlay on hover */}
      <div
        className={cn(
          "absolute top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5 shadow-md z-10",
          isMe ? "left-4" : "right-4"
        )}
      >
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={type === "text" ? "Copy message text" : "Copy file name"}
        >
          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
export default ChatBubble;
