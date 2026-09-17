"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/branding/brand-logo";
import { withBasePath } from "@/lib/base-path";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Branding } from "@/lib/frappe/types";

export function StaffLoginForm({
  branding,
  appTitle,
  companyName,
}: {
  branding?: Branding | null;
  appTitle: string;
  companyName: string;
}) {
  const router = useRouter();
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(withBasePath("/api/beauty/auth/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usr, pwd }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Login failed");
      }
      router.push("/staff/reception");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[image:var(--bc-gradient-soft)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-[color:var(--bc-accent)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-8 h-64 w-64 rounded-full bg-[color:var(--bc-secondary)]/15 blur-3xl"
      />

      <main className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo
              branding={branding}
              alt={companyName}
              className="h-10 w-auto max-w-[220px] object-contain sm:h-12"
              fallback={
                <p className="font-display text-2xl font-bold tracking-tight text-[color:var(--bc-heading)]">
                  {appTitle}
                </p>
              }
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bc-muted)]">
            Staff portal
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[color:var(--bc-text)]">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-[color:var(--bc-muted)]">
            Reception, POS, beauticians, and branch managers
          </p>
        </div>

        <div className="bc-panel overflow-hidden shadow-[var(--bc-shadow-lg)]">
          <div className="border-b border-[color:var(--bc-border)] bg-[image:var(--bc-hero-gradient)] px-6 py-4">
            <p className="text-sm font-semibold text-[color:var(--bc-text)]">{companyName}</p>
            <p className="text-xs text-[color:var(--bc-muted)]">Use your salon staff account</p>
          </div>

          <form className="space-y-5 p-6 sm:p-8" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="usr">Username</Label>
              <Input
                id="usr"
                value={usr}
                onChange={(event) => setUsr(event.target.value)}
                autoComplete="username"
                placeholder="e.g. jeddah.reception@beautycloud.local"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="pwd">Password</Label>
              <Input
                id="pwd"
                type="password"
                value={pwd}
                onChange={(event) => setPwd(event.target.value)}
                autoComplete="current-password"
                required
                className="mt-1.5"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {error ? (
            <div className="px-6 pb-6 sm:px-8">
              <ErrorState title="Login failed" description={error} />
            </div>
          ) : null}

          <p className="border-t border-[color:var(--bc-border)] px-6 py-4 text-center text-sm text-[color:var(--bc-muted)] sm:px-8">
            <Link href="/" className="font-medium hover:text-[color:var(--bc-secondary)]">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
