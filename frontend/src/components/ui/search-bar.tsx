import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search channels or users...", className }: SearchBarProps) {
  // Listen for Ctrl+K / Cmd+K to focus search input
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8.5 pl-9 pr-8 text-xs bg-muted/30 hover:bg-muted/50 focus:bg-muted/40 text-foreground placeholder:text-muted-foreground rounded-lg border border-border/60 transition-all focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
      />
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 select-none pointer-events-none px-1.5 py-0.5 rounded bg-muted/80 text-[9px] font-medium text-muted-foreground border border-border/50">
        <span>⌘</span>
        <span>K</span>
      </div>
    </div>
  );
}
export default SearchBar;
