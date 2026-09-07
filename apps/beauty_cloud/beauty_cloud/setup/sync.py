# Copyright (c) 2026, Beauty Cloud and contributors

import os

import frappe
from frappe.modules.import_file import import_file_by_path


CHILD_DOCTYPES = (
	"beauty_branch_schedule_hour",
	"service_consumption_item",
)


def sync_child_doctypes():
	"""Ensure istable DocTypes are present before parent table fields validate."""
	base = frappe.get_app_path("beauty_cloud", "beauty_cloud", "doctype")
	for doctype in CHILD_DOCTYPES:
		path = os.path.join(base, doctype, f"{doctype}.json")
		if os.path.exists(path):
			import_file_by_path(path, force=True, ignore_version=True)
