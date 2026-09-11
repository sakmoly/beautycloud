# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


ROLES = [
	"Beauty Cloud Branch Manager",
	"Beauty Cloud Receptionist",
	"Beauty Cloud Beautician",
	"Beauty Cloud Cashier",
]

ROLE_DESCRIPTIONS = {
	"Beauty Cloud Branch Manager": "Full salon access: check-in guests, start/complete services, POS, and reports.",
	"Beauty Cloud Receptionist": "Front desk: book appointments, collect payment at POS, and check in guests.",
	"Beauty Cloud Beautician": "Service floor: view assigned schedule, start and complete services after check-in.",
	"Beauty Cloud Cashier": "POS checkout and calendar visibility; cannot check in or start services.",
}


def ensure_roles():
	for role_name in ROLES:
		if frappe.db.exists("Role", role_name):
			continue
		frappe.get_doc(
			{
				"doctype": "Role",
				"role_name": role_name,
				"desk_access": 1,
			}
		).insert(ignore_permissions=True)
	frappe.db.commit()
