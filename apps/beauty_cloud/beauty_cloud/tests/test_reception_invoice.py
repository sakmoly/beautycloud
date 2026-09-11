# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.invoice_gate import get_prepaid_checkout_payments
from beauty_cloud.services.pos import _create_invoice, _create_payment_entries, load_appointment_for_pos, validate_cart


def test_reception_prepaid_invoice():
	frappe.set_user("jeddah.reception@beautycloud.local")
	payload = load_appointment_for_pos("BAPT-2026-00041")
	validated = validate_cart(payload)
	validated["payments"] = get_prepaid_checkout_payments("BAPT-2026-00041", validated["grand_total"])
	settings = frappe.get_single("Beauty Cloud Settings")
	tx = frappe.get_doc(
		{
			"doctype": "Beauty POS Transaction",
			"naming_series": "BPOS-.YYYY.-",
			"company": settings.company,
			"beauty_branch": validated["beauty_branch"],
			"customer": validated["customer"],
			"beauty_appointment": "BAPT-2026-00041",
			"source": "POS",
			"status": "Draft",
			"posting_date": "2026-09-09",
			"business_date": "2026-09-09",
			"items": validated["items"],
			"payments": validated["payments"],
		}
	)
	tx.insert(ignore_permissions=True)
	acting_user = frappe.session.user
	inv = _create_invoice(tx, settings, acting_user=acting_user)
	_create_payment_entries(tx, inv, validated["payments"], acting_user=acting_user)
	assert inv.docstatus == 1
	frappe.db.rollback()


def test_reception_issue_appointment_invoice():
	frappe.set_user("jeddah.reception@beautycloud.local")
	from beauty_cloud.services.invoice_gate import get_appointment_invoice_info
	from beauty_cloud.services.pos import issue_appointment_invoice

	assert not get_appointment_invoice_info("BAPT-2026-00041")["has_invoice"]
	result = issue_appointment_invoice("BAPT-2026-00041")
	assert result.get("invoice")
	assert result.get("status") == "Paid"
	frappe.db.rollback()
