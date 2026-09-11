# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.api.utils import parse_payload
from beauty_cloud.services.beautician import (
	create_recommendation,
	get_current_employee,
	get_customer_summary,
	get_my_appointment,
	get_my_commission_preview,
	get_my_commission_summary,
	get_my_schedule,
	get_product_catalogue,
	preview_my_consumption,
	save_consultation,
	send_recommendation_to_reception,
	complete_my_service,
	start_my_service,
	submit_my_consumption,
	_can_view_all_schedules,
)


@frappe.whitelist()
def get_schedule(
	start_date: str | None = None,
	end_date: str | None = None,
	employee: str | None = None,
	beauty_branch: str | None = None,
):
	return get_my_schedule(start_date, end_date, employee, beauty_branch)


@frappe.whitelist()
def get_appointment_detail(name: str, employee: str | None = None):
	return get_my_appointment(name, employee)


@frappe.whitelist()
def get_customer(customer: str):
	return get_customer_summary(customer)


@frappe.whitelist()
def start_service(name: str, service_row: int | None = None):
	return start_my_service(name, int(service_row) if service_row else None)


@frappe.whitelist()
def complete_service(name: str, service_row: int | None = None):
	return complete_my_service(name, int(service_row) if service_row else None)


@frappe.whitelist()
def preview_consumption(name: str, service_row: int):
	return preview_my_consumption(name, int(service_row))


@frappe.whitelist()
def submit_consumption(name: str, service_row: int, actual_items: str | None = None):
	items = None
	if actual_items:
		import json

		items = json.loads(actual_items)
	return submit_my_consumption(name, int(service_row), items)


@frappe.whitelist()
def get_catalogue(
	beauty_branch: str,
	search: str | None = None,
	item_group: str | None = None,
	page: int = 1,
	page_size: int = 24,
):
	return get_product_catalogue(beauty_branch, search, item_group, int(page), int(page_size))


@frappe.whitelist()
def save_consultation_record(data=None, **kwargs):
	return save_consultation(parse_payload(data, **kwargs))


@frappe.whitelist()
def create_product_recommendation(data=None, **kwargs):
	return create_recommendation(parse_payload(data, **kwargs))


@frappe.whitelist()
def send_recommendation(name: str):
	return send_recommendation_to_reception(name)


@frappe.whitelist()
def get_commission_summary(limit: int = 20):
	return get_my_commission_summary(limit=int(limit))


@frappe.whitelist()
def get_commission_preview(appointment_name: str, service_row: int):
	return get_my_commission_preview(appointment_name, int(service_row))


@frappe.whitelist()
def get_me():
	from beauty_cloud.workflow_permissions import get_workflow_capabilities

	employee = get_current_employee(allow_none=True)
	can_select = _can_view_all_schedules()
	result = {
		"employee": employee,
		"employee_name": frappe.db.get_value("Employee", employee, "employee_name") if employee else None,
		"user": frappe.session.user,
		"roles": frappe.get_roles(),
		"can_select_employee": can_select and not employee,
		"workflow": get_workflow_capabilities(),
	}
	if can_select and not employee:
		result["employees"] = frappe.get_all(
			"Employee",
			filters={"status": "Active"},
			fields=["name", "employee_name"],
			order_by="employee_name asc",
		)
	return result
