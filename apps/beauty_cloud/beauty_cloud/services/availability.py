# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

from datetime import datetime, timedelta, time as dt_time

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, getdate, get_time, get_url, now_datetime, time_diff_in_seconds

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
ACTIVE_APPOINTMENT_STATUSES = (
	"Draft",
	"Booked",
	"Confirmed",
	"Checked In",
	"Waiting",
	"In Service",
	"Partially Completed",
	"Completed",
)


def get_available_slots(
	beauty_branch: str,
	appointment_date: str,
	services: list[str] | str,
	employee: str | None = None,
	service_location: str = "Salon",
	slot_interval: int | None = None,
	booking_channel: str = "online",
) -> list[dict]:
	"""Return valid booking slots for one or more services."""
	service_codes = _parse_services(services)
	if not service_codes:
		frappe.throw(_("At least one service is required"))

	appointment_date = getdate(appointment_date)
	if appointment_date < getdate(now_datetime()):
		return []

	weekday = WEEKDAYS[appointment_date.weekday()]
	company = frappe.db.get_value("Beauty Branch", beauty_branch, "company")
	_validate_services_for_booking(service_codes, company, service_location, booking_channel)

	duration_meta = _get_duration_meta(service_codes)
	slot_interval = slot_interval or _get_slot_interval(beauty_branch)
	earliest_bookable = _get_earliest_bookable_start(appointment_date, slot_interval)
	from beauty_cloud.services.hr_schedule import is_branch_holiday

	if is_branch_holiday(beauty_branch, appointment_date, company):
		return []

	branch_window = _get_branch_window(beauty_branch, weekday, appointment_date)
	if not branch_window:
		return []

	candidates = _get_candidate_employees(service_codes, beauty_branch, company, employee)
	profiles = _load_employee_profiles(candidates)
	slots: list[dict] = []
	seen: set[tuple] = set()

	for emp in candidates:
		profile = profiles.get(emp, {})
		emp_window = _get_employee_window(emp, beauty_branch, weekday, appointment_date, branch_window)
		if not emp_window:
			continue

		cursor = emp_window["start"]
		if earliest_bookable:
			cursor = max(cursor, earliest_bookable)
		slot_duration = timedelta(minutes=duration_meta["total_minutes"])
		while cursor + slot_duration <= emp_window["end"]:
			slot_end = cursor + slot_duration
			if not _has_overlap(beauty_branch, emp, cursor, slot_end):
				key = (emp, cursor.isoformat())
				if key not in seen:
					seen.add(key)
					slots.append(
						{
							"employee": emp,
							"employee_name": profile.get("employee_name")
							or frappe.db.get_value("Employee", emp, "employee_name"),
							"employee_image": profile.get("employee_image"),
							"start_time": cursor,
							"end_time": slot_end,
							"duration_minutes": duration_meta["total_minutes"],
							"services": service_codes,
						}
					)
			cursor += timedelta(minutes=slot_interval)

	slots.sort(key=lambda row: (row["start_time"], row.get("employee_name") or ""))
	return slots


def validate_slot(
	beauty_branch: str,
	appointment_date: str,
	services: list[str] | str,
	start_time: str | datetime,
	employee: str,
	service_location: str = "Salon",
	booking_channel: str = "online",
) -> dict:
	"""Revalidate a slot at booking confirmation time."""
	start_dt = get_datetime(start_time)
	appointment_day = getdate(appointment_date)
	if appointment_day < getdate(now_datetime()):
		frappe.throw(_("Cannot book appointments in the past"))

	service_codes = _parse_services(services)
	duration_meta = _get_duration_meta(service_codes)
	end_dt = start_dt + timedelta(minutes=duration_meta["total_minutes"])
	weekday = WEEKDAYS[appointment_day.weekday()]
	company = frappe.db.get_value("Beauty Branch", beauty_branch, "company")

	_validate_services_for_booking(service_codes, company, service_location, booking_channel)
	slot_interval = _get_slot_interval(beauty_branch)
	earliest_bookable = _get_earliest_bookable_start(appointment_day, slot_interval)
	if earliest_bookable and start_dt < earliest_bookable:
		frappe.throw(_("Selected time is in the past"))
	from beauty_cloud.services.hr_schedule import is_branch_holiday, is_employee_on_leave

	if is_branch_holiday(beauty_branch, appointment_day, company):
		frappe.throw(_("Branch is closed on this date"))

	branch_window = _get_branch_window(beauty_branch, weekday, appointment_day)
	if not branch_window:
		frappe.throw(_("Branch is closed on {0}").format(weekday))

	if is_employee_on_leave(employee, appointment_day):
		frappe.throw(_("Selected beautician is on leave on this date"))

	emp_window = _get_employee_window(employee, beauty_branch, weekday, appointment_day, branch_window)
	if not emp_window or start_dt < emp_window["start"] or end_dt > emp_window["end"]:
		frappe.throw(_("Selected time is outside working hours"))

	if not _employee_can_perform_services(employee, service_codes, company, beauty_branch):
		frappe.throw(_("Selected beautician is not qualified for all services"))

	if _has_overlap(beauty_branch, employee, start_dt, end_dt):
		frappe.throw(_("Selected slot is no longer available"))

	profile = _load_employee_profiles([employee]).get(employee, {})

	return {
		"employee": employee,
		"employee_name": profile.get("employee_name")
		or frappe.db.get_value("Employee", employee, "employee_name"),
		"employee_image": profile.get("employee_image"),
		"start_time": start_dt,
		"end_time": end_dt,
		"duration_minutes": duration_meta["total_minutes"],
	}


def _resolve_employee_image(image: str | None) -> str | None:
	if not image:
		return None
	image = image.strip()
	if not image:
		return None
	if image.startswith(("http://", "https://")):
		return image
	return get_url(image)


def _load_employee_profiles(employee_ids: list[str]) -> dict[str, dict]:
	unique = sorted({employee for employee in employee_ids if employee})
	if not unique:
		return {}

	rows = frappe.get_all(
		"Employee",
		filters={"name": ("in", unique), "status": "Active"},
		fields=["name", "employee_name", "image"],
	)
	return {
		row.name: {
			"employee_name": row.employee_name,
			"employee_image": _resolve_employee_image(row.image),
		}
		for row in rows
	}


def _parse_services(services: list[str] | str) -> list[str]:
	if isinstance(services, str):
		import json

		services = services.strip()
		if services.startswith("["):
			services = json.loads(services)
		else:
			services = [s.strip() for s in services.split(",") if s.strip()]
	return list(services)


def _combine_datetime(date_value, time_value) -> datetime:
	"""Combine date + time into datetime (Frappe 16 has no combine_datetime helper)."""
	date_part = getdate(date_value)
	if isinstance(time_value, str):
		time_part = get_time(time_value)
	elif isinstance(time_value, timedelta):
		time_part = (datetime.min + time_value).time()
	elif isinstance(time_value, dt_time):
		time_part = time_value
	else:
		time_part = get_time(str(time_value))
	return datetime.combine(date_part, time_part)


def _get_slot_interval(beauty_branch: str) -> int:
	settings = frappe.get_single("Beauty Cloud Settings")
	branch_interval = frappe.db.get_value("Beauty Branch Schedule", beauty_branch, "slot_interval_minutes")
	return int(branch_interval or settings.default_slot_interval_minutes or 15)


def _ceil_datetime_to_interval(dt: datetime, interval_minutes: int) -> datetime:
	"""Round up to the next slot boundary (e.g. 11:40 → 11:45 when interval is 15)."""
	dt = get_datetime(dt).replace(second=0, microsecond=0)
	remainder = dt.minute % interval_minutes
	if remainder:
		dt += timedelta(minutes=interval_minutes - remainder)
	return dt


def _get_earliest_bookable_start(appointment_date, slot_interval: int) -> datetime | None:
	"""For today, return the first bookable slot start; for other dates, no floor."""
	appointment_date = getdate(appointment_date)
	today = getdate(now_datetime())
	if appointment_date < today:
		return None
	if appointment_date > today:
		return None
	return _ceil_datetime_to_interval(now_datetime(), slot_interval)


def _validate_services_for_booking(
	service_codes: list[str],
	company: str,
	service_location: str,
	booking_channel: str = "online",
):
	location_field = {
		"Salon": "allow_salon",
		"Home": "allow_home",
		"Hotel": "allow_hotel",
	}.get(service_location, "allow_salon")
	for code in service_codes:
		service = frappe.db.get_value(
			"Beauty Service",
			code,
			["name", "company", "is_active", "online_booking_enabled", "kiosk_enabled", location_field],
			as_dict=True,
		)
		if not service or not service.is_active:
			frappe.throw(_("Service {0} is not available").format(code))
		if service.company != company:
			frappe.throw(_("Service {0} does not belong to this branch company").format(code))
		if booking_channel == "kiosk":
			if not service.kiosk_enabled:
				frappe.throw(_("Service {0} is not enabled for kiosk").format(code))
		elif booking_channel == "online":
			if not service.online_booking_enabled:
				frappe.throw(_("Service {0} is not enabled for online booking").format(code))
		if not service.get(location_field):
			frappe.throw(_("Service {0} is not available for {1}").format(code, service_location))


def _get_duration_meta(service_codes: list[str]) -> dict:
	total = 0
	service_rows = []
	fields = ["default_duration", "standard_selling_price"]
	if frappe.db.has_column("Beauty Service", "buffer_before_minutes"):
		fields.extend(["buffer_before_minutes", "buffer_after_minutes"])
	for code in service_codes:
		row = frappe.db.get_value(
			"Beauty Service",
			code,
			fields,
			as_dict=True,
		) or frappe._dict()
		duration = int(row.default_duration or 60)
		buffer_before = int(row.get("buffer_before_minutes") or 0)
		buffer_after = int(row.get("buffer_after_minutes") or 0)
		line_total = buffer_before + duration + buffer_after
		total += line_total
		service_rows.append(
			{
				"service": code,
				"duration": duration,
				"buffer_before": buffer_before,
				"buffer_after": buffer_after,
				"line_total": line_total,
				"rate": flt(row.standard_selling_price),
			}
		)

	return {"total_minutes": total, "services": service_rows}


def _get_branch_window(beauty_branch: str, weekday: str, appointment_date) -> dict | None:
	schedule = frappe.db.get_value("Beauty Branch Schedule", beauty_branch, "name")
	if not schedule:
		return _default_branch_window(appointment_date)

	doc = frappe.get_doc("Beauty Branch Schedule", schedule)
	row = next((r for r in doc.hours if r.weekday == weekday), None)
	if not row or row.is_closed or not row.open_time or not row.close_time:
		return None

	return {
		"start": _combine_datetime(appointment_date, row.open_time),
		"end": _combine_datetime(appointment_date, row.close_time),
	}


def _default_branch_window(appointment_date) -> dict:
	return {
		"start": _combine_datetime(appointment_date, "09:00:00"),
		"end": _combine_datetime(appointment_date, "21:00:00"),
	}


def _get_employee_window(
	employee: str,
	beauty_branch: str,
	weekday: str,
	appointment_date,
	branch_window: dict,
) -> dict | None:
	from beauty_cloud.services.hr_schedule import resolve_employee_window

	return resolve_employee_window(
		employee,
		beauty_branch,
		weekday,
		appointment_date,
		branch_window,
	)


def _get_candidate_employees(
	service_codes: list[str],
	beauty_branch: str,
	company: str,
	employee: str | None,
) -> list[str]:
	if employee:
		if _employee_can_perform_services(employee, service_codes, company, beauty_branch):
			return [employee]
		return []

	employees = frappe.get_all(
		"Employee Service Skill",
		filters={"beauty_service": ("in", service_codes), "company": company, "is_active": 1},
		fields=["employee"],
		pluck="employee",
	)
	from beauty_cloud.services.hr_schedule import is_employee_active_for_booking

	qualified = []
	for emp in set(employees):
		if not is_employee_active_for_booking(emp):
			continue
		if _employee_can_perform_services(emp, service_codes, company, beauty_branch):
			qualified.append(emp)
	return qualified


def _employee_can_perform_services(
	employee: str,
	service_codes: list[str],
	company: str,
	beauty_branch: str,
) -> bool:
	for code in service_codes:
		if not frappe.db.exists(
			"Employee Service Skill",
			{
				"employee": employee,
				"beauty_service": code,
				"company": company,
				"beauty_branch": ("in", [beauty_branch, ""]),
				"is_active": 1,
			},
		):
			# Allow branch-agnostic skills
			if not frappe.db.exists(
				"Employee Service Skill",
				{
					"employee": employee,
					"beauty_service": code,
					"company": company,
					"is_active": 1,
				},
			):
				return False
	return True


def _has_overlap(beauty_branch: str, employee: str, start_dt: datetime, end_dt: datetime) -> bool:
	rows = frappe.db.sql(
		"""
		select bas.name
		from `tabBeauty Appointment Service` bas
		inner join `tabBeauty Appointment` ba on ba.name = bas.parent
		where ba.beauty_branch = %(branch)s
		  and ba.status in %(statuses)s
		  and bas.employee = %(employee)s
		  and bas.start_time < %(end)s
		  and bas.end_time > %(start)s
		limit 1
		""",
		{
			"branch": beauty_branch,
			"employee": employee,
			"start": start_dt,
			"end": end_dt,
			"statuses": ACTIVE_APPOINTMENT_STATUSES,
		},
	)
	return bool(rows)
