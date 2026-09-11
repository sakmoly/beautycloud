# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


def execute():
	from beauty_cloud.services.vat import ensure_vat_setup

	settings = frappe.get_single("Beauty Cloud Settings")
	if not settings.company:
		return

	settings.enable_vat = 1
	settings.prices_include_vat = 1
	settings.vat_percent = settings.vat_percent or 15

	try:
		result = ensure_vat_setup(settings.company, settings=settings)
		settings.vat_note = (
			f"VAT {int(settings.vat_percent or 15)}% "
			f"({'inclusive' if settings.prices_include_vat else 'exclusive'}) — "
			f"template {result['sales_taxes_template']}"
		)
		settings.save(ignore_permissions=True)
	except Exception:
		frappe.log_error(title="Beauty Cloud VAT patch")
