const HTML_TAG = /<[^>]+>/g;

const FRIENDLY_ERROR_RULES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /does not have doctype access.*\bAccount\b/i,
    message:
      "Your user role cannot access the accounting ledger required to post this invoice. Ask a branch manager to issue the invoice, or contact admin to enable POS invoicing for reception/cashier roles.",
  },
  {
    pattern: /Register .* is open under/i,
    message:
      "This register was opened by another cashier. Use the same login that opened REG, or ask a manager to close and reopen the register for your shift.",
  },
  {
    pattern: /Open register session/i,
    message: "The POS register is not open yet. Go to Register & Day and open the register for this store.",
  },
  {
    pattern: /Open a business day/i,
    message: "Today's business day is not open for this store. Go to Register & Day and open the business day first.",
  },
  {
    pattern: /Salon invoice already issued/i,
    message: "This booking already has a salon invoice. The beautician can start the service.",
  },
  {
    pattern: /does not belong to branch/i,
    message:
      "This device is paired to a register from another store. Open Register & Day and pair the correct register for your branch.",
  },
];

export function stripHtml(message: string): string {
  return message
    .replace(HTML_TAG, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatUserMessage(message: string | undefined | null): string {
  if (!message) return "Something went wrong. Please try again.";
  const plain = stripHtml(message);
  for (const rule of FRIENDLY_ERROR_RULES) {
    if (rule.pattern.test(plain)) {
      return rule.message;
    }
  }
  return plain;
}
