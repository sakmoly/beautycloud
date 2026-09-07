import type { PosCartItem } from "@/lib/api/types";

export function categoryIcon(label: string) {
  const n = label.toLowerCase();
  if (n.includes("hair")) return "✂️";
  if (n.includes("nail") || n.includes("mani")) return "💅";
  if (n.includes("make")) return "💄";
  if (n.includes("spa") || n.includes("body")) return "🧖";
  if (n.includes("skin") || n.includes("facial")) return "✨";
  return "🌸";
}

export function customerInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("hair") || n.includes("cut") || n.includes("blow")) return "✂️";
  if (n.includes("facial") || n.includes("skin")) return "✨";
  if (n.includes("mani") || n.includes("pedi") || n.includes("nail")) return "💅";
  if (n.includes("massage")) return "💆";
  return "🌸";
}

export function productIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("serum") || n.includes("cream")) return "🧴";
  if (n.includes("oil")) return "💧";
  return "🛍️";
}

export function lineLabel(line: PosCartItem) {
  return line.service_name ?? line.beauty_service ?? line.item_name ?? line.item ?? "Item";
}

export function formatTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value.length >= 5 ? value.slice(11, 16) : value;
  }
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function paymentTone(status?: string): "success" | "warning" | "default" {
  if (status === "Paid") return "success";
  if (status === "Unpaid" || status === "Partially Paid") return "warning";
  return "default";
}
