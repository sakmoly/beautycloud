# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, flt, getdate, now_datetime, today

from beauty_cloud.services.commission import get_commission_ledger, preview_commission
from beauty_cloud.services.consumption import preview_service_consumption, submit_service_consumption
from beauty_cloud.services.reception import complete_appointment, start_appointment


from beauty_cloud.permissions import _is_privileged


def get_current_employee(user: str | None = None, allow_none: bool = False) -> str | None:
	user = user or frappe.session.user
	if user == "Administrator":
		if allow_none:
			return None
		employee = frappe.flags.get("beauty_cloud_test_employee")
		if employee:
			return employee
		# Admin without linked employee can still browse schedules when allow_none
		return None

	employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")
	if not employee:
		if allow_none and _is_privileged(user):
			return None
		frappe.throw(_("No active employee linked to user {0}").format(user))
	return employee


def _can_view_all_schedules(user: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	return "Beauty Cloud Cashier" in set(frappe.get_roles(user))


def get_my_schedule(
	start_date: str | None = None,
	end_date: str | None = None,
	employee: str | None = None,
	beauty_branch: str | None = None,
) -> dict:
	user = frappe.session.user
	if not employee:
		employee = get_current_employee(allow_none=True)

	if not employee and not _can_view_all_schedules(user):
		frappe.throw(_("No active employee linked to user {0}").format(user))

	start_date = getdate(start_date or today())
	end_date = getdate(end_date or add_days(start_date, 7))

	conditions = [
		"ba.appointment_date between %(start)s and %(end)s",
		"ba.status not in ('Cancelled', 'No Show')",
	]
	params: dict = {"start": start_date, "end": end_date}

	if employee:
		conditions.append("bas.employee = %(employee)s")
		params["employee"] = employee
	if beauty_branch:
		conditions.append("ba.beauty_branch = %(beauty_branch)s")
		params["beauty_branch"] = beauty_branch

	lines = frappe.db.sql(
		f"""
		select
			ba.name as appointment,
			ba.customer,
			ba.customer_name,
			c.mobile_no as customer_mobile,
			c.email_id as customer_email,
			ba.appointment_date,
			ba.status as appointment_status,
			ba.payment_status,
			ba.beauty_branch,
			ba.source,
			bas.idx as service_row,
			bas.name,
			bas.beauty_service,
			bas.service_name,
			bas.employee,
			bas.employee_name,
			bas.start_time,
			bas.end_time,
			bas.duration,
			bas.status as line_status,
			bas.consumption_status,
			bas.commission_status,
			bas.amount
		from `tabBeauty Appointment Service` bas
		inner join `tabBeauty Appointment` ba on ba.name = bas.parent
		left join `tabCustomer` c on c.name = ba.customer
		where {" and ".join(conditions)}
		order by bas.start_time asc, ba.name asc
		""",
		params,
		as_dict=True,
	)

	from beauty_cloud.services.invoice_gate import get_appointment_invoice_info

	appointment_names = sorted({row.appointment for row in lines if row.appointment})
	invoice_by_appointment = {
		name: get_appointment_invoice_info(name)["has_invoice"] for name in appointment_names
	}
	for row in lines:
		row["has_invoice"] = invoice_by_appointment.get(row.appointment, False)

	today_lines = [row for row in lines if getdate(row.appointment_date) == getdate(today())]
	upcoming = [row for row in lines if getdate(row.appointment_date) > getdate(today())]

	employee_name = None
	if employee:
		employee_name = frappe.db.get_value("Employee", employee, "employee_name")

	return {
		"employee": employee,
		"employee_name": employee_name,
		"can_select_employee": _can_view_all_schedules(user),
		"start_date": str(start_date),
		"end_date": str(end_date),
		"today": today_lines,
		"upcoming": upcoming,
		"all": lines,
	}


def get_my_appointment(name: str, employee: str | None = None) -> dict:
	employee = employee or get_current_employee(allow_none=True)
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("read")

	privileged = _can_view_all_schedules() and not employee
	if employee:
		_assert_employee_on_appointment(doc, employee)
	elif not privileged:
		frappe.throw(_("No active employee linked to user {0}").format(frappe.session.user))

	if privileged:
		my_lines = list(doc.services)
		consultation_filters = {"beauty_appointment": doc.name}
		recommendation_filters = {"beauty_appointment": doc.name}
	else:
		my_lines = [row for row in doc.services if row.employee == employee]
		consultation_filters = {"beauty_appointment": doc.name, "employee": employee}
		recommendation_filters = {"beauty_appointment": doc.name, "recommended_by": employee}

	customer = get_customer_summary(doc.customer)

	return {
		"appointment": {
			"name": doc.name,
			"beauty_branch": doc.beauty_branch,
			"appointment_date": str(doc.appointment_date),
			"scheduled_start": doc.scheduled_start,
			"scheduled_end": doc.scheduled_end,
			"status": doc.status,
			"payment_status": doc.payment_status,
			"service_location": doc.service_location,
			"source": doc.source,
			"total_amount": doc.total_amount,
			"notes": doc.notes,
		},
		"customer": customer,
		"my_services": [row.as_dict() for row in my_lines],
		"consultations": frappe.get_all(
			"Beauty Consultation",
			filters=consultation_filters,
			fields=["name", "status", "desired_style", "consultation_date", "notes"],
		),
		"recommendations": frappe.get_all(
			"Beauty Product Recommendation",
			filters=recommendation_filters,
			fields=["name", "status", "total_amount"],
		),
	}


def get_customer_summary(customer: str) -> dict:
	fields = frappe.db.get_value(
		"Customer",
		customer,
		["name", "customer_name", "mobile_no", "email_id", "customer_group"],
		as_dict=True,
	)
	if not fields:
		return {}

	mobile = fields.mobile_no or ""
	masked_mobile = mobile
	if len(mobile) > 4:
		masked_mobile = "*" * (len(mobile) - 4) + mobile[-4:]

	return {
		"name": fields.name,
		"customer_name": fields.customer_name,
		"mobile_masked": masked_mobile,
		"email": fields.email_id,
		"customer_group": fields.customer_group,
	}


def start_my_service(name: str, service_row: int | None = None, employee: str | None = None) -> dict:
	employee = employee or get_current_employee(allow_none=True)
	doc = frappe.get_doc("Beauty Appointment", name)
	if employee:
		_assert_employee_on_appointment(doc, employee, service_row)
	elif not _can_view_all_schedules():
		frappe.throw(_("No active employee linked to user {0}").format(frappe.session.user))
	return start_appointment(name, service_row)


def complete_my_service(name: str, service_row: int | None = None, employee: str | None = None) -> dict:
	employee = employee or get_current_employee(allow_none=True)
	doc = frappe.get_doc("Beauty Appointment", name)
	if employee:
		_assert_employee_on_appointment(doc, employee, service_row)
	elif not _can_view_all_schedules():
		frappe.throw(_("No active employee linked to user {0}").format(frappe.session.user))
	return complete_appointment(name, service_row)


def preview_my_consumption(name: str, service_row: int, employee: str | None = None) -> dict:
	employee = employee or get_current_employee(allow_none=True)
	doc = frappe.get_doc("Beauty Appointment", name)
	if employee:
		_assert_employee_on_appointment(doc, employee, service_row)
	elif not _can_view_all_schedules():
		frappe.throw(_("No active employee linked to user {0}").format(frappe.session.user))
	return preview_service_consumption(name, service_row)


def submit_my_consumption(
	name: str,
	service_row: int,
	actual_items: list[dict] | None = None,
	employee: str | None = None,
) -> dict:
	employee = employee or get_current_employee(allow_none=True)
	doc = frappe.get_doc("Beauty Appointment", name)
	if employee:
		_assert_employee_on_appointment(doc, employee, service_row)
	elif not _can_view_all_schedules():
		frappe.throw(_("No active employee linked to user {0}").format(frappe.session.user))
	return submit_service_consumption(name, service_row, actual_items)


def get_product_catalogue(
	beauty_branch: str,
	search: str | None = None,
	item_group: str | None = None,
	page: int = 1,
	page_size: int = 24,
) -> dict:
	warehouse = frappe.db.get_value("Beauty Branch", beauty_branch, "retail_warehouse")
	if not warehouse:
		frappe.throw(_("Retail warehouse is not configured for branch {0}").format(beauty_branch))

	company = frappe.db.get_value("Beauty Branch", beauty_branch, "company")
	conditions = [
		"i.disabled = 0",
		"i.is_stock_item = 1",
		"b.warehouse = %(warehouse)s",
		"b.actual_qty > 0",
	]
	params = {"warehouse": warehouse, "start": (page - 1) * page_size, "page_size": page_size}

	if search:
		conditions.append("(i.item_code like %(search)s or i.item_name like %(search)s)")
		params["search"] = f"%{search}%"
	if item_group:
		conditions.append("i.item_group = %(item_group)s")
		params["item_group"] = item_group

	where = " and ".join(conditions)
	items = frappe.db.sql(
		f"""
		select
			i.name as item_code,
			i.item_name,
			i.item_group,
			i.image,
			i.stock_uom,
			i.standard_rate,
			b.actual_qty as stock_qty
		from `tabItem` i
		inner join `tabBin` b on b.item_code = i.name
		where {where}
		order by i.item_name asc
		limit %(start)s, %(page_size)s
		""",
		params,
		as_dict=True,
	)

	for row in items:
		row["rate"] = _get_item_selling_rate(row.item_code, company)
		row["in_stock"] = flt(row.stock_qty) > 0

	total = frappe.db.sql(
		f"""
		select count(*) from `tabItem` i
		inner join `tabBin` b on b.item_code = i.name
		where {where}
		""",
		params,
	)[0][0]

	return {
		"beauty_branch": beauty_branch,
		"warehouse": warehouse,
		"page": page,
		"page_size": page_size,
		"total": total,
		"items": items,
	}


def save_consultation(payload: dict, employee: str | None = None) -> dict:
	employee = employee or get_current_employee(allow_none=True)
	data = frappe._dict(payload)
	if not employee and _can_view_all_schedules():
		if data.beauty_appointment:
			appt = frappe.get_doc("Beauty Appointment", data.beauty_appointment)
			assigned = [row.employee for row in appt.services if row.employee]
			employee = assigned[0] if assigned else None
		if not employee:
			employee = frappe.db.get_value("Employee", {"status": "Active"}, "name")
	if not employee:
		frappe.throw(_("No active employee linked to user {0}").format(frappe.session.user))

	data.setdefault("employee", employee)
	data.setdefault("employee_name", frappe.db.get_value("Employee", employee, "employee_name"))
	data.setdefault("doctype", "Beauty Consultation")
	data.setdefault("status", "Draft")

	if data.beauty_appointment:
		appt = frappe.get_doc("Beauty Appointment", data.beauty_appointment)
		data.setdefault("company", appt.company)
		data.setdefault("beauty_branch", appt.beauty_branch)
		data.setdefault("customer", appt.customer)
		data.setdefault("customer_name", appt.customer_name)
		if employee and not _can_view_all_schedules():
			_assert_employee_on_appointment(appt, employee)

	if data.name and frappe.db.exists("Beauty Consultation", data.name):
		doc = frappe.get_doc("Beauty Consultation", data.name)
		doc.update(data)
		doc.save()
	else:
		doc = frappe.get_doc(data)
		doc.insert()

	return doc.as_dict()


def create_recommendation(payload: dict, employee: str | None = None) -> dict:
	employee = employee or get_current_employee()
	data = frappe._dict(payload)

	if not data.get("items"):
		frappe.throw(_("At least one product is required"))

	settings = frappe.get_single("Beauty Cloud Settings")
	doc = frappe.get_doc(
		{
			"doctype": "Beauty Product Recommendation",
			"naming_series": "BREC-.YYYY.-",
			"company": data.company or settings.company,
			"beauty_branch": data.beauty_branch,
			"customer": data.customer,
			"beauty_appointment": data.get("beauty_appointment"),
			"recommended_by": employee,
			"status": "Draft",
			"notes": data.get("notes"),
			"items": data["items"],
		}
	)
	doc.insert()
	return doc.as_dict()


def send_recommendation_to_reception(name: str, employee: str | None = None) -> dict:
	employee = employee or get_current_employee()
	doc = frappe.get_doc("Beauty Product Recommendation", name)
	if doc.recommended_by != employee and frappe.session.user != "Administrator":
		frappe.throw(_("You can only send your own recommendations"))

	doc.status = "Sent to Reception"
	doc.save()
	return doc.as_dict()


def get_my_commission_summary(employee: str | None = None, limit: int = 20) -> dict:
	employee = employee or get_current_employee()
	ledger = get_commission_ledger(employee=employee, limit=limit)
	total = sum(flt(row.commission_amount) for row in ledger)
	return {
		"employee": employee,
		"employee_name": frappe.db.get_value("Employee", employee, "employee_name"),
		"total_posted": total,
		"entries": ledger,
	}


def get_my_commission_preview(appointment_name: str, service_row: int, employee: str | None = None) -> dict:
	employee = employee or get_current_employee()
	doc = frappe.get_doc("Beauty Appointment", appointment_name)
	_assert_employee_on_appointment(doc, employee, service_row)
	rows = preview_commission(appointment_name, service_row)
	return rows[0] if rows else {}


def _assert_employee_on_appointment(doc, employee: str, service_row: int | None = None):
	assigned = [row for row in doc.services if row.employee == employee]
	if not assigned:
		frappe.throw(_("You are not assigned to this appointment"))

	if service_row is not None:
		if not any(row.idx == int(service_row) for row in assigned):
			frappe.throw(_("You are not assigned to service row {0}").format(service_row))


def _get_item_selling_rate(item_code: str, company: str) -> float:
	price = frappe.db.get_value(
		"Item Price",
		{"item_code": item_code, "selling": 1},
		"price_list_rate",
	)
	if price:
		return flt(price)
	return flt(frappe.db.get_value("Item", item_code, "standard_rate"))
