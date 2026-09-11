# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.setup_wizard import get_setup_status


def execute():
	settings = frappe.get_single("Beauty Cloud Settings")
	if settings.setup_complete:
		return

	status = get_setup_status()
	if not status.get("ready"):
		return

	settings.setup_complete = 1
	settings.save(ignore_permissions=True)
