"use client";

import * as React from "react";
import { 
  ShieldCheck, 
  Terminal, 
  Database, 
  Key, 
  Activity, 
  MessageSquareCode, 
  HelpCircle,
  Link as LinkIcon
} from "lucide-react";
import { useMatrixStore } from "@/store/matrixStore";

export default function DashboardHome() {
  const currentUser = useMatrixStore((state) => state.currentUser);
  const rooms = useMatrixStore((state) => state.rooms);

  const channelsCount = rooms.filter((r) => r.type === "channel").length;
  const dmsCount = rooms.filter((r) => r.type === "dm").length;

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto custom-scrollbar select-none bg-background/50">
      {/* Welcome Banner */}
      <div className="space-y-3 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading text-foreground">
          Welcome to the Sovereign Room,{" "}
          <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            {currentUser?.name || "Member"}
          </span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
          You are authenticated on the private organization homeserver. All conversations are stored on dedicated Postgres nodes and encrypted locally.
        </p>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl border border-border bg-card/25 glass-card flex flex-col justify-between h-28">
          <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Channels</span>
          <span className="text-3xl font-extrabold text-foreground font-heading">{channelsCount}</span>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/25 glass-card flex flex-col justify-between h-28">
          <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Direct Chats</span>
          <span className="text-3xl font-extrabold text-foreground font-heading">{dmsCount}</span>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/25 glass-card flex flex-col justify-between h-28">
          <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">E2EE Rooms</span>
          <span className="text-3xl font-extrabold text-primary font-heading">
            {rooms.filter((r) => r.isEncrypted).length}
          </span>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/25 glass-card flex flex-col justify-between h-28">
          <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Devices Verified</span>
          <span className="text-3xl font-extrabold text-emerald-500 font-heading">1 / 1</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Onboarding Tasks card */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card/15 p-6 glass-card space-y-5">
          <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
            <MessageSquareCode className="size-5 text-primary" />
            Quick Start Guide
          </h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">1</span>
              <div>
                <h4 className="font-bold text-foreground mb-0.5">Explore the General Channel</h4>
                <p className="leading-relaxed">Join the `#general` channel to chat with bots, developers, and view infrastructure performance logs.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">2</span>
              <div>
                <h4 className="font-bold text-foreground mb-0.5">Check Secure Compliance Channels</h4>
                <p className="leading-relaxed">Open `#security-compliance` 🔒 to see how Megolm group chat key handshakes and PDF document downlinks are rendered natively.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">3</span>
              <div>
                <h4 className="font-bold text-foreground mb-0.5">Start Direct Messages</h4>
                <p className="leading-relaxed">Select Harshada or Alice from the sidebar list. Send a test message and witness immediate mock responders simulating Synapse event relays.</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Diagnostics status panel */}
        <div className="rounded-xl border border-border bg-card/15 p-6 glass-card space-y-5">
          <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
            <Activity className="size-5 text-emerald-500" />
            Server Diagnostics
          </h3>
          <div className="space-y-4 font-sans text-sm">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <Database className="size-4 shrink-0" />
                PostgreSQL Status
              </span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
                Healthy
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <LinkIcon className="size-4 shrink-0" />
                MinIO Media S3
              </span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <Key className="size-4 shrink-0" />
                Megolm Key Escrow
              </span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <Terminal className="size-4 shrink-0" />
                Synapse Version
              </span>
              <span className="text-xs font-semibold text-foreground">
                v1.112.0
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground flex items-center gap-2">
                <HelpCircle className="size-4 shrink-0" />
                Matrix Spec SDK
              </span>
              <span className="text-xs font-semibold text-foreground">
                v1.11 WASM
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
