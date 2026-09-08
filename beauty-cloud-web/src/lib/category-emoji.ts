export function categoryEmoji(label: string) {
  const n = label.toLowerCase();
  if (n.includes("hair")) return "✂️";
  if (n.includes("skin") || n.includes("facial")) return "✨";
  if (n.includes("nail") || n.includes("mani") || n.includes("pedi")) return "💅";
  if (n.includes("spa")) return "🧖";
  return "💆";
}
