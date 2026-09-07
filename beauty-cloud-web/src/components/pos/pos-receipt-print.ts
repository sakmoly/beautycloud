import type { PosCartItem } from "@/lib/api/types";
import { lineLabel } from "@/components/pos/pos-utils";

export interface PosReceiptData {
  transaction: string;
  invoice?: string;
  customer: string;
  items: PosCartItem[];
  total: number;
  paymentMode: string;
  appointment?: string;
}

function receiptHtml(data: PosReceiptData): string {
  const lines = data.items
    .map(
      (line) =>
        `<tr><td>${lineLabel(line)}</td><td style="text-align:right">${((line.rate ?? 0) * (line.qty ?? 1)).toFixed(2)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${data.transaction}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 16px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 8px; text-align: center; }
    .meta { text-align: center; color: #555; margin-bottom: 12px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    td { padding: 4px 0; vertical-align: top; }
    .total { font-weight: bold; font-size: 14px; border-top: 1px dashed #999; padding-top: 8px; }
    .footer { margin-top: 16px; text-align: center; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <h1>Baheya Beauty</h1>
  <div class="meta">
    ${new Date().toLocaleString()}<br />
    ${data.transaction}${data.invoice ? ` · ${data.invoice}` : ""}
    ${data.appointment ? `<br />Booking ${data.appointment}` : ""}
  </div>
  <p><strong>Customer:</strong> ${data.customer}</p>
  <table>${lines}</table>
  <table>
    <tr class="total">
      <td>Total (${data.paymentMode})</td>
      <td style="text-align:right">SAR ${data.total.toFixed(2)}</td>
    </tr>
  </table>
  <div class="footer">Thank you for visiting</div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}

export function printPosReceipt(data: PosReceiptData): void {
  const popup = window.open("", "_blank", "width=360,height=640");
  if (!popup) return;
  popup.document.open();
  popup.document.write(receiptHtml(data));
  popup.document.close();
}
