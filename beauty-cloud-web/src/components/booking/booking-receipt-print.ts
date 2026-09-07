import type { BookingReceipt } from "@/lib/api/types";

function receiptHtml(data: BookingReceipt): string {
  const serviceLines = (data.services ?? [])
    .map(
      (line) =>
        `<tr><td>${line.service_name ?? "Service"}${line.employee_name ? ` · ${line.employee_name}` : ""}</td><td style="text-align:right">${(line.rate ?? line.amount ?? 0).toFixed(2)}</td></tr>`,
    )
    .join("");

  const paidLabel =
    data.receipt_type === "online_payment"
      ? `Online payment (${data.gateway ?? "Card"})`
      : data.receipt_type === "pos_invoice"
        ? `Salon POS · ${data.receipt_ref ?? ""}`
        : "Booking summary";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${data.appointment}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 16px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
    .meta { text-align: center; color: #555; margin-bottom: 12px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    td { padding: 4px 0; vertical-align: top; }
    .total { font-weight: bold; font-size: 14px; border-top: 1px dashed #999; padding-top: 8px; }
    .footer { margin-top: 16px; text-align: center; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <h1>${data.company_name ?? "Beauty Salon"}</h1>
  <div class="meta">
    ${data.branch_name ?? ""}<br />
    Booking ${data.appointment}<br />
    ${data.appointment_date ?? ""}${data.scheduled_start ? ` · ${data.scheduled_start.slice(11, 16)}` : ""}
  </div>
  <p><strong>Guest:</strong> ${data.customer_name ?? "Customer"}<br />
  <strong>Mobile:</strong> ${data.mobile ?? ""}<br />
  <strong>Status:</strong> ${data.status ?? ""} · ${data.payment_status ?? ""}</p>
  <table>${serviceLines}</table>
  <table>
    <tr class="total">
      <td>Total</td>
      <td style="text-align:right">${data.currency ?? "SAR"} ${(data.total_amount ?? 0).toFixed(2)}</td>
    </tr>
    ${
      data.paid_amount
        ? `<tr><td>Paid (${paidLabel})</td><td style="text-align:right">${data.currency ?? "SAR"} ${data.paid_amount.toFixed(2)}</td></tr>`
        : ""
    }
  </table>
  <div class="footer">Thank you for your booking</div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}

export function printBookingReceipt(data: BookingReceipt): void {
  const popup = window.open("", "_blank", "width=360,height=640");
  if (!popup) return;
  popup.document.write(receiptHtml(data));
  popup.document.close();
}
