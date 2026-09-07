# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import re

import frappe
from frappe import _


def normalize_email(email: str | None) -> str:
	email = (email or "").strip().lower()
	if not email:
		return ""
	if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
		frappe.throw(_("Enter a valid email address"))
	return email


def normalize_mobile(mobile: str | None) -> str:
	mobile = (mobile or "").strip().replace(" ", "")
	return mobile


def find_customer(mobile: str | None = None, email: str | None = None) -> str | None:
	mobile = normalize_mobile(mobile)
	email = normalize_email(email) if email else ""

	if mobile:
		existing = frappe.db.get_value("Customer", {"mobile_no": mobile}, "name")
		if existing:
			return existing

	if email:
		existing = frappe.db.get_value("Customer", {"email_id": email}, "name")
		if existing:
			return existing

	return None


def upsert_customer(
	customer_name: str,
	mobile: str | None = None,
	email: str | None = None,
) -> str:
	mobile = normalize_mobile(mobile)
	email = normalize_email(email) if email else ""

	if not mobile and not email:
		frappe.throw(_("Mobile number or email is required"))

	existing = find_customer(mobile=mobile or None, email=email or None)
	if existing:
		updates = {}
		if mobile and not frappe.db.get_value("Customer", existing, "mobile_no"):
			updates["mobile_no"] = mobile
		if email and not frappe.db.get_value("Customer", existing, "email_id"):
			updates["email_id"] = email
		if updates:
			frappe.db.set_value("Customer", existing, updates, update_modified=False)
		return existing

	doc = frappe.get_doc(
		{
			"doctype": "Customer",
			"customer_name": customer_name or mobile or email,
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": _default_territory(),
			"mobile_no": mobile or None,
			"email_id": email or None,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def assert_customer_access(
	appointment: str,
	mobile: str | None = None,
	email: str | None = None,
) -> str:
	customer = find_customer(mobile=mobile, email=email)
	appt_customer = frappe.db.get_value("Beauty Appointment", appointment, "customer")
	if not customer or customer != appt_customer:
		frappe.throw(_("You do not have access to this booking"), frappe.PermissionError)
	return customer


def get_customer_contacts(customer: str) -> dict:
	row = frappe.db.get_value(
		"Customer",
		customer,
		["mobile_no", "email_id", "customer_name"],
		as_dict=True,
	)
	return {
		"mobile": (row.mobile_no if row else None) or "",
		"email": (row.email_id if row else None) or "",
		"customer_name": (row.customer_name if row else None) or "",
	}


def _default_territory() -> str:
	return frappe.db.get_value("Territory", {"is_group": 0}, "name") or "All Territories"
