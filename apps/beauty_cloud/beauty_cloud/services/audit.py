# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import json

import frappe
from frappe.utils import now_datetime


def log_audit(
	action: str,
	reference_doctype: str | None = None,
	reference_name: str | None = None,
	details: dict | None = None,
	api_method: str | None = None,
	idempotency_key: str | None = None,
	user: str | None = None,
):
	doc = frappe.get_doc(
		{
			"doctype": "Beauty Cloud Audit Log",
			"action": action,
			"user": user or frappe.session.user,
			"api_method": api_method or _current_api_method(),
			"idempotency_key": idempotency_key,
			"reference_doctype": reference_doctype,
			"reference_name": reference_name,
			"details": details or {},
			"ip_address": frappe.local.request_ip if getattr(frappe.local, "request_ip", None) else None,
			"user_agent": (frappe.get_request_header("User-Agent") or "")[:500] or None,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


def get_audit_log(
	limit: int = 50,
	action: str | None = None,
	reference_doctype: str | None = None,
	reference_name: str | None = None,
	user: str | None = None,
) -> list[dict]:
	filters = {}
	if action:
		filters["action"] = action
	if reference_doctype:
		filters["reference_doctype"] = reference_doctype
	if reference_name:
		filters["reference_name"] = reference_name
	if user:
		filters["user"] = user

	rows = frappe.get_all(
		"Beauty Cloud Audit Log",
		filters=filters,
		fields=[
			"name",
			"action",
			"user",
			"api_method",
			"idempotency_key",
			"reference_doctype",
			"reference_name",
			"details",
			"creation",
		],
		order_by="creation desc",
		limit_page_length=int(limit),
	)
	for row in rows:
		if isinstance(row.get("details"), str):
			try:
				row["details"] = json.loads(row["details"])
			except Exception:
				pass
	return rows


def get_idempotent_response(idempotency_key: str) -> dict | None:
	if not idempotency_key:
		return None

	row = frappe.db.get_value(
		"Beauty Cloud Audit Log",
		{"idempotency_key": idempotency_key},
		["name", "details"],
		as_dict=True,
	)
	if not row or not row.details:
		return None

	details = row.details
	if isinstance(details, str):
		try:
			details = json.loads(details)
		except Exception:
			return None

	if isinstance(details, dict) and details.get("idempotent_response") is not None:
		return details["idempotent_response"]
	return None


def store_idempotent_response(idempotency_key: str, response, action: str, api_method: str | None = None):
	if not idempotency_key:
		return

	if frappe.db.exists("Beauty Cloud Audit Log", {"idempotency_key": idempotency_key}):
		return

	log_audit(
		action=action,
		api_method=api_method,
		idempotency_key=idempotency_key,
		details={"idempotent_response": response, "stored_at": str(now_datetime())},
	)


def _current_api_method() -> str | None:
	form_dict = getattr(frappe.local, "form_dict", None) or {}
	cmd = form_dict.get("cmd")
	return str(cmd) if cmd else None
