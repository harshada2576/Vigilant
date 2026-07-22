import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Loader({ label = "Syncing with homeserver...", size = "md", className }: LoaderProps) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2.5 p-4", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {label && <span className="text-xs text-muted-foreground font-medium animate-pulse font-sans">{label}</span>}
    </div>
  );
}
export default Loader;
