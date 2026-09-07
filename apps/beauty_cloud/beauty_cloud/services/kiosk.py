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
from beauty_cloud.services.payment_gate import get_salon_payment_settings


def authenticate_kiosk(device_id: str, api_key: str) -> dict:
	if not frappe.db.exists("Beauty Kiosk Device", device_id):
		frappe.throw(_("Invalid kiosk device"), frappe.AuthenticationError)

	device = frappe.get_doc("Beauty Kiosk Device", device_id)
	if not device.is_active:
		frappe.throw(_("Kiosk device is inactive"), frappe.AuthenticationError)
	if device.api_key != api_key:
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

	return {
		"device": device,
		"branding": branding,
		"company": device["company"],
		"beauty_branch": device["beauty_branch"],
		"sms_enabled": bool(settings.enable_sms),
		"services": services,
		"payment_methods": get_allowed_payment_modes("kiosk"),
		"salon_payment": get_salon_payment_settings(),
	}


def kiosk_create_booking(device_id: str, api_key: str, data: dict) -> dict:
	from beauty_cloud.services.availability import get_available_slots
	from frappe.utils import add_days, getdate, today

	device = authenticate_kiosk(device_id, api_key)
	payload = frappe._dict(data)
	payload.beauty_branch = device["beauty_branch"]
	payload.source = "Kiosk"
	payload.setdefault("service_location", "Salon")

	service_codes = payload.services
	if isinstance(service_codes, str):
		import json

		service_codes = (
			json.loads(service_codes)
			if service_codes.startswith("[")
			else [service_codes]
		)
	payload.services = service_codes

	if not payload.get("appointment_date"):
		payload.appointment_date = today()

	if not payload.get("start_time") or not payload.get("employee"):
		appointment_date = getdate(payload.appointment_date)
		slots = get_available_slots(
			payload.beauty_branch,
			appointment_date,
			service_codes,
		)
		if not slots and appointment_date == getdate(today()):
			payload.appointment_date = add_days(today(), 1)
			slots = get_available_slots(
				payload.beauty_branch,
				payload.appointment_date,
				service_codes,
			)
		if not slots:
			frappe.throw(_("No available slots for the selected services"))
		first = slots[0]
		payload.start_time = first["start_time"]
		payload.employee = first["employee"]
		payload.appointment_date = getdate(first["start_time"])

	result = create_booking(payload)
	return result


def kiosk_collect_payment(
	device_id: str,
	api_key: str,
	appointment_name: str,
	mode_of_payment: str = "Cash",
) -> dict:
	from beauty_cloud.services.payment_gate import collect_appointment_payment

	authenticate_kiosk(device_id, api_key)
	return collect_appointment_payment(
		appointment_name,
		mode_of_payment=mode_of_payment,
		source="Kiosk",
	)


def _get_device_from_request(device_id: str | None = None, api_key: str | None = None) -> tuple[str, str]:
	device_id = device_id or frappe.form_dict.get("device_id")
	api_key = api_key or frappe.form_dict.get("api_key")
	if not device_id or not api_key:
		frappe.throw(_("device_id and api_key are required"), frappe.AuthenticationError)
	return device_id, api_key
