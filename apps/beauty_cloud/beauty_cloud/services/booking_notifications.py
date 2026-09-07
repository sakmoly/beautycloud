# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

from urllib.parse import quote

import frappe
from frappe import _
from frappe.utils import cint, flt

from beauty_cloud.services.check_in_qr import build_check_in_qr_text
from beauty_cloud.services.customer_identity import get_customer_contacts


def send_booking_confirmation(appointment_name: str) -> bool:
	settings = frappe.get_single("Beauty Cloud Settings")
	if not cint(settings.send_booking_confirmation_email):
		return False

	if not frappe.db.exists("Beauty Appointment", appointment_name):
		return False

	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	if appt.status in ("Draft", "Cancelled"):
		return False

	contacts = get_customer_contacts(appt.customer)
	recipient = (contacts.get("email") or "").strip()
	if not recipient:
		return False

	qr_text = build_check_in_qr_text(appt.name)
	qr_image_url = _qr_image_url(qr_text)
	subject = _("Your appointment is confirmed — {0}").format(appt.name)
	message = _build_confirmation_html(appt, contacts, qr_text, qr_image_url)

	try:
		frappe.sendmail(
			recipients=[recipient],
			subject=subject,
			message=message,
			delayed=False,
			reference_doctype="Beauty Appointment",
			reference_name=appt.name,
		)
		return True
	except Exception:
		frappe.log_error(
			title="Booking confirmation email failed",
			message=f"Appointment {appointment_name} → {recipient}",
		)
		return False


def _qr_image_url(qr_text: str, size: int = 220) -> str:
	return (
		f"https://api.qrserver.com/v1/create-qr-code/?size={size}x{size}&data={quote(qr_text)}"
	)


def _build_confirmation_html(appt, contacts: dict, qr_text: str, qr_image_url: str) -> str:
	branch_name = frappe.db.get_value("Beauty Branch", appt.beauty_branch, "branch_name") or appt.beauty_branch
	company_name = frappe.db.get_value("Company", appt.company, "company_name") or appt.company
	services = frappe.get_all(
		"Beauty Appointment Service",
		filters={"parent": appt.name},
		fields=["service_name", "employee_name", "start_time", "end_time"],
		order_by="idx asc",
	)
	service_lines = "".join(
		f"<li><strong>{s.service_name}</strong> with {s.employee_name or 'TBC'}</li>"
		for s in services
	)
	start_label = str(appt.scheduled_start)[:16] if appt.scheduled_start else str(appt.appointment_date)
	bookings_url = f"{_public_booking_base_url()}/book/appointments"

	return f"""
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;">
  <h2 style="color:#b76e79;">Your appointment is confirmed</h2>
  <p>Hi {contacts.get('customer_name') or 'there'},</p>
  <p>Thank you for booking with <strong>{company_name}</strong>. Show the QR code below at reception for check-in.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:8px 0;color:#666;">Reference</td><td style="padding:8px 0;font-weight:600;">{appt.name}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">Date & time</td><td style="padding:8px 0;font-weight:600;">{start_label}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">Branch</td><td style="padding:8px 0;font-weight:600;">{branch_name}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">Payment</td><td style="padding:8px 0;font-weight:600;">{appt.payment_status or 'Unpaid'} · SAR {flt(appt.total_amount):.2f}</td></tr>
  </table>
  <p><strong>Services</strong></p>
  <ul>{service_lines or '<li>See salon for details</li>'}</ul>
  <div style="text-align:center;margin:24px 0;padding:20px;background:#faf6f4;border-radius:12px;">
    <p style="margin:0 0 12px;font-size:14px;color:#666;">Check-in QR code</p>
    <img src="{qr_image_url}" alt="Check-in QR" width="220" height="220" style="border-radius:8px;" />
    <p style="margin:12px 0 0;font-size:11px;color:#999;word-break:break-all;">{qr_text}</p>
  </div>
  <p style="font-size:14px;color:#666;">View all bookings anytime: <a href="{bookings_url}">{bookings_url}</a></p>
  <p style="font-size:12px;color:#999;margin-top:24px;">Keep this email — you can also open My bookings on our website and sign in with your mobile or email.</p>
</div>
"""


def _public_booking_base_url() -> str:
	tenant = frappe.db.get_value(
		"Beauty Cloud Tenant",
		{"status": "Active"},
		"public_url",
	)
	if tenant:
		return tenant.rstrip("/")
	return frappe.utils.get_url().replace("/api", "").rstrip("/")

