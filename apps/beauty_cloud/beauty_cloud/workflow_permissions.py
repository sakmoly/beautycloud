# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _

CHECK_IN_ROLES = {
	"Administrator",
	"System Manager",
	"Beauty Cloud Branch Manager",
	"Beauty Cloud Receptionist",
}

START_SERVICE_ROLES = {
	"Administrator",
	"System Manager",
	"Beauty Cloud Branch Manager",
	"Beauty Cloud Beautician",
}

COMPLETE_SERVICE_ROLES = START_SERVICE_ROLES

SERVICE_START_STATUSES = ("Checked In", "Waiting", "In Service", "Partially Completed")


def user_roles(user: str | None = None) -> set[str]:
	user = user or frappe.session.user
	return set(frappe.get_roles(user))


def can_check_in(user: str | None = None) -> bool:
	return bool(user_roles(user).intersection(CHECK_IN_ROLES))


def can_start_service(user: str | None = None) -> bool:
	return bool(user_roles(user).intersection(START_SERVICE_ROLES))


def can_complete_service(user: str | None = None) -> bool:
	return bool(user_roles(user).intersection(COMPLETE_SERVICE_ROLES))


def assert_can_check_in(user: str | None = None) -> None:
	if not can_check_in(user):
		frappe.throw(
			_("Only reception staff can check in guests."),
			title=_("Not Permitted"),
			exc=frappe.PermissionError,
		)


def assert_can_start_service(user: str | None = None) -> None:
	if not can_start_service(user):
		frappe.throw(
			_("Only beauticians can start services. Reception should check in the guest first."),
			title=_("Not Permitted"),
			exc=frappe.PermissionError,
		)


def assert_can_complete_service(user: str | None = None) -> None:
	if not can_complete_service(user):
		frappe.throw(
			_("Only beauticians can complete services."),
			title=_("Not Permitted"),
			exc=frappe.PermissionError,
		)


def assert_checked_in_before_service(doc) -> None:
	from beauty_cloud.services.payment_gate import get_salon_payment_settings

	settings = get_salon_payment_settings()
	if not settings.get("require_check_in_before_service"):
		return

	status = doc.status or "Draft"
	if status in SERVICE_START_STATUSES:
		return

	frappe.throw(
		_(
			"Guest must be checked in by reception before the service can start. "
			"Current status: {0}"
		).format(status),
		title=_("Check-in Required"),
	)


def get_workflow_capabilities(user: str | None = None) -> dict:
	from beauty_cloud.services.payment_gate import get_salon_payment_settings
	from beauty_cloud.services.user_branch import get_user_beauty_branches, get_user_default_beauty_branch

	settings = get_salon_payment_settings()
	roles = sorted(user_roles(user) - {"Guest", "All"})
	return {
		"can_check_in": can_check_in(user),
		"can_start_service": can_start_service(user),
		"can_complete_service": can_complete_service(user),
		"require_check_in_before_service": bool(settings.get("require_check_in_before_service")),
		"require_invoice_before_service": bool(settings.get("require_invoice_before_service")),
		"roles": roles,
		"default_branch": get_user_default_beauty_branch(user),
		"branch_scope": get_user_beauty_branches(user),
	}
