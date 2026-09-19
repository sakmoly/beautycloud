# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe.utils import nowdate

from beauty_cloud.setup.roles import ensure_roles

DEFAULT_PASSWORD = "Beauty@2026"

STAFF_USERS = [
	{
		"email": "main.manager@beautycloud.local",
		"first_name": "Main",
		"last_name": "Manager",
		"role": "Beauty Cloud Branch Manager",
		"employee_name": "Main Branch Manager",
		"designation": "Branch Manager",
	},
	{
		"email": "main.reception@beautycloud.local",
		"first_name": "Main",
		"last_name": "Reception",
		"role": "Beauty Cloud Receptionist",
		"branch": "BBY-MAIN",
		"employee_name": "Main Reception Desk",
		"designation": "Receptionist",
	},
	{
		"email": "main.cashier@beautycloud.local",
		"first_name": "Main",
		"last_name": "Cashier",
		"role": "Beauty Cloud Cashier",
		"branch": "BBY-MAIN",
		"employee_name": "Main POS Cashier",
		"designation": "Cashier",
	},
	{
		"email": "main.beauty.sara@beautycloud.local",
		"first_name": "Sara",
		"last_name": "Al-Ahmad",
		"role": "Beauty Cloud Beautician",
		"branch": "BBY-MAIN",
		"link_employee_name": "Sara Al-Ahmad",
	},
	{
		"email": "jeddah.manager@beautycloud.local",
		"first_name": "Jeddah",
		"last_name": "Manager",
		"role": "Beauty Cloud Branch Manager",
		"employee_name": "Jeddah Branch Manager",
		"designation": "Branch Manager",
	},
	{
		"email": "jeddah.reception@beautycloud.local",
		"first_name": "Jeddah",
		"last_name": "Reception",
		"role": "Beauty Cloud Receptionist",
		"branch": "003",
		"employee_name": "Jeddah Reception",
		"designation": "Receptionist",
	},
	{
		"email": "jeddah.cashier@beautycloud.local",
		"first_name": "Jeddah",
		"last_name": "Cashier",
		"role": "Beauty Cloud Cashier",
		"branch": "003",
		"employee_name": "Jeddah Cashier",
		"designation": "Cashier",
	},
	{
		"email": "jeddah.beauty.aisha@beautycloud.local",
		"first_name": "Aisha",
		"last_name": "Al-Harbi",
		"role": "Beauty Cloud Beautician",
		"branch": "003",
		"link_employee_name": "Aisha Al-Harbi",
	},
]


def ensure_staff_users(company: str | None = None):
	"""Create demo staff logins per branch and role."""
	ensure_roles()
	company = company or frappe.db.get_value("Company", {"company_name": "Bahyea Bauty"}) or "Bahyea Bauty"
	if not frappe.db.exists("Company", company):
		return

	for row in STAFF_USERS:
		_ensure_staff_user(row, company)

	frappe.db.commit()


def _ensure_staff_user(row: dict, company: str):
	email = row["email"]
	user = frappe.db.get_value("User", email, "name")
	if not user:
		doc = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": row["first_name"],
				"last_name": row.get("last_name") or "",
				"send_welcome_email": 0,
				"user_type": "System User",
				"roles": [{"role": row["role"]}],
			}
		)
		doc.insert(ignore_permissions=True)
		doc.new_password = DEFAULT_PASSWORD
		doc.save(ignore_permissions=True)
	else:
		if not frappe.db.exists("Has Role", {"parent": email, "role": row["role"]}):
			frappe.get_doc({"doctype": "Has Role", "parent": email, "parenttype": "User", "role": row["role"]}).insert(
				ignore_permissions=True
			)

	employee_name = row.get("link_employee_name") or row.get("employee_name")
	if not employee_name:
		return

	employee = frappe.db.get_value(
		"Employee",
		{"employee_name": employee_name, "company": company},
		"name",
	)
	if not employee and row.get("employee_name"):
		employee = _create_staff_employee(row, company)

	if not employee:
		return

	frappe.db.set_value("Employee", employee, "user_id", email, update_modified=False)

	branch = row.get("branch")
	if branch:
		_ensure_branch_skill(employee, branch, company)


def _create_staff_employee(row: dict, company: str) -> str:
	designation = row.get("designation")
	if designation and not frappe.db.exists("Designation", designation):
		frappe.get_doc({"doctype": "Designation", "designation_name": designation}).insert(ignore_permissions=True)

	doc = frappe.get_doc(
		{
			"doctype": "Employee",
			"naming_series": "HR-EMP-",
			"first_name": row["first_name"],
			"last_name": row.get("last_name") or "",
			"employee_name": row["employee_name"],
			"company": company,
			"gender": "Female",
			"status": "Active",
			"date_of_birth": "1990-01-01",
			"date_of_joining": nowdate(),
			"designation": designation,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def _ensure_branch_skill(employee: str, branch: str, company: str):
	if not frappe.db.exists("Beauty Branch", branch):
		return

	service = frappe.db.get_value("Beauty Service", {"company": company, "is_active": 1}, "name")
	if not service:
		return

	existing = frappe.db.get_value(
		"Employee Service Skill",
		{"employee": employee, "beauty_branch": branch, "company": company},
		"name",
	)
	if existing:
		frappe.db.set_value("Employee Service Skill", existing, "is_active", 1, update_modified=False)
		return

	frappe.get_doc(
		{
			"doctype": "Employee Service Skill",
			"employee": employee,
			"company": company,
			"beauty_branch": branch,
			"beauty_service": service,
			"is_active": 1,
			"skill_level": "Standard",
		}
	).insert(ignore_permissions=True)
