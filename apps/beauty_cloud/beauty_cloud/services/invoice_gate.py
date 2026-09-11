# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt

from beauty_cloud.services.payment_gate import get_salon_payment_settings, is_appointment_paid


def get_appointment_invoice_info(appointment_name: str) -> dict:
	"""Return whether a submitted salon invoice exists for this appointment."""
	row = frappe.db.get_value(
		"Beauty POS Transaction",
		{
			"beauty_appointment": appointment_name,
			"status": ("in", ["Paid", "Partially Paid"]),
			"invoice": ("is", "set"),
		},
		["name", "invoice", "invoice_doctype", "grand_total", "status"],
		as_dict=True,
	)
	if not row:
		return {
			"has_invoice": False,
			"pos_transaction": None,
			"invoice": None,
			"invoice_doctype": None,
		}
	return {
		"has_invoice": True,
		"pos_transaction": row.name,
		"invoice": row.invoice,
		"invoice_doctype": row.invoice_doctype,
		"grand_total": flt(row.grand_total),
		"status": row.status,
	}


def has_appointment_invoice(appointment_name: str) -> bool:
	return get_appointment_invoice_info(appointment_name)["has_invoice"]


def get_invoice_flags_for_appointments(appointment_names: list[str]) -> dict[str, bool]:
	"""Batch lookup: which appointments already have a submitted salon invoice."""
	if not appointment_names:
		return {}

	rows = frappe.get_all(
		"Beauty POS Transaction",
		filters={
			"beauty_appointment": ("in", appointment_names),
			"status": ("in", ["Paid", "Partially Paid"]),
			"invoice": ("is", "set"),
		},
		fields=["beauty_appointment"],
	)
	invoiced = {row.beauty_appointment for row in rows}
	return {name: name in invoiced for name in appointment_names}


def assert_no_duplicate_invoice(appointment_name: str) -> None:
	if has_appointment_invoice(appointment_name):
		frappe.throw(
			_("Salon invoice already issued for {0}").format(appointment_name),
			title=_("Invoice Exists"),
		)


def assert_invoice_before_service(doc) -> None:
	settings = get_salon_payment_settings()
	if not settings.get("require_invoice_before_service"):
		return

	if has_appointment_invoice(doc.name):
		return

	frappe.throw(
		_(
			"Salon invoice must be issued at POS before the service can start. "
			"Reception should complete check-in and POS invoicing for {0}."
		).format(doc.name),
		title=_("Invoice Required"),
	)


def get_invoice_settings() -> dict:
	settings = get_salon_payment_settings()
	return {
		"require_invoice_before_service": bool(settings.get("require_invoice_before_service")),
	}


def get_prepaid_payment_mode(appointment_name: str) -> str:
	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	if appt.booking_payment:
		gateway = frappe.db.get_value("Beauty Booking Payment", appt.booking_payment, "gateway")
		if gateway in ("Telr", "Demo"):
			for mode in ("Online Payment", "Credit Card", "Mada"):
				if frappe.db.exists("Mode of Payment", mode):
					return mode

	for mode in ("Online Payment", "Mada", "Credit Card", "Cash"):
		if frappe.db.exists("Mode of Payment", mode):
			return mode

	frappe.throw(
		_("Configure a Mode of Payment (e.g. Online Payment) for prepaid salon invoicing."),
		title=_("Payment Mode Missing"),
	)


def get_prepaid_checkout_payments(appointment_name: str, amount: float) -> list[dict]:
	return [{"mode_of_payment": get_prepaid_payment_mode(appointment_name), "amount": flt(amount)}]


def get_invoice_flags_for_appointment(doc) -> dict:
	info = get_appointment_invoice_info(doc.name)
	paid = is_appointment_paid(doc.payment_status)
	return {
		**info,
		"needs_invoice": not info["has_invoice"],
		"prepaid": paid,
		"can_issue_prepaid_invoice": paid and not info["has_invoice"],
	}
