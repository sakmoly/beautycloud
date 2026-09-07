"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getCustomerSessionStatus,
  logoutCustomerSession,
} from "@/lib/api/browser-client";
import { withBasePath } from "@/lib/base-path";
import { Button } from "@/components/ui/button";

function maskMobile(mobile: string) {
  const digits = mobile.replace(/\s/g, "");
  if (digits.length <= 4) return mobile;
  return `${digits.slice(0, 4)} *** ${digits.slice(-3)}`;
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}***@${domain}`;
}

export function CustomerSessionBar() {
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const session = await getCustomerSessionStatus();
      if (session.verified && session.mobile) {
        setLabel(maskMobile(session.mobile));
      } else if (session.verified && session.email) {
        setLabel(maskEmail(session.email));
      } else {
        setLabel(null);
      }
    } catch {
      setLabel(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function logout() {
    await logoutCustomerSession();
    setLabel(null);
    window.location.href = withBasePath("/book");
  }

  if (loading) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {label ? (
        <>
          <span className="hidden rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-[color:var(--bc-muted)] md:inline">
            Signed in · {label}
          </span>
          <Link href={withBasePath("/book/appointments")}>
            <Button variant="secondary" className="min-h-9 px-3 text-xs">
              My bookings
            </Button>
          </Link>
          <Button variant="ghost" className="min-h-9 px-3 text-xs" onClick={logout}>
            Log out
          </Button>
        </>
      ) : (
        <Link href={withBasePath("/book/appointments")}>
          <Button variant="secondary" className="min-h-9 px-3 text-xs">
            My bookings
          </Button>
        </Link>
      )}
    </div>
  );
}
