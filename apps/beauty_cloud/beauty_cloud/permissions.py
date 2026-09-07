# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


BEAUTY_ROLES = {
	"Beauty Cloud Branch Manager",
	"Beauty Cloud Receptionist",
	"Beauty Cloud Beautician",
	"Beauty Cloud Cashier",
}


def get_appointment_permission_query_conditions(user: str | None = None) -> str | None:
	user = user or frappe.session.user
	if _is_privileged(user):
		return None

	roles = set(frappe.get_roles(user))
	if "Beauty Cloud Beautician" in roles:
		employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
		if not employee:
			return "1=0"
		employee = frappe.db.escape(employee)
		return (
			f"`tabBeauty Appointment`.name in (select parent from `tabBeauty Appointment Service` "
			f"where parenttype='Beauty Appointment' and employee={employee})"
		)

	return None


def has_appointment_permission(doc, user: str | None = None, ptype: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True

	roles = set(frappe.get_roles(user))
	if "Beauty Cloud Beautician" not in roles:
		return True

	employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
	if not employee:
		return False

	for row in doc.get("services") or []:
		if row.employee == employee:
			return True
	return ptype == "read" and doc.owner == user


def _is_privileged(user: str) -> bool:
	if user == "Administrator":
		return True
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection({"System Manager", "Beauty Cloud Branch Manager", "Beauty Cloud Receptionist"}))
