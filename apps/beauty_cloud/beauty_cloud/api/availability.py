# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.availability import get_available_slots
from beauty_cloud.services.booking_schedule import (
	get_booking_schedule_plan,
	get_service_slots as fetch_service_slots,
)


@frappe.whitelist(allow_guest=True)
def get_schedule_plan(
	beauty_branch: str,
	appointment_date: str,
	services: str,
	service_location: str = "Salon",
	booking_channel: str = "online",
):
	return get_booking_schedule_plan(
		beauty_branch=beauty_branch,
		appointment_date=appointment_date,
		services=services,
		service_location=service_location,
		booking_channel=booking_channel,
	)


@frappe.whitelist(allow_guest=True)
def get_service_slots(
	beauty_branch: str,
	appointment_date: str,
	service: str,
	employee: str | None = None,
	service_location: str = "Salon",
	booking_channel: str = "online",
):
	return fetch_service_slots(
		beauty_branch=beauty_branch,
		appointment_date=appointment_date,
		service=service,
		employee=employee,
		service_location=service_location,
		booking_channel=booking_channel,
	)


@frappe.whitelist(allow_guest=True)
def get_slots(
	beauty_branch: str,
	appointment_date: str,
	services: str,
	employee: str | None = None,
	service_location: str = "Salon",
	booking_channel: str = "online",
):
	"""Public availability lookup for booking UI."""
	slots = get_available_slots(
		beauty_branch=beauty_branch,
		appointment_date=appointment_date,
		services=services,
		employee=employee,
		service_location=service_location,
		booking_channel=booking_channel,
	)
	return [
		{
			**slot,
			"start_time": str(slot["start_time"]),
			"end_time": str(slot["end_time"]),
		}
		for slot in slots
	]
