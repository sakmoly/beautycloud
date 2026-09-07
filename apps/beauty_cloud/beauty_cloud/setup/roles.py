# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


ROLES = [
	"Beauty Cloud Branch Manager",
	"Beauty Cloud Receptionist",
	"Beauty Cloud Beautician",
	"Beauty Cloud Cashier",
]


def ensure_roles():
	for role_name in ROLES:
		if frappe.db.exists("Role", role_name):
			continue
		frappe.get_doc({"doctype": "Role", "role_name": role_name, "desk_access": 1}).insert(
			ignore_permissions=True
		)
	frappe.db.commit()
