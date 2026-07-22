import Link from "next/link";
import { Lock, Shield, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-background text-foreground min-h-screen selection:bg-primary/30 font-sans">
      {/* Navigation Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 bg-sidebar/30 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Lock className="size-5" />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            Vigilant
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
          >
            Register Device
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center px-6 py-16 md:py-24 max-w-5xl mx-auto w-full relative overflow-hidden">
        {/* Glow decoration (Indigo/Purple accent) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

        <div className="text-center space-y-6 max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="size-4" />
            Secure Corporate Messaging App
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] font-heading">
            Secure corporate chat,{" "}
            <span className="bg-gradient-to-r from-primary via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              controlled by you.
            </span>
          </h1>
          
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Vigilant is a safe, secure, and private messaging application designed specifically for business teams. Keep your team's chats, documents, and corporate files strictly inside your company.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
            >
              Access Demo Workspace
              <ArrowRight className="size-4.5" />
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-muted/40 border border-border/80 text-foreground text-sm font-semibold hover:bg-muted/60 transition-all"
            >
              Register Device
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 relative z-10">
          {/* Card 1: Privacy */}
          <div className="rounded-xl border border-border bg-card/30 p-6 glass-card space-y-3.5">
            <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Lock className="size-5.5" />
            </div>
            <h3 className="font-heading font-bold text-base text-foreground">Total Privacy</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every message and document is private. Only you and your approved team members can read them.
            </p>
          </div>

          {/* Card 2: Ownership */}
          <div className="rounded-xl border border-border bg-card/30 p-6 glass-card space-y-3.5">
            <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Shield className="size-5.5" />
            </div>
            <h3 className="font-heading font-bold text-base text-foreground">Company Ownership</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Your messages stay on your own company servers. You retain complete control over your communication history.
            </p>
          </div>

          {/* Card 3: Simplicity */}
          <div className="rounded-xl border border-border bg-card/30 p-6 glass-card space-y-3.5">
            <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <CheckCircle2 className="size-5.5" />
            </div>
            <h3 className="font-heading font-bold text-base text-foreground">Simple Setup</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Create chat channels, share files, send pictures, and message your teammates instantly in a clean corporate workspace.
            </p>
          </div>
        </div>

      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border/40 text-center text-xs text-muted-foreground select-none mt-auto">
        <p>© 2026 Vigilant. The Secure Messaging App for Corporate Teams. All rights reserved.</p>
      </footer>
    </div>
  );
}
