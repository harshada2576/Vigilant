import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  status?: "online" | "offline" | "away" | "busy";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ name, src, status, size = "md", className }: AvatarProps) {
  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, Math.min(n.length, 2)).toUpperCase();
  };

  const sizeClasses = {
    sm: "size-7 text-[10px]",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
    xl: "size-16 text-lg",
  };

  const statusColors = {
    online: "bg-emerald-500 ring-2 ring-background",
    busy: "bg-rose-500 ring-2 ring-background",
    away: "bg-amber-500 ring-2 ring-background",
    offline: "bg-zinc-500 ring-2 ring-background",
  };

  const statusSizes = {
    sm: "size-2 -bottom-0.5 -right-0.5",
    md: "size-2.5 -bottom-0.5 -right-0.5",
    lg: "size-3 bottom-0 right-0",
    xl: "size-4 bottom-0.5 right-0.5",
  };

  // Generate color palette based on name hash for unique background colors
  const getColorForName = (n: string) => {
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    // Return a nice dark/muted color block for letters in dark mode
    return `hsl(${hue}, 40%, 30%)`;
  };

  const bgStyle = src ? {} : { backgroundColor: getColorForName(name), color: "#f4f4f5" };

  return (
    <div className={cn("relative shrink-0 select-none", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold uppercase tracking-wider overflow-hidden border border-border/40",
          sizeClasses[size]
        )}
        style={bgStyle}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={src} 
            alt={name} 
            className="size-full object-cover" 
            onError={(e) => {
              // If image fails, clear src to trigger letters fallback
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            "absolute rounded-full",
            statusColors[status],
            statusSizes[size]
          )}
        />
      )}
    </div>
  );
}
