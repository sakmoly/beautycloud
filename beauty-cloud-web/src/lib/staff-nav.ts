import type { StaffWorkflowCapabilities } from "@/lib/frappe/types";

export type StaffNavItem = {
  href: string;
  label: string;
  icon: string;
};

export const STAFF_NAV: StaffNavItem[] = [
  { href: "/staff/reception", label: "Reception", icon: "🏠" },
  { href: "/staff/reception/calendar", label: "Calendar", icon: "📅" },
  { href: "/staff/reception/queue", label: "Queue", icon: "👥" },
  { href: "/staff/beautician", label: "Beautician", icon: "✨" },
  { href: "/staff/inventory", label: "Inventory", icon: "📦" },
  { href: "/staff/pos", label: "POS", icon: "💳" },
  { href: "/staff/commission", label: "Commission", icon: "💰" },
  { href: "/staff/loyalty", label: "Loyalty", icon: "🎁" },
  { href: "/staff/reports", label: "Reports", icon: "📊" },
  { href: "/staff/setup", label: "Setup", icon: "🚀" },
  { href: "/staff/admin", label: "Admin", icon: "⚙️" },
];

export const STAFF_COMPACT_NAV: StaffNavItem[] = [
  { href: "/staff/pos", label: "POS", icon: "💳" },
  { href: "/staff/reception/queue", label: "Queue", icon: "👥" },
];

const RECEPTION_NAV: StaffNavItem[] = [
  { href: "/staff/reception/calendar", label: "Calendar", icon: "📅" },
  { href: "/staff/reception/queue", label: "Queue", icon: "👥" },
  { href: "/staff/pos", label: "POS", icon: "💳" },
];

const CASHIER_NAV: StaffNavItem[] = [
  { href: "/staff/pos", label: "POS", icon: "💳" },
  { href: "/staff/reception/queue", label: "Queue", icon: "👥" },
];

const BEAUTICIAN_NAV: StaffNavItem[] = [
  { href: "/staff/beautician", label: "My schedule", icon: "✨" },
];

function hasRole(workflow: StaffWorkflowCapabilities | undefined, role: string): boolean {
  return Boolean(workflow?.roles?.includes(role));
}

function isManager(workflow: StaffWorkflowCapabilities | undefined): boolean {
  return (
    hasRole(workflow, "Administrator") ||
    hasRole(workflow, "System Manager") ||
    hasRole(workflow, "Beauty Cloud Branch Manager")
  );
}

export function staffNavItems(
  workflow: StaffWorkflowCapabilities | undefined,
  compact = false,
): StaffNavItem[] {
  if (isManager(workflow)) {
    return compact ? STAFF_COMPACT_NAV : STAFF_NAV;
  }

  const reception = hasRole(workflow, "Beauty Cloud Receptionist");
  const cashier = hasRole(workflow, "Beauty Cloud Cashier");
  const beautician = hasRole(workflow, "Beauty Cloud Beautician");

  if (beautician && !reception && !cashier) {
    return BEAUTICIAN_NAV;
  }
  if (cashier && !reception) {
    return CASHIER_NAV;
  }
  if (reception) {
    return RECEPTION_NAV;
  }

  return compact ? STAFF_COMPACT_NAV : STAFF_NAV;
}
