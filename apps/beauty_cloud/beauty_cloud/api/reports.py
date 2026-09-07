# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.audit import get_audit_log, log_audit
from beauty_cloud.services.reports import (
	get_beautician_performance,
	get_inventory_variance_report,
	get_management_dashboard,
)
from beauty_cloud.utils.api_guard import get_rate_limit_audit


@frappe.whitelist()
def dashboard(
	company: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	beauty_branch: str | None = None,
):
	return get_management_dashboard(company, from_date, to_date, beauty_branch)


@frappe.whitelist()
def beautician_performance(
	company: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	beauty_branch: str | None = None,
):
	return get_beautician_performance(company, from_date, to_date, beauty_branch)


@frappe.whitelist()
def inventory_variance(
	company: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	beauty_branch: str | None = None,
):
	return get_inventory_variance_report(company, from_date, to_date, beauty_branch)


@frappe.whitelist()
def audit(limit: int = 50, action: str | None = None, user: str | None = None):
	frappe.only_for(("System Manager", "Beauty Cloud Branch Manager"))
	return get_audit_log(limit=int(limit), action=action, user=user)


@frappe.whitelist()
def security_audit():
	frappe.only_for("System Manager")
	return get_rate_limit_audit()


@frappe.whitelist()
def log(action: str, reference_doctype: str | None = None, reference_name: str | None = None, details=None):
	if isinstance(details, str):
		import json

		details = json.loads(details) if details else {}
	return log_audit(action, reference_doctype, reference_name, details)
