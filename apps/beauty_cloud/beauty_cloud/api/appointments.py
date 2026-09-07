# Copyright (c) 2026, Beauty Cloud and contributors

from datetime import datetime, timedelta

import frappe
from frappe.utils import getdate, now_datetime


@frappe.whitelist()
def list_appointments(
	beauty_branch: str | None = None,
	appointment_date: str | None = None,
	status: str | None = None,
	limit: int = 50,
):
	"""List appointments for reception/calendar views."""
	filters = _base_filters(beauty_branch)
	if appointment_date:
		filters["appointment_date"] = getdate(appointment_date)
	if status:
		filters["status"] = status

	return frappe.get_all(
		"Beauty Appointment",
		filters=filters,
		fields=[
			"name",
			"customer",
			"customer_name",
			"beauty_branch",
			"appointment_date",
			"scheduled_start",
			"scheduled_end",
			"status",
			"payment_status",
			"total_amount",
			"source",
			"service_location",
		],
		order_by="scheduled_start asc",
		limit_page_length=int(limit),
	)


@frappe.whitelist()
def get_appointment(name: str):
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("read")
	return doc.as_dict()


@frappe.whitelist()
def create_appointment(data):
	"""Create appointment from dict/JSON payload."""
	if isinstance(data, str):
		import json

		data = json.loads(data)

	payload = frappe._dict(data)
	payload.setdefault("doctype", "Beauty Appointment")
	payload.setdefault("status", "Booked")
	payload.setdefault("payment_status", "Unpaid")

	doc = frappe.get_doc(payload)
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def update_appointment_status(name: str, status: str, notes: str | None = None):
	allowed = {
		"Draft",
		"Booked",
		"Confirmed",
		"Checked In",
		"Waiting",
		"In Service",
		"Partially Completed",
		"Completed",
		"Cancelled",
		"No Show",
		"Rescheduled",
	}
	if status not in allowed:
		frappe.throw(f"Invalid status: {status}")

	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	doc.status = status
	if notes:
		doc.notes = notes
	doc.save()
	return doc.as_dict()


@frappe.whitelist()
def get_qualified_beauticians(beauty_service: str, beauty_branch: str | None = None):
	filters = {"beauty_service": beauty_service, "is_active": 1}
	if beauty_branch:
		filters["beauty_branch"] = beauty_branch

	return frappe.get_all(
		"Employee Service Skill",
		filters=filters,
		fields=["employee", "employee_name", "skill_level", "beauty_branch"],
		order_by="employee_name asc",
	)


def _base_filters(beauty_branch: str | None = None) -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	filters = {"company": settings.company}
	if beauty_branch:
		filters["beauty_branch"] = beauty_branch
	return filters
