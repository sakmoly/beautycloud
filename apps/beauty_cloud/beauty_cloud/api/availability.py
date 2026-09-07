# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.availability import get_available_slots


@frappe.whitelist(allow_guest=True)
def get_slots(
	beauty_branch: str,
	appointment_date: str,
	services: str,
	employee: str | None = None,
	service_location: str = "Salon",
):
	"""Public availability lookup for booking UI."""
	slots = get_available_slots(
		beauty_branch=beauty_branch,
		appointment_date=appointment_date,
		services=services,
		employee=employee,
		service_location=service_location,
	)
	return [
		{
			**slot,
			"start_time": str(slot["start_time"]),
			"end_time": str(slot["end_time"]),
		}
		for slot in slots
	]
