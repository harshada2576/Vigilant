"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, ShieldAlert } from "lucide-react";
import { matrixService } from "@/services/matrixService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    setError("");
    setLoading(true);

    try {
      await matrixService.register(name, email);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please contact your system administrator.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 bg-background text-foreground min-h-screen relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-8 relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Lock className="size-5" />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            Vigilant
          </span>
        </Link>
      </div>

      {/* Register Box */}
      <div className="w-full max-w-md rounded-2xl border border-border p-8 bg-card/30 glass-card relative z-10 space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Register Device Key
          </h2>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-sm text-rose-400">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 font-sans">
          <div className="space-y-2">
            <label className="text-base font-semibold text-foreground/90">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="h-11 text-base bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-base font-semibold text-foreground/90">
              Corporate Email Address
            </label>
            <Input
              type="email"
              placeholder="Enter your corporate email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-11 text-base bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-base font-semibold text-foreground/90">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-11 text-base bg-muted/20"
            />
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full h-12 text-base font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 mt-3"
            disabled={loading}
          >
            {loading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                Register Account
                <ArrowRight className="size-5" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-base text-muted-foreground">
          Already have a device token?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>

      <footer className="mt-12 text-sm text-muted-foreground relative z-10 select-none">
        Self-Hosted Workspace • Secure Connection
      </footer>
    </div>
  );
}
