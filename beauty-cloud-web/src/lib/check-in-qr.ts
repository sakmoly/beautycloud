export function parseCheckInQr(text: string): { appointment: string; token: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("|");
  if (parts.length === 3 && parts[0] === "BCAPT") {
    return { appointment: parts[1].trim(), token: parts[2].trim() };
  }

  if (/^BAPT-/i.test(trimmed)) {
    return { appointment: trimmed, token: "" };
  }

  return null;
}

export function checkInQrImageUrl(qrText: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrText)}`;
}
