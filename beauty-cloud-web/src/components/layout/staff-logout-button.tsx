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
      className="flex shrink-0 items-center whitespace-nowrap rounded-full bg-white/80 px-3.5 py-2 text-sm font-medium text-[color:var(--bc-muted)] transition hover:bg-[color:var(--bc-accent-light)] hover:text-[color:var(--bc-danger)] disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
