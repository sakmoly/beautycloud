"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { withBasePath } from "@/lib/base-path";

export function StaffLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch(withBasePath("/api/beauty/auth/session"), { method: "DELETE" });
      router.push("/staff/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className="rounded-full border border-[color:var(--bc-border)] bg-white/90 px-4 py-2 text-sm font-medium text-[color:var(--bc-muted)] shadow-sm transition hover:border-[color:var(--bc-danger)]/30 hover:text-[color:var(--bc-danger)] disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
