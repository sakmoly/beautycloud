# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.kiosk import get_kiosk_bootstrap, kiosk_collect_payment, kiosk_create_booking


@frappe.whitelist(allow_guest=True)
def bootstrap(device_id: str, api_key: str):
	return get_kiosk_bootstrap(device_id, api_key)


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
