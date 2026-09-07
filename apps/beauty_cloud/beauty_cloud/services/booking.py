# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, getdate

from beauty_cloud.services.availability import validate_slot
from beauty_cloud.services.booking_payment import get_booking_payment_settings
from beauty_cloud.services.customer_identity import normalize_email, normalize_mobile, upsert_customer, find_customer
from beauty_cloud.services.otp import validate_verification_token


def create_booking(payload: dict) -> dict:
	data = frappe._dict(payload)
	settings = frappe.get_single("Beauty Cloud Settings")
	company = settings.company

	service_codes = data.services
	if isinstance(service_codes, str):
		import json

		service_codes = json.loads(service_codes) if service_codes.startswith("[") else [service_codes]

	mobile = normalize_mobile(data.mobile)
	email = normalize_email(data.email) if data.get("email") else ""
	customer = data.customer
	if not customer and (mobile or email):
		if data.verification_token:
			validate_verification_token(
				data.verification_token,
				mobile=mobile or None,
				email=email or None,
			)
		display_name = data.customer_name or mobile or email
		customer = upsert_customer(display_name, mobile=mobile or None, email=email or None)

	if not customer:
		frappe.throw(_("Customer or verified contact details are required"))

	slot = validate_slot(
		data.beauty_branch,
		data.appointment_date,
		service_codes,
		data.start_time,
		data.employee,
		data.get("service_location") or "Salon",
	)

	payment_settings = get_booking_payment_settings()
	source = data.get("source") or "Online"
	payment_at_booking = bool(payment_settings["require_payment_at_booking"]) and source == "Online"
	try:
		_validate_no_overlap(data.beauty_branch, data.employee, slot["start_time"], slot["end_time"])
		if payment_at_booking:
			initial_status = "Draft"
		else:
			initial_status = data.get("status") or "Booked"
		doc = _build_appointment_doc(data, company, customer, service_codes, slot, status=initial_status)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise

	result = doc.as_dict()
	result["payment_required"] = payment_at_booking
	if payment_at_booking:
		from beauty_cloud.services.booking_payment import create_booking_payment

		payment_session = create_booking_payment(doc.name)
		result["payment"] = payment_session
	elif doc.status == "Booked":
		from beauty_cloud.services.booking_notifications import send_booking_confirmation

		frappe.enqueue(
			send_booking_confirmation,
			appointment_name=doc.name,
			queue="short",
			now=True,
		)
	return result


def reschedule_booking(name: str, start_time: str, employee: str | None = None) -> dict:
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")

	if doc.status in ("Completed", "Cancelled", "No Show"):
		frappe.throw(_("Cannot reschedule appointment in status {0}").format(doc.status))

	service_codes = [row.beauty_service for row in doc.services]
	employee = employee or doc.services[0].employee
	slot = validate_slot(
		doc.beauty_branch,
		doc.appointment_date,
		service_codes,
		start_time,
		employee,
		doc.service_location,
	)

	frappe.db.begin()
	try:
		_validate_no_overlap(doc.beauty_branch, employee, slot["start_time"], slot["end_time"], exclude=name)
		_apply_slot_to_appointment(doc, slot, employee)
		doc.status = "Rescheduled"
		doc.save()
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise

	return doc.as_dict()


def cancel_booking(name: str, reason: str | None = None) -> dict:
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("write")

	if doc.status in ("Completed", "Cancelled"):
		frappe.throw(_("Cannot cancel appointment in status {0}").format(doc.status))

	doc.status = "Cancelled"
	if reason:
		doc.notes = reason
	doc.save()
	return doc.as_dict()


def get_customer_appointments(
	mobile: str | None = None,
	email: str | None = None,
	customer: str | None = None,
):
	if not customer:
		customer = find_customer(mobile=mobile, email=email)
	if not customer:
		return []

	rows = frappe.get_all(
		"Beauty Appointment",
		filters={"customer": customer},
		fields=[
			"name",
			"beauty_branch",
			"appointment_date",
			"scheduled_start",
			"scheduled_end",
			"status",
			"payment_status",
			"total_amount",
			"booking_payment",
			"customer_name",
		],
		order_by="scheduled_start desc",
		limit=50,
	)

	result = []
	for row in rows:
		services = frappe.get_all(
			"Beauty Appointment Service",
			filters={"parent": row.name},
			fields=["service_name", "employee_name", "start_time", "end_time", "status"],
			order_by="idx asc",
		)
		payment = None
		if row.booking_payment:
			payment = frappe.db.get_value(
				"Beauty Booking Payment",
				row.booking_payment,
				["name", "status", "amount", "currency", "paid_at", "payment_type"],
				as_dict=True,
			)
		pos = frappe.db.get_value(
			"Beauty POS Transaction",
			{"beauty_appointment": row.name, "status": "Paid"},
			["name", "invoice", "invoice_doctype", "grand_total"],
			as_dict=True,
		)
		result.append(
			{
				**row,
				"start_time": row.scheduled_start,
				"end_time": row.scheduled_end,
				"services": services,
				"online_payment": payment,
				"pos_receipt": pos,
			}
		)
	return result


def _build_appointment_doc(data, company, customer, service_codes, slot, status: str | None = None):
	from beauty_cloud.services.availability import _get_duration_meta

	meta = _get_duration_meta(service_codes)
	start = slot["start_time"]
	lines = []
	cursor = start

	for svc in meta["services"]:
		line_start = cursor + timedelta(minutes=svc["buffer_before"])
		line_end = line_start + timedelta(minutes=svc["duration"])
		cursor = line_end + timedelta(minutes=svc["buffer_after"])
		lines.append(
			{
				"beauty_service": svc["service"],
				"employee": data.employee,
				"start_time": line_start,
				"end_time": line_end,
				"duration": svc["duration"],
				"rate": svc["rate"],
				"status": "Pending",
			}
		)

	return frappe.get_doc(
		{
			"doctype": "Beauty Appointment",
			"naming_series": "BAPT-.YYYY.-",
			"company": company,
			"beauty_branch": data.beauty_branch,
			"customer": customer,
			"appointment_date": getdate(data.appointment_date),
			"status": status or data.get("status") or "Booked",
			"payment_status": data.get("payment_status") or "Unpaid",
			"source": data.get("source") or "Online",
			"service_location": data.get("service_location") or "Salon",
			"service_address": data.get("service_address"),
			"notes": data.get("notes"),
			"services": lines,
		}
	)


def _apply_slot_to_appointment(doc, slot, employee):
	from beauty_cloud.services.availability import _get_duration_meta

	meta = _get_duration_meta([row.beauty_service for row in doc.services])
	cursor = slot["start_time"]
	for row, svc in zip(doc.services, meta["services"], strict=False):
		line_start = cursor + timedelta(minutes=svc["buffer_before"])
		line_end = line_start + timedelta(minutes=svc["duration"])
		cursor = line_end + timedelta(minutes=svc["buffer_after"])
		row.employee = employee
		row.start_time = line_start
		row.end_time = line_end
		row.duration = svc["duration"]
	doc.appointment_date = getdate(slot["start_time"])


def _validate_no_overlap(branch, employee, start_dt, end_dt, exclude: str | None = None):
	from beauty_cloud.services.availability import _has_overlap

	if _has_overlap(branch, employee, get_datetime(start_dt), get_datetime(end_dt)):
		# Exclude current appointment on reschedule
		if exclude:
			rows = frappe.db.sql(
				"""
				select bas.name
				from `tabBeauty Appointment Service` bas
				inner join `tabBeauty Appointment` ba on ba.name = bas.parent
				where ba.beauty_branch = %(branch)s
				  and ba.name != %(exclude)s
				  and ba.status in ('Draft','Booked','Confirmed','Checked In','Waiting','In Service','Partially Completed','Completed')
				  and bas.employee = %(employee)s
				  and bas.start_time < %(end)s
				  and bas.end_time > %(start)s
				limit 1
				""",
				{
					"branch": branch,
					"employee": employee,
					"start": start_dt,
					"end": end_dt,
					"exclude": exclude,
				},
			)
			if rows:
				frappe.throw(_("Selected slot is no longer available"))
		else:
			frappe.throw(_("Selected slot is no longer available"))


def _default_territory() -> str:
	return frappe.db.get_value("Territory", {"is_group": 0}, "name") or "All Territories"
