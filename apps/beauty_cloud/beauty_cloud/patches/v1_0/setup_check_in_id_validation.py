# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


def execute():
	settings = frappe.get_single("Beauty Cloud Settings")
	settings.require_id_for_check_in = 1
	settings.require_payment_for_check_in = 1
	settings.require_qr_for_check_in = 0
	settings.save(ignore_permissions=True)
