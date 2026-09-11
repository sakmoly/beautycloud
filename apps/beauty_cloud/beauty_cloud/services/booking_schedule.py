# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import get_datetime, getdate

from beauty_cloud.services.availability import (
	_get_candidate_employees,
	_get_duration_meta,
	_load_employee_profiles,
	_parse_services,
	_validate_services_for_booking,
	get_available_slots,
	validate_slot,
)


def get_booking_schedule_plan(
	beauty_branch: str,
	appointment_date: str,
	services: list[str] | str,
	service_location: str = "Salon",
	booking_channel: str = "online",
) -> dict:
	"""Return unified vs split scheduling options for a service basket."""
	service_codes = _parse_services(services)
	if not service_codes:
		frappe.throw(_("At least one service is required"))

	company = frappe.db.get_value("Beauty Branch", beauty_branch, "company")
	_validate_services_for_booking(service_codes, company, service_location, booking_channel)

	unified_employees = _employees_for_all_services(
		service_codes, beauty_branch, company, booking_channel
	)
	service_rows = _service_plan_rows(service_codes, beauty_branch, company, booking_channel)
	allow_unified = len(unified_employees) > 0 and len(service_codes) > 0
	recommended_mode = "unified" if allow_unified else "split"

	return {
		"recommended_mode": recommended_mode,
		"allow_unified": allow_unified,
		"allow_split": True,
		"service_count": len(service_codes),
		"unified_employees": unified_employees,
		"services": service_rows,
	}


def get_service_slots(
	beauty_branch: str,
	appointment_date: str,
	service: str,
	employee: str | None = None,
	service_location: str = "Salon",
	booking_channel: str = "online",
) -> list[dict]:
	slots = get_available_slots(
		beauty_branch=beauty_branch,
		appointment_date=appointment_date,
		services=[service],
		employee=employee,
		service_location=service_location,
		booking_channel=booking_channel,
	)
	return [_serialize_slot(slot) for slot in slots]


def validate_service_assignments(
	beauty_branch: str,
	appointment_date: str,
	assignments: list[dict],
	service_location: str = "Salon",
	booking_channel: str = "online",
) -> list[dict]:
	if not assignments:
		frappe.throw(_("At least one service assignment is required"))

	validated: list[dict] = []
	for row in assignments:
		service = row.get("beauty_service") or row.get("service")
		employee = row.get("employee")
		start_time = row.get("start_time")
		if not service or not employee or not start_time:
			frappe.throw(_("Each service needs a beautician and start time"))

		slot = validate_slot(
			beauty_branch,
			appointment_date,
			[service],
			start_time,
			employee,
			service_location,
			booking_channel=booking_channel,
		)
		validated.append(
			{
				"beauty_service": service,
				"employee": employee,
				"employee_name": slot.get("employee_name"),
				"start_time": slot["start_time"],
				"end_time": slot["end_time"],
				"duration": slot["duration_minutes"],
			}
		)

	_validate_customer_timeline(validated)
	return validated


def _validate_customer_timeline(validated_lines: list[dict]) -> None:
	"""One customer cannot receive two services at overlapping times."""
	if len(validated_lines) < 2:
		return

	for index, row in enumerate(validated_lines):
		start_a = get_datetime(row["start_time"])
		end_a = get_datetime(row["end_time"])
		for other in validated_lines[index + 1 :]:
			start_b = get_datetime(other["start_time"])
			end_b = get_datetime(other["end_time"])
			if start_a < end_b and start_b < end_a:
				frappe.throw(
					_(
						"Services overlap for the same customer ({0} and {1}). "
						"Choose times one after another, or use Same stylist mode for back-to-back booking."
					).format(row.get("beauty_service"), other.get("beauty_service"))
				)


def _employees_for_all_services(
	service_codes: list[str],
	beauty_branch: str,
	company: str,
	booking_channel: str,
) -> list[dict]:
	candidates = _get_candidate_employees(service_codes, beauty_branch, company, employee=None)
	profiles = _load_employee_profiles(candidates)
	rows = []
	for emp in sorted(candidates, key=lambda value: profiles.get(value, {}).get("employee_name") or value):
		profile = profiles.get(emp, {})
		rows.append(
			{
				"employee": emp,
				"employee_name": profile.get("employee_name")
				or frappe.db.get_value("Employee", emp, "employee_name"),
				"employee_image": profile.get("employee_image"),
			}
		)
	return rows


def _service_plan_rows(
	service_codes: list[str],
	beauty_branch: str,
	company: str,
	booking_channel: str,
) -> list[dict]:
	meta = _get_duration_meta(service_codes)
	rows = []
	for svc in meta["services"]:
		employees = _employees_for_all_services([svc["service"]], beauty_branch, company, booking_channel)
		service_name = frappe.db.get_value("Beauty Service", svc["service"], "service_name")
		rows.append(
			{
				"service": svc["service"],
				"service_name": service_name or svc["service"],
				"duration_minutes": svc["duration"],
				"employees": employees,
			}
		)
	return rows


def _serialize_slot(slot: dict) -> dict:
	return {
		**slot,
		"start_time": str(slot["start_time"]),
		"end_time": str(slot["end_time"]),
	}


def booking_channel_for_source(source: str | None) -> str:
	source = source or "Online"
	if source == "Kiosk":
		return "kiosk"
	if source in ("Reception", "Walk-In"):
		return "reception"
	return "online"
