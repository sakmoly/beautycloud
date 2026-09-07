# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.consumption import submit_service_consumption


@frappe.whitelist()
def submit_consumption(appointment_name: str, service_row: int, actual_items: str | None = None):
	items = None
	if actual_items:
		import json

		items = json.loads(actual_items)
	return submit_service_consumption(appointment_name, int(service_row), items)
