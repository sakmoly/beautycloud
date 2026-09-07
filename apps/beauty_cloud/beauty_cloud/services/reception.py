# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import add_days, flt, get_datetime, getdate, now_datetime

from beauty_cloud.services.availability import get_available_slots, validate_slot
from beauty_cloud.services.payment_gate import (
	assert_payment_before_service,
	collect_appointment_payment,
	get_salon_payment_settings,
)
from beauty_cloud.permissions import _is_privileged

ACTIVE_CALENDAR_STATUSES = (
	"Draft",
	"Booked",
	"Confirmed",
	"Checked In",
	"Waiting",
	"In Service",
	"Partially Completed",
	"Completed",
)

ALLOWED_TRANSITIONS = {
	"Draft": {"Booked", "Confirmed", "Cancelled"},
	"Booked": {"Confirmed", "Checked In", "Waiting", "Cancelled", "No Show", "Rescheduled"},
	"Confirmed": {"Checked In", "Waiting", "Cancelled", "No Show", "Rescheduled"},
	"Checked In": {"Waiting", "In Service", "Cancelled", "No Show"},
	"Waiting": {"In Service", "Checked In", "Cancelled", "No Show"},
	"In Service": {"Partially Completed", "Completed", "Cancelled"},
	"Partially Completed": {"Completed", "In Service"},
	"Completed": set(),
	"Cancelled": set(),
	"No Show": set(),
	"Rescheduled": {"Booked", "Confirmed", "Checked In", "Waiting", "Cancelled"},
}


def get_reception_dashboard(beauty_branch: str, appointment_date: str | None = None) -> dict:
	appointment_date = getdate(appointment_date or now_datetime())
	appointments = frappe.get_all(
		"Beauty Appointment",
		filters={
			"beauty_branch": beauty_branch,
			"appointment_date": appointment_date,
		},
		fields=["name", "status", "source", "total_amount", "payment_status"],
	)

	counts = {status: 0 for status in ACTIVE_CALENDAR_STATUSES}
	counts.update({"Cancelled": 0, "No Show": 0, "Draft": 0, "Rescheduled": 0})
	walk_ins = 0
	revenue_expected = 0

	for row in appointments:
		counts[row.status] = counts.get(row.status, 0) + 1
		if row.source == "Walk-In":
			walk_ins += 1
		if row.status not in ("Cancelled", "No Show") and row.payment_status != "Paid":
			revenue_expected += flt(row.total_amount)

	queue = get_waiting_queue(beauty_branch, appointment_date)

	return {
		"beauty_branch": beauty_branch,
		"appointment_date": str(appointment_date),
		"summary": {
			"total_appointments": len(appointments),
			"booked": counts.get("Booked", 0) + counts.get("Confirmed", 0),
			"checked_in": counts.get("Checked In", 0),
			"waiting": counts.get("Waiting", 0),
			"in_service": counts.get("In Service", 0) + counts.get("Partially Completed", 0),
			"completed": counts.get("Completed", 0),
			"cancelled": counts.get("Cancelled", 0),
			"no_show": counts.get("No Show", 0),
			"walk_ins": walk_ins,
			"revenue_expected": revenue_expected,
		},
		"queue_count": len(queue),
	}


def get_calendar_context(user: str | None = None) -> dict:
	"""Return whether the user sees all branch schedules or only their own."""
	user = user or frappe.session.user
	roles = set(frappe.get_roles(user))
	employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
	employee_name = (
		frappe.db.get_value("Employee", employee, "employee_name") if employee else None
	)

	can_view_all = _can_view_all_calendar(user)
	scope = "all" if can_view_all else "own"

	return {
		"scope": scope,
		"employee": employee if scope == "own" else None,
		"employee_name": employee_name,
		"can_filter_employee": can_view_all,
		"roles": sorted(roles),
	}


def get_reception_calendar(
	beauty_branch: str,
	start_date: str,
	end_date: str | None = None,
	employee: str | None = None,
	user: str | None = None,
) -> dict:
	context = get_calendar_context(user)
	if context["scope"] == "own":
		employee = context["employee"]
		if not employee:
			return {
				"beauty_branch": beauty_branch,
				"start_date": str(getdate(start_date)),
				"end_date": str(getdate(end_date or start_date)),
				"employees": [],
				"events": [],
				"queue": [],
				"context": context,
			}
	start_date = getdate(start_date)
	end_date = getdate(end_date or start_date)

	employees = _get_branch_employees(beauty_branch, employee)
	events = []

	appointments = frappe.get_all(
		"Beauty Appointment",
		filters={
			"beauty_branch": beauty_branch,
			"appointment_date": ("between", [start_date, end_date]),
			"status": ("in", list(ACTIVE_CALENDAR_STATUSES)),
		},
		fields=[
			"name",
			"customer",
			"customer_name",
			"appointment_date",
			"scheduled_start",
			"scheduled_end",
			"status",
			"payment_status",
			"source",
			"total_amount",
		],
		order_by="scheduled_start asc",
	)

	customer_contacts = _load_customer_contacts([a.customer for a in appointments if a.customer])

	for appt in appointments:
		lines = frappe.get_all(
			"Beauty Appointment Service",
			filters={"parent": appt.name},
			fields=[
				"idx",
				"beauty_service",
				"service_name",
				"employee",
				"employee_name",
				"start_time",
				"end_time",
				"duration",
				"status",
				"amount",
			],
			order_by="idx asc",
		)
		for line in lines:
			if employee and line.employee != employee:
				continue
			events.append(
				_normalize_calendar_event(
					appt,
					line,
					customer_contacts.get(appt.customer),
				)
			)

	queue = get_waiting_queue(beauty_branch, start_date if start_date == end_date else None)

	return {
		"beauty_branch": beauty_branch,
		"start_date": str(start_date),
		"end_date": str(end_date),
		"employees": employees,
		"events": events,
		"queue": queue,
		"context": context,
	}


def get_waiting_queue(beauty_branch: str, appointment_date=None) -> list[dict]:
	"""Return today's appointments that reception can action (not only Waiting)."""
	filters = {
		"beauty_branch": beauty_branch,
		"status": ("in", ["Draft", "Booked", "Confirmed", "Checked In", "Waiting", "In Service", "Partially Completed"]),
	}
	if appointment_date:
		filters["appointment_date"] = getdate(appointment_date)

	rows = frappe.get_all(
		"Beauty Appointment",
		filters=filters,
		fields=[
			"name",
			"customer",
			"customer_name",
			"appointment_date",
			"scheduled_start",
			"scheduled_end",
			"status",
			"payment_status",
			"source",
			"total_amount",
			"modified",
		],
		order_by="scheduled_start asc, modified asc",
	)

	customer_contacts = _load_customer_contacts([row.customer for row in rows if row.customer])

	queue = []
	for row in rows:
		services = frappe.get_all(
			"Beauty Appointment Service",
			filters={"parent": row.name},
			fields=["idx", "beauty_service", "service_name", "employee", "employee_name", "duration", "start_time", "status"],
		)
		queue.append({**row, "services": services, **customer_contacts.get(row.customer, {})})
	return queue


def confirm_appointment(name: str) -> dict:
	"""Confirm a draft/unpaid booking so reception can proceed."""
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	if doc.status == "Draft":
		_transition_status(doc, "Booked")
	elif doc.status not in ("Booked", "Confirmed", "Checked In", "Waiting", "In Service"):
		frappe.throw(_("Cannot confirm appointment in status {0}").format(doc.status))
	doc.save()
	return doc.as_dict()


def check_in_appointment(name: str, check_in_token: str | None = None) -> dict:
	from beauty_cloud.services.check_in_qr import assert_check_in_token

	assert_check_in_token(name, check_in_token)
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	if doc.status == "Draft":
		_transition_status(doc, "Booked")
	if doc.status in ("Booked", "Confirmed"):
		_transition_status(doc, "Checked In")
	elif doc.status != "Checked In":
		_transition_status(doc, "Checked In")
	if not doc.scheduled_start:
		doc.scheduled_start = now_datetime()
	doc.save()
	return doc.as_dict()


def start_appointment(name: str, service_row: int | None = None) -> dict:
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	assert_payment_before_service(name)

	if doc.status == "Draft":
		_transition_status(doc, "Booked")

	if service_row:
		row = _get_service_row(doc, int(service_row))
		row.status = "In Service"
		if doc.status in ("Checked In", "Waiting", "Confirmed", "Booked"):
			_transition_status(doc, "In Service")
	else:
		_transition_status(doc, "In Service")
		for row in doc.services:
			if row.status == "Pending":
				row.status = "In Service"

	doc.save()
	return doc.as_dict()


def complete_appointment(name: str, service_row: int | None = None) -> dict:
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	assert_payment_before_service(name)

	if service_row:
		row = _get_service_row(doc, int(service_row))
		row.status = "Completed"
		pending = [r for r in doc.services if r.status not in ("Completed", "Cancelled")]
		if not pending:
			_transition_status(doc, "Completed")
		elif any(r.status == "In Service" for r in doc.services):
			_transition_status(doc, "In Service")
		else:
			_transition_status(doc, "Partially Completed")
	else:
		for row in doc.services:
			if row.status not in ("Cancelled",):
				row.status = "Completed"
		_transition_status(doc, "Completed")

	doc.save()
	return doc.as_dict()


def mark_no_show(name: str) -> dict:
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	_transition_status(doc, "No Show")
	for row in doc.services:
		if row.status not in ("Completed", "Cancelled"):
			row.status = "Cancelled"
	doc.save()
	return doc.as_dict()


def reassign_beautician(
	name: str,
	service_row: int,
	employee: str,
	start_time: str | None = None,
	skip_availability: int = 0,
) -> dict:
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	row = _get_service_row(doc, int(service_row))

	if not skip_availability:
		slot_start = start_time or row.start_time or now_datetime()
		validate_slot(
			doc.beauty_branch,
			doc.appointment_date,
			[row.beauty_service],
			slot_start,
			employee,
			doc.service_location,
		)
		if start_time:
			from beauty_cloud.services.availability import _get_duration_meta

			meta = _get_duration_meta([row.beauty_service])[0]
			row.start_time = get_datetime(start_time)
			row.end_time = row.start_time + timedelta(minutes=meta["duration"])
			row.duration = meta["duration"]

	row.employee = employee
	row.employee_name = frappe.db.get_value("Employee", employee, "employee_name")
	doc.save()
	return doc.as_dict()


def create_walk_in(payload: dict) -> dict:
	"""Walk-in: search/create customer, assign service, queue or book immediately."""
	data = frappe._dict(payload)
	settings = frappe.get_single("Beauty Cloud Settings")
	company = settings.company
	branch = data.beauty_branch
	services = _parse_services(data.services)

	customer = data.customer or _get_or_create_customer(data.customer_name, data.mobile)
	employee = data.employee
	appointment_date = getdate(data.appointment_date or now_datetime())
	now = now_datetime()

	status = "Waiting"
	start_time = data.start_time
	scheduled_lines = []

	if employee and not start_time:
		# Try next available slot today starting now (rounded to 15 min)
		slots = get_available_slots(
			beauty_branch=branch,
			appointment_date=str(appointment_date),
			services=services,
			employee=employee,
			service_location=data.get("service_location") or "Salon",
		)
		future_slots = [s for s in slots if get_datetime(s["start_time"]) >= now - timedelta(minutes=5)]
		if future_slots:
			start_time = future_slots[0]["start_time"]
			status = data.get("status") or "Checked In"

	if start_time and employee:
		from beauty_cloud.services.booking import _build_appointment_doc

		slot = validate_slot(
			branch,
			appointment_date,
			services,
			start_time,
			employee,
			data.get("service_location") or "Salon",
		)
		doc = _build_appointment_doc(
			frappe._dict(
				{
					"beauty_branch": branch,
					"appointment_date": appointment_date,
					"employee": employee,
					"service_location": data.get("service_location") or "Salon",
					"notes": data.get("notes"),
				}
			),
			company,
			customer,
			services,
			slot,
		)
		doc.source = "Walk-In"
		doc.status = status
		doc.insert(ignore_permissions=True)
		return doc.as_dict()

	# Waiting list — no slot yet
	from beauty_cloud.services.availability import _get_duration_meta

	meta = _get_duration_meta(services)
	for svc in meta["services"]:
		scheduled_lines.append(
			{
				"beauty_service": svc["service"],
				"employee": employee,
				"duration": svc["duration"],
				"rate": svc["rate"],
				"status": "Pending",
			}
		)

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Appointment",
			"naming_series": "BAPT-.YYYY.-",
			"company": company,
			"beauty_branch": branch,
			"customer": customer,
			"appointment_date": appointment_date,
			"status": "Waiting",
			"payment_status": "Unpaid",
			"source": "Walk-In",
			"service_location": data.get("service_location") or "Salon",
			"notes": data.get("notes"),
			"services": scheduled_lines,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


def transition_appointment_status(name: str, status: str, notes: str | None = None) -> dict:
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")
	_transition_status(doc, status)
	if notes:
		doc.notes = notes
	doc.save()
	return doc.as_dict()


def _transition_status(doc, new_status: str):
	current = doc.status or "Draft"
	allowed = ALLOWED_TRANSITIONS.get(current, set())
	if new_status != current and new_status not in allowed:
		frappe.throw(_("Cannot change status from {0} to {1}").format(current, new_status))
	doc.status = new_status


def _get_service_row(doc, service_row: int):
	for row in doc.services:
		if row.idx == int(service_row):
			return row
	frappe.throw(_("Service row {0} not found").format(service_row))


def _can_view_all_calendar(user: str) -> bool:
	if _is_privileged(user):
		return True
	roles = set(frappe.get_roles(user))
	return bool(roles.intersection({"Beauty Cloud Cashier"}))


def _load_customer_contacts(customer_ids: list[str]) -> dict[str, dict]:
	unique = sorted({c for c in customer_ids if c})
	if not unique:
		return {}

	rows = frappe.get_all(
		"Customer",
		filters={"name": ("in", unique)},
		fields=["name", "customer_name", "mobile_no", "email_id"],
	)
	return {
		row.name: {
			"customer": row.name,
			"customer_mobile": row.mobile_no,
			"customer_email": row.email_id,
		}
		for row in rows
	}


def _normalize_calendar_event(appt, line, customer_contact: dict | None = None) -> dict:
	start = line.start_time or appt.scheduled_start
	end = line.end_time or appt.scheduled_end
	start_str = str(start) if start else None
	end_str = str(end) if end else None
	service_name = line.service_name or line.beauty_service
	customer_name = appt.customer_name or "Guest"

	return {
		"appointment": appt.name,
		"customer": (customer_contact or {}).get("customer") or getattr(appt, "customer", None),
		"customer_name": customer_name,
		"customer_mobile": (customer_contact or {}).get("customer_mobile"),
		"customer_email": (customer_contact or {}).get("customer_email"),
		"title": f"{customer_name} · {service_name}",
		"appointment_status": appt.status,
		"payment_status": appt.payment_status,
		"source": appt.source,
		"appointment_date": str(appt.appointment_date),
		"service_row": line.idx,
		"beauty_service": line.beauty_service,
		"service_name": service_name,
		"employee": line.employee,
		"employee_name": line.employee_name,
		"start_time": start_str,
		"end_time": end_str,
		"start": start_str,
		"end": end_str,
		"duration": line.duration,
		"line_status": line.status,
		"status": line.status or appt.status,
		"amount": line.amount,
	}


def _get_branch_employees(beauty_branch: str, employee: str | None = None) -> list[dict]:
	if employee:
		return frappe.get_all(
			"Employee",
			filters={"name": employee, "status": "Active"},
			fields=["name", "employee_name"],
		)

	employee_names = frappe.get_all(
		"Employee Service Skill",
		filters={"beauty_branch": beauty_branch, "is_active": 1},
		fields=["employee", "employee_name"],
	)
	seen = set()
	employees = []
	for row in employee_names:
		if row.employee in seen:
			continue
		seen.add(row.employee)
		employees.append({"name": row.employee, "employee_name": row.employee_name})
	return sorted(employees, key=lambda r: r.get("employee_name") or "")


def _parse_services(services) -> list[str]:
	if isinstance(services, str):
		import json

		services = services.strip()
		if services.startswith("["):
			return json.loads(services)
		return [s.strip() for s in services.split(",") if s.strip()]
	return list(services)


def _get_or_create_customer(customer_name: str | None, mobile: str | None) -> str:
	if mobile:
		existing = frappe.db.get_value("Customer", {"mobile_no": mobile}, "name")
		if existing:
			return existing
	if customer_name and frappe.db.exists("Customer", customer_name):
		return customer_name

	if not customer_name and not mobile:
		frappe.throw(_("Customer name or mobile is required for walk-in"))

	doc = frappe.get_doc(
		{
			"doctype": "Customer",
			"customer_name": customer_name or mobile,
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": frappe.db.get_value("Territory", {"is_group": 0}, "name") or "All Territories",
			"mobile_no": mobile,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name
