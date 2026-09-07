"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { withBasePath } from "@/lib/base-path";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function StaffLoginPage() {
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
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="bc-hero mb-6 text-center">
        <p className="text-sm text-[color:var(--bc-muted)]">Staff portal</p>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="bc-section-sub">Baheya Beauty Cloud workspace</p>
      </div>

      <div className="bc-panel p-8">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="usr">Username</Label>
            <Input
              id="usr"
              value={usr}
              onChange={(event) => setUsr(event.target.value)}
              autoComplete="username"
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
          <div className="mt-4">
            <ErrorState title="Login failed" description={error} />
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-[color:var(--bc-muted)]">
          <Link href="/" className="font-medium hover:text-[color:var(--bc-secondary)]">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
