# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_to_date, cint, get_datetime, now_datetime


def get_unpaid_draft_hold_settings() -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	enabled = bool(getattr(settings, "auto_cancel_unpaid_draft_bookings", 0))
	minutes = cint(getattr(settings, "unpaid_draft_hold_minutes", 0) or 0)
	if enabled and minutes <= 0:
		minutes = 15
	return {
		"auto_cancel_unpaid_draft_bookings": enabled,
		"unpaid_draft_hold_minutes": minutes if enabled else 0,
	}


def release_expired_unpaid_draft_bookings() -> dict:
	"""Cancel unpaid Online/Kiosk draft bookings after the configured hold period."""
	config = get_unpaid_draft_hold_settings()
	if not config["auto_cancel_unpaid_draft_bookings"]:
		return {"released": 0, "skipped": True}

	minutes = config["unpaid_draft_hold_minutes"]
	cutoff = add_to_date(now_datetime(), minutes=-minutes)
	expired = frappe.get_all(
		"Beauty Appointment",
		filters={
			"status": "Draft",
			"payment_status": "Unpaid",
			"source": ("in", ["Online", "Kiosk"]),
			"creation": ("<", cutoff),
		},
		pluck="name",
		order_by="creation asc",
		limit=200,
	)

	released = 0
	for appointment_name in expired:
		try:
			if _release_unpaid_draft(appointment_name, minutes):
				released += 1
		except Exception:
			frappe.log_error(
				title=_("Unpaid draft cleanup failed for {0}").format(appointment_name),
				message=frappe.get_traceback(),
			)

	if released:
		frappe.db.commit()

	return {"released": released, "hold_minutes": minutes}


def _release_unpaid_draft(appointment_name: str, hold_minutes: int) -> bool:
	doc = frappe.get_doc("Beauty Appointment", appointment_name)
	if doc.status != "Draft" or doc.payment_status != "Unpaid":
		return False
	if doc.source not in ("Online", "Kiosk"):
		return False

	created = get_datetime(doc.creation)
	cutoff = add_to_date(now_datetime(), minutes=-hold_minutes)
	if created >= cutoff:
		return False

	_expire_pending_payments(appointment_name)
	reason = _("Auto-cancelled: payment not completed within {0} minutes").format(hold_minutes)
	doc.reload()
	if doc.status != "Draft" or doc.payment_status != "Unpaid":
		return False

	doc.status = "Cancelled"
	existing_notes = (doc.notes or "").strip()
	doc.notes = f"{existing_notes}\n{reason}".strip() if existing_notes else reason
	for row in doc.services:
		if row.status not in ("Completed", "Cancelled"):
			row.status = "Cancelled"
	doc.save(ignore_permissions=True)
	return True


def _expire_pending_payments(appointment_name: str) -> None:
	pending = frappe.get_all(
		"Beauty Booking Payment",
		filters={"beauty_appointment": appointment_name, "status": "Pending"},
		pluck="name",
	)
	for payment_name in pending:
		frappe.db.set_value(
			"Beauty Booking Payment",
			payment_name,
			{"status": "Expired"},
			update_modified=True,
		)
