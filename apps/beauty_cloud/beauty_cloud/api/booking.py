# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.booking import (
	cancel_booking,
	create_booking,
	get_customer_appointments,
	reschedule_booking,
)


@frappe.whitelist(allow_guest=True)
def create_online_booking(data=None):
	import json

	if data is None:
		payload = {
			key: value
			for key, value in frappe.form_dict.items()
			if key not in ("cmd", "data")
		}
	elif isinstance(data, str):
		payload = json.loads(data)
	else:
		payload = data

	return create_booking(payload)


@frappe.whitelist(allow_guest=True)
def reschedule_online_booking(name: str, start_time: str, employee: str | None = None):
	return reschedule_booking(name, start_time, employee)


@frappe.whitelist(allow_guest=True)
def cancel_online_booking(name: str, reason: str | None = None):
	return cancel_booking(name, reason)


@frappe.whitelist(allow_guest=True)
def get_my_appointments(
	mobile: str | None = None,
	email: str | None = None,
	customer: str | None = None,
):
	return get_customer_appointments(mobile=mobile, email=email, customer=customer)


@frappe.whitelist(allow_guest=True)
def get_customer_check_in_qr(
	name: str,
	mobile: str | None = None,
	email: str | None = None,
):
	from beauty_cloud.services.check_in_qr import get_check_in_qr_payload
	from beauty_cloud.services.customer_identity import assert_customer_access

	assert_customer_access(name, mobile=mobile, email=email)
	return get_check_in_qr_payload(name)


@frappe.whitelist(allow_guest=True)
def get_booking_receipt(
	appointment: str,
	mobile: str | None = None,
	email: str | None = None,
):
	from beauty_cloud.services.customer_portal import get_booking_receipt as _get_receipt

	return _get_receipt(appointment, mobile=mobile, email=email)
