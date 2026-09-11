import type { PosRegisterRow } from "@/components/pos/pos-session-types";

/** API keys are long random tokens; register codes are short (e.g. REG-01). */
export function looksLikeApiKey(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 40 && !trimmed.includes("-");
}

export function registerCodes(registers: PosRegisterRow[]): string[] {
  return registers
    .map((row) => row.register_code ?? row.name ?? "")
    .filter(Boolean);
}

export function pickDefaultRegisterCode(
  registers: PosRegisterRow[],
  current?: string,
): string {
  const codes = registerCodes(registers);
  if (!codes.length) return "";
  if (current && codes.includes(current) && !looksLikeApiKey(current)) {
    return current;
  }
  return codes[0] ?? "";
}

export function validateRegisterCodeForPairing(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return "Select a register first";
  if (looksLikeApiKey(trimmed)) {
    return "That value looks like an API key. Select the register code (e.g. REG-02) in the Register field, then use Fetch key.";
  }
  return null;
}
