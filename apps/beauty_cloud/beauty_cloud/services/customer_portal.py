# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt

from beauty_cloud.services.customer_identity import (
	assert_customer_access,
	get_customer_contacts,
	normalize_email,
	normalize_mobile,
)


def get_booking_receipt(
	appointment: str,
	mobile: str | None = None,
	email: str | None = None,
) -> dict:
	mobile = normalize_mobile(mobile)
	email = normalize_email(email) if email else ""

	if not mobile and not email:
		frappe.throw(_("Mobile number or email is required"))

	customer = assert_customer_access(appointment, mobile=mobile or None, email=email or None)
	contacts = get_customer_contacts(customer)

	appt = frappe.get_doc("Beauty Appointment", appointment)

	services = frappe.get_all(
		"Beauty Appointment Service",
		filters={"parent": appt.name},
		fields=["service_name", "employee_name", "amount", "rate"],
		order_by="idx asc",
	)

	branch_name = frappe.db.get_value("Beauty Branch", appt.beauty_branch, "branch_name") or appt.beauty_branch
	company_name = frappe.db.get_value("Company", appt.company, "company_name") or appt.company

	receipt = {
		"appointment": appt.name,
		"customer_name": appt.customer_name,
		"mobile": contacts.get("mobile") or mobile,
		"email": contacts.get("email") or email,
		"appointment_date": str(appt.appointment_date),
		"scheduled_start": str(appt.scheduled_start) if appt.scheduled_start else None,
		"status": appt.status,
		"payment_status": appt.payment_status,
		"total_amount": flt(appt.total_amount),
		"branch_name": branch_name,
		"company_name": company_name,
		"services": services,
		"receipt_type": "booking",
		"receipt_ref": appt.name,
		"paid_amount": 0,
		"currency": frappe.db.get_value("Company", appt.company, "default_currency") or "SAR",
	}

	if appt.booking_payment:
		payment = frappe.db.get_value(
			"Beauty Booking Payment",
			appt.booking_payment,
			["name", "status", "amount", "currency", "paid_at", "payment_type", "gateway"],
			as_dict=True,
		)
		if payment and payment.status == "Paid":
			receipt.update(
				{
					"receipt_type": "online_payment",
					"receipt_ref": payment.name,
					"paid_amount": flt(payment.amount),
					"currency": payment.currency or receipt["currency"],
					"paid_at": str(payment.paid_at) if payment.paid_at else None,
					"payment_type": payment.payment_type,
					"gateway": payment.gateway,
				}
			)

	pos = frappe.db.get_value(
		"Beauty POS Transaction",
		{"beauty_appointment": appt.name, "status": "Paid"},
		["name", "invoice", "invoice_doctype", "grand_total"],
		as_dict=True,
	)
	if pos and pos.invoice:
		receipt.update(
			{
				"receipt_type": "pos_invoice",
				"receipt_ref": pos.invoice,
				"invoice_doctype": pos.invoice_doctype,
				"paid_amount": flt(pos.grand_total),
				"pos_transaction": pos.name,
			}
		)

	return receipt
