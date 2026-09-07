export function isInactiveAppointmentStatus(status?: string): boolean {
  const s = (status ?? "").toLowerCase();
  return s.includes("cancel") || s.includes("no show");
}

export function inactiveAppointmentLabel(status?: string): string | null {
  const s = (status ?? "").toLowerCase();
  if (s.includes("no show")) return "No show";
  if (s.includes("cancel")) return "Cancelled";
  return null;
}
