# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

from contextlib import contextmanager

import frappe


@contextmanager
def elevated_accounting(acting_user: str | None = None):
	"""Run ERPNext accounting hooks with ledger access.

	POS reception/cashier roles must not browse the chart of accounts, but
	ERPNext's get_party_account enforces Account read during invoice submit.
	"""
	acting_user = acting_user or frappe.session.user
	if acting_user == "Administrator":
		yield acting_user
		return

	previous_user = frappe.session.user
	frappe.set_user("Administrator")
	try:
		yield acting_user
	finally:
		frappe.set_user(previous_user)


def stamp_document_owner(doctype: str, name: str, owner: str | None) -> None:
	if not owner or owner == "Administrator":
		return
	frappe.db.set_value(doctype, name, "owner", owner, update_modified=False)
