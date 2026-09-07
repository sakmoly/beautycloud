# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _

from beauty_cloud.api.utils import parse_payload
from beauty_cloud.services.reception import (
	check_in_appointment,
	complete_appointment,
	confirm_appointment,
	create_walk_in,
	get_calendar_context,
	get_reception_calendar,
	get_reception_dashboard,
	get_waiting_queue,
	mark_no_show,
	reassign_beautician,
	start_appointment,
	transition_appointment_status,
)


@frappe.whitelist()
def get_dashboard(beauty_branch: str, appointment_date: str | None = None):
	return get_reception_dashboard(beauty_branch, appointment_date)


@frappe.whitelist()
def get_calendar_context_api():
	return get_calendar_context()


@frappe.whitelist()
def get_calendar(
	beauty_branch: str,
	start_date: str,
	end_date: str | None = None,
	employee: str | None = None,
):
	return get_reception_calendar(beauty_branch, start_date, end_date, employee)


@frappe.whitelist()
def get_queue(beauty_branch: str, appointment_date: str | None = None):
	return get_waiting_queue(beauty_branch, appointment_date)


@frappe.whitelist()
def confirm(name: str):
	return confirm_appointment(name)


@frappe.whitelist()
def check_in(name: str, check_in_token: str | None = None):
	return check_in_appointment(name, check_in_token)


@frappe.whitelist()
def resolve_check_in_qr(qr_text: str):
	from beauty_cloud.services.check_in_qr import resolve_check_in_qr as _resolve

	return _resolve(qr_text)


@frappe.whitelist()
def get_check_in_qr(name: str):
	from beauty_cloud.services.check_in_qr import get_check_in_qr_payload

	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("read")
	return get_check_in_qr_payload(name)


@frappe.whitelist()
def start(name: str, service_row: int | None = None):
	return start_appointment(name, int(service_row) if service_row else None)


@frappe.whitelist()
def complete(name: str, service_row: int | None = None):
	return complete_appointment(name, int(service_row) if service_row else None)


@frappe.whitelist()
def no_show(name: str):
	return mark_no_show(name)


@frappe.whitelist()
def reassign(name: str, service_row: int, employee: str, start_time: str | None = None, skip_availability: int = 0):
	return reassign_beautician(name, int(service_row), employee, start_time, int(skip_availability))


@frappe.whitelist()
def walk_in(data=None, **kwargs):
	return create_walk_in(parse_payload(data, **kwargs))


@frappe.whitelist()
def collect_payment(name: str, mode_of_payment: str = "Cash"):
	frappe.throw(
		_("Payments must be collected through POS. Open the appointment in POS to checkout and print a receipt."),
		title=_("Use POS"),
	)


@frappe.whitelist()
def update_status(name: str, status: str, notes: str | None = None):
	return transition_appointment_status(name, status, notes)
