"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { matrixService } from "@/services/matrixService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await matrixService.register(name, email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please contact your system administrator.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 bg-background text-foreground min-h-screen relative overflow-hidden font-sans">
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
          <p className="text-sm text-muted-foreground/80">
            Join your sovereign corporate workspace
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-sm text-rose-400">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Sarah Connor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="h-10 text-base bg-muted/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Corporate Email Address
            </label>
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-10 text-base bg-muted/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-10 text-base bg-muted/20 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">
              Confirm Password
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="h-10 text-base bg-muted/20"
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
