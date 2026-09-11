# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


def execute():
	settings = frappe.get_single("Beauty Cloud Settings")
	if not int(getattr(settings, "require_invoice_before_service", 0)):
		settings.require_invoice_before_service = 1
		settings.save(ignore_permissions=True)
		frappe.db.commit()
