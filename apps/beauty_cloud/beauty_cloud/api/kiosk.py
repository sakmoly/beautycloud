# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.kiosk import (
	get_kiosk_bootstrap,
	get_kiosk_service_catalog,
	kiosk_collect_payment,
	kiosk_create_booking,
	kiosk_get_available_slots,
	kiosk_get_beauticians,
	kiosk_get_check_in_qr,
	kiosk_get_schedule_plan,
	kiosk_get_service_slots,
)


@frappe.whitelist(allow_guest=True)
def bootstrap(device_id: str, api_key: str):
	return get_kiosk_bootstrap(device_id, api_key)


@frappe.whitelist(allow_guest=True)
def get_catalog(device_id: str, api_key: str, parent_category: str | None = None):
	return get_kiosk_service_catalog(device_id, api_key, parent_category)


@frappe.whitelist(allow_guest=True)
def get_slots(
	device_id: str,
	api_key: str,
	appointment_date: str,
	services: str,
	employee: str | None = None,
	beauty_branch: str | None = None,
):
	return kiosk_get_available_slots(
		device_id, api_key, appointment_date, services, employee, beauty_branch=beauty_branch
	)


@frappe.whitelist(allow_guest=True)
def get_beauticians(device_id: str, api_key: str, services: str, beauty_branch: str | None = None):
	return kiosk_get_beauticians(device_id, api_key, services, beauty_branch=beauty_branch)


@frappe.whitelist(allow_guest=True)
def get_schedule_plan(
	device_id: str,
	api_key: str,
	appointment_date: str,
	services: str,
	beauty_branch: str | None = None,
):
	return kiosk_get_schedule_plan(
		device_id, api_key, appointment_date, services, beauty_branch=beauty_branch
	)


@frappe.whitelist(allow_guest=True)
def get_service_slots(
	device_id: str,
	api_key: str,
	appointment_date: str,
	service: str,
	employee: str | None = None,
	beauty_branch: str | None = None,
):
	return kiosk_get_service_slots(
		device_id, api_key, appointment_date, service, employee, beauty_branch=beauty_branch
	)


@frappe.whitelist(allow_guest=True)
def book(device_id: str, api_key: str, data=None):
	import json

	if data is None:
		payload = {
			key: value
			for key, value in frappe.form_dict.items()
			if key not in ("cmd", "device_id", "api_key", "data")
		}
	elif isinstance(data, str):
		payload = json.loads(data)
	else:
		payload = data

	return kiosk_create_booking(device_id, api_key, payload)


@frappe.whitelist(allow_guest=True)
def collect_payment(device_id: str, api_key: str, appointment: str, mode_of_payment: str = "Cash"):
	return kiosk_collect_payment(device_id, api_key, appointment, mode_of_payment)


@frappe.whitelist(allow_guest=True)
def get_check_in_qr(device_id: str, api_key: str, appointment: str):
	return kiosk_get_check_in_qr(device_id, api_key, appointment)
