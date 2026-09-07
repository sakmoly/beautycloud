# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt


PAID_STATUSES = ("Paid", "Deposit Paid")


def get_salon_payment_settings() -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	return {
		"require_payment_before_service": bool(getattr(settings, "require_payment_before_service", 0)),
		"require_payment_at_kiosk": bool(getattr(settings, "require_payment_at_kiosk", 0)),
		"require_qr_for_check_in": bool(getattr(settings, "require_qr_for_check_in", 0)),
	}


def is_appointment_paid(payment_status: str | None) -> bool:
	return (payment_status or "Unpaid") in PAID_STATUSES


def assert_payment_before_service(appointment_name: str) -> None:
	settings = get_salon_payment_settings()
	if not settings["require_payment_before_service"]:
		return

	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	if is_appointment_paid(appt.payment_status):
		return

	frappe.throw(
		_(
			"Payment must be collected before starting or completing service for {0}. "
			"Open the appointment in POS to checkout and print a receipt."
		).format(appointment_name),
		title=_("Payment Required"),
	)


def collect_appointment_payment(
	appointment_name: str,
	mode_of_payment: str = "Cash",
	amount: float | None = None,
	source: str = "Reception",
) -> dict:
	"""Post POS payment for an appointment's services."""
	from beauty_cloud.services.pos import checkout

	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	appt.check_permission("write")

	if is_appointment_paid(appt.payment_status):
		frappe.throw(_("Appointment {0} is already paid").format(appointment_name))

	items = []
	for row in appt.services:
		items.append(
			{
				"line_type": "Service",
				"beauty_service": row.beauty_service,
				"qty": 1,
				"rate": flt(row.rate or row.amount),
				"employee": row.employee,
			}
		)

	if not items:
		frappe.throw(_("No billable services on this appointment"))

	pay_amount = flt(amount if amount is not None else appt.total_amount)
	if pay_amount <= 0:
		frappe.throw(_("Payment amount must be greater than zero"))

	return checkout(
		{
			"customer": appt.customer,
			"beauty_branch": appt.beauty_branch,
			"beauty_appointment": appt.name,
			"source": source,
			"items": items,
			"payments": [{"mode_of_payment": mode_of_payment, "amount": pay_amount}],
		}
	)
