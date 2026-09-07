# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.booking_payment import (
	complete_demo_payment,
	create_booking_payment,
	get_payment_status,
	handle_telr_return,
)


@frappe.whitelist(allow_guest=True)
def initiate_payment(appointment: str):
	return create_booking_payment(appointment)


@frappe.whitelist(allow_guest=True)
def complete_demo_payment_session(payment_name: str, demo_token: str):
	return complete_demo_payment(payment_name, demo_token)


@frappe.whitelist(allow_guest=True)
def telr_return(order_ref: str | None = None):
	return handle_telr_return(order_ref)


@frappe.whitelist(allow_guest=True)
def get_booking_payment_status(payment_name: str):
	return get_payment_status(payment_name)
