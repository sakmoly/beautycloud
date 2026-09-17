# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

from beauty_cloud.services.booking import create_booking
from beauty_cloud.services.branding import get_resolved_branding
from beauty_cloud.beauty_cloud.doctype.beauty_cloud_settings.beauty_cloud_settings import (
	get_allowed_payment_modes,
)
from beauty_cloud.services.booking_payment import get_booking_payment_settings
from beauty_cloud.services.payment_gate import get_salon_payment_settings, is_appointment_paid


def _resolve_kiosk_branch(device: dict, beauty_branch: str | None = None) -> str:
	"""Use device branch by default; allow another active branch in the same company."""
	if not beauty_branch or beauty_branch == device["beauty_branch"]:
		return device["beauty_branch"]

	if not frappe.db.exists(
		"Beauty Branch",
		{"name": beauty_branch, "company": device["company"], "is_active": 1},
	):
		frappe.throw(_("Invalid branch for this kiosk"))

	return beauty_branch


def authenticate_kiosk(device_id: str, api_key: str) -> dict:
	if not frappe.db.exists("Beauty Kiosk Device", device_id):
		frappe.throw(_("Invalid kiosk device"), frappe.AuthenticationError)

	device = frappe.get_doc("Beauty Kiosk Device", device_id)
	if not device.is_active:
		frappe.throw(_("Kiosk device is inactive"), frappe.AuthenticationError)
	stored_key = device.get_password("api_key", raise_exception=False)
	if not stored_key or stored_key != api_key:
		frappe.throw(_("Invalid kiosk credentials"), frappe.AuthenticationError)

	device.db_set("last_seen_at", now_datetime())
	return {
		"device_id": device.device_id,
		"device_name": device.device_name,
		"beauty_branch": device.beauty_branch,
		"company": device.company,
	}


def get_kiosk_bootstrap(device_id: str, api_key: str) -> dict:
	device = authenticate_kiosk(device_id, api_key)
	branding = get_resolved_branding(device["company"], device["beauty_branch"])
	settings = frappe.get_single("Beauty Cloud Settings")

	services = frappe.get_all(
		"Beauty Service",
		filters={
			"company": device["company"],
			"is_active": 1,
			"kiosk_enabled": 1,
		},
		fields=[
			"name",
			"service_code",
			"service_name",
			"service_name_ar",
			"default_duration",
			"standard_selling_price",
			"allow_salon",
		],
		order_by="service_name asc",
	)

	branch_name = None
	if device.get("beauty_branch"):
		branch_name = frappe.db.get_value("Beauty Branch", device["beauty_branch"], "branch_name")

	return {
		"device": device,
		"branding": branding,
		"company": device["company"],
		"beauty_branch": device["beauty_branch"],
		"branch_name": branch_name,
		"company_display_name": branding.get("company_display_name") or device["company"],
		"sms_enabled": bool(settings.enable_sms),
		"services": services,
		"salon_payment": get_salon_payment_settings(),
		"kiosk_payment": _kiosk_payment_config(),
	}


def _kiosk_payment_config() -> dict:
	settings = get_booking_payment_settings()
	salon = get_salon_payment_settings()
	return {
		"require_payment": bool(salon["require_payment_at_kiosk"]),
		"label": "Mada / Credit Card",
		"gateway": "Telr",
		"enable_telr": settings["enable_telr"],
		"telr_demo_mode": settings["telr_demo_mode"],
		"currency": settings["currency"],
	}


def get_kiosk_service_catalog(
	device_id: str,
	api_key: str,
	parent_category: str | None = None,
) -> dict:
	device = authenticate_kiosk(device_id, api_key)
	from beauty_cloud.services.public_catalog import get_public_service_catalog

	return get_public_service_catalog(
		parent_category=parent_category,
		company=device["company"],
		online_only=False,
		kiosk_only=True,
	)


def _parse_kiosk_services(services) -> list[str]:
	if isinstance(services, str):
		import json

		services = (
			json.loads(services)
			if services.strip().startswith("[")
			else [services]
		)
	return list(services)


def _serialize_slots(slots: list[dict]) -> list[dict]:
	return [
		{
			**slot,
			"start_time": str(slot["start_time"]),
			"end_time": str(slot["end_time"]),
		}
		for slot in slots
	]


def kiosk_get_available_slots(
	device_id: str,
	api_key: str,
	appointment_date: str,
	services: list[str] | str,
	employee: str | None = None,
	beauty_branch: str | None = None,
) -> list[dict]:
	from beauty_cloud.services.availability import get_available_slots

	device = authenticate_kiosk(device_id, api_key)
	branch = _resolve_kiosk_branch(device, beauty_branch)
	service_codes = _parse_kiosk_services(services)
	if not service_codes:
		frappe.throw(_("At least one service is required"))

	slots = get_available_slots(
		branch,
		appointment_date,
		service_codes,
		employee=employee,
		booking_channel="kiosk",
	)
	return _serialize_slots(slots)


def kiosk_get_beauticians(
	device_id: str,
	api_key: str,
	services: list[str] | str,
	beauty_branch: str | None = None,
) -> list[dict]:
	from beauty_cloud.services.availability import _get_candidate_employees, _load_employee_profiles

	device = authenticate_kiosk(device_id, api_key)
	branch = _resolve_kiosk_branch(device, beauty_branch)
	service_codes = _parse_kiosk_services(services)
	if not service_codes:
		frappe.throw(_("At least one service is required"))

	company = frappe.db.get_value("Beauty Branch", branch, "company")
	candidates = _get_candidate_employees(
		service_codes,
		branch,
		company,
		employee=None,
	)
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


def kiosk_get_schedule_plan(
	device_id: str,
	api_key: str,
	appointment_date: str,
	services: list[str] | str,
	beauty_branch: str | None = None,
) -> dict:
	from beauty_cloud.services.booking_schedule import get_booking_schedule_plan

	device = authenticate_kiosk(device_id, api_key)
	branch = _resolve_kiosk_branch(device, beauty_branch)
	service_codes = _parse_kiosk_services(services)
	return get_booking_schedule_plan(
		branch,
		appointment_date,
		service_codes,
		booking_channel="kiosk",
	)


def kiosk_get_service_slots(
	device_id: str,
	api_key: str,
	appointment_date: str,
	service: str,
	employee: str | None = None,
	beauty_branch: str | None = None,
) -> list[dict]:
	from beauty_cloud.services.booking_schedule import get_service_slots

	device = authenticate_kiosk(device_id, api_key)
	branch = _resolve_kiosk_branch(device, beauty_branch)
	return get_service_slots(
		branch,
		appointment_date,
		service,
		employee=employee,
		booking_channel="kiosk",
	)


def kiosk_create_booking(device_id: str, api_key: str, data: dict) -> dict:
	from frappe.utils import today

	device = authenticate_kiosk(device_id, api_key)
	payload = frappe._dict(data)
	payload.beauty_branch = _resolve_kiosk_branch(device, payload.get("beauty_branch"))
	payload.source = "Kiosk"
	payload.setdefault("service_location", "Salon")

	service_codes = _parse_kiosk_services(payload.services)
	payload.services = service_codes

	if not service_codes:
		frappe.throw(_("At least one service is required"))

	scheduling_mode = (payload.get("scheduling_mode") or "").strip().lower()
	service_assignments = payload.get("service_assignments")
	use_split = scheduling_mode == "split" or bool(service_assignments)
	if not use_split and (not payload.get("start_time") or not payload.get("employee")):
		frappe.throw(_("Please select a beautician and time slot"))
	if use_split and not service_assignments:
		frappe.throw(_("Service assignments are required for split scheduling"))
	if not payload.get("appointment_date"):
		payload.appointment_date = today()

	return create_booking(payload)


def kiosk_collect_payment(
	device_id: str,
	api_key: str,
	appointment_name: str,
	mode_of_payment: str = "Cash",
) -> dict:
	from beauty_cloud.services.payment_gate import collect_appointment_payment

	device = authenticate_kiosk(device_id, api_key)
	_validate_kiosk_appointment(appointment_name, device)

	allowed_modes = get_allowed_payment_modes("kiosk")
	if allowed_modes and mode_of_payment not in allowed_modes:
		frappe.throw(_("Payment mode {0} is not allowed at the kiosk").format(mode_of_payment))

	prev_user = frappe.session.user
	try:
		frappe.set_user("Administrator")
		return collect_appointment_payment(
			appointment_name,
			mode_of_payment=mode_of_payment,
			source="Kiosk",
			skip_permission_check=True,
		)
	finally:
		frappe.set_user(prev_user)


def _validate_kiosk_appointment(appointment_name: str, device: dict) -> None:
	if not frappe.db.exists("Beauty Appointment", appointment_name):
		frappe.throw(_("Appointment not found"))

	appt = frappe.db.get_value(
		"Beauty Appointment",
		appointment_name,
		["beauty_branch", "payment_status"],
		as_dict=True,
	)
	appt_company = frappe.db.get_value("Beauty Branch", appt.beauty_branch, "company")
	if appt_company != device["company"]:
		frappe.throw(_("Appointment does not belong to this kiosk"))
	if is_appointment_paid(appt.payment_status):
		frappe.throw(_("Appointment {0} is already paid").format(appointment_name))


def _get_device_from_request(device_id: str | None = None, api_key: str | None = None) -> tuple[str, str]:
	device_id = device_id or frappe.form_dict.get("device_id")
	api_key = api_key or frappe.form_dict.get("api_key")
	if not device_id or not api_key:
		frappe.throw(_("device_id and api_key are required"), frappe.AuthenticationError)
	return device_id, api_key
