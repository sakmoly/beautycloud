# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _


PRIVILEGED_BRANCH_ROLES = {
	"Administrator",
	"System Manager",
	"Beauty Cloud Branch Manager",
}


def user_has_all_branch_access(user: str | None = None) -> bool:
	user = user or frappe.session.user
	if user == "Administrator":
		return True
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection(PRIVILEGED_BRANCH_ROLES))


def get_user_beauty_branches(user: str | None = None) -> list[str] | None:
	"""Return allowed branch names, or None when the user may access all branches."""
	user = user or frappe.session.user
	if user == "Guest":
		return None
	if user_has_all_branch_access(user):
		return None

	employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
	if not employee:
		return []

	branches = frappe.get_all(
		"Employee Service Skill",
		filters={"employee": employee, "is_active": 1},
		pluck="beauty_branch",
	)
	found = sorted({branch for branch in branches if branch})
	if found:
		return found

	roles = set(frappe.get_roles(user))
	if roles.intersection({"Beauty Cloud Receptionist", "Beauty Cloud Cashier", "Beauty Cloud Beautician"}):
		company = frappe.db.get_value("Employee", employee, "company")
		if company:
			return frappe.get_all(
				"Beauty Branch",
				filters={"company": company, "is_active": 1},
				pluck="name",
				order_by="branch_name asc",
			)
	return []


def get_user_default_beauty_branch(user: str | None = None) -> str | None:
	branches = get_user_beauty_branches(user)
	if branches is None:
		return None
	return branches[0] if branches else None


def filter_branches_for_user(branches: list[dict], user: str | None = None) -> list[dict]:
	allowed = get_user_beauty_branches(user)
	if allowed is None:
		return branches
	allowed_set = set(allowed)
	return [row for row in branches if row.get("name") in allowed_set]


def assert_branch_access(beauty_branch: str, user: str | None = None) -> None:
	allowed = get_user_beauty_branches(user)
	if allowed is None:
		return
	if beauty_branch not in allowed:
		frappe.throw(
			_("You do not have access to branch {0}").format(beauty_branch),
			title=_("Branch Access"),
			exc=frappe.PermissionError,
		)


def assert_register_access(register_doc, user: str | None = None) -> None:
	assert_branch_access(register_doc.beauty_branch, user)


def can_fetch_register_pairing_key(user: str | None = None) -> bool:
	user = user or frappe.session.user
	if user == "Guest":
		return False
	if user_has_all_branch_access(user):
		return True
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection({"Beauty Cloud Cashier", "Beauty Cloud Receptionist"}))
