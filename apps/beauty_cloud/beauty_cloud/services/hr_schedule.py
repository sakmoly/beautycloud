# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

from datetime import datetime, timedelta

import frappe
from frappe.utils import getdate, now_datetime

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def hrms_available() -> bool:
	return bool(frappe.db.exists("DocType", "Shift Assignment"))


def get_hr_schedule_settings() -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	enabled = bool(getattr(settings, "enable_hr_schedule", 0)) and hrms_available()
	return {
		"enabled": enabled,
		"mode": getattr(settings, "hr_schedule_mode", None) or "HR Primary",
		"block_leave": bool(getattr(settings, "block_booking_on_leave", 1)),
		"block_holidays": bool(getattr(settings, "block_booking_on_holidays", 1)),
		"consider_default_shift": bool(getattr(settings, "hr_use_default_shift", 1)),
		"auto_sync": bool(getattr(settings, "auto_sync_hr_shifts", 1)),
		"sync_days_ahead": int(getattr(settings, "hr_sync_days_ahead", 0) or 90),
	}


def should_auto_sync_hr_shifts() -> bool:
	settings = get_hr_schedule_settings()
	return settings["enabled"] and settings["auto_sync"]


def is_employee_active_for_booking(employee: str) -> bool:
	status = frappe.db.get_value("Employee", employee, "status")
	return status == "Active"


def is_employee_on_leave(employee: str, appointment_date) -> bool:
	if not hrms_available():
		return False

	appointment_date = getdate(appointment_date)
	return bool(
		frappe.db.exists(
			"Leave Application",
			{
				"employee": employee,
				"docstatus": 1,
				"status": "Approved",
				"from_date": ("<=", appointment_date),
				"to_date": (">=", appointment_date),
			},
		)
	)


def get_branch_holiday_list(beauty_branch: str, company: str | None = None) -> str | None:
	holiday_list = frappe.db.get_value("Beauty Branch", beauty_branch, "holiday_list")
	if holiday_list:
		return holiday_list

	company = company or frappe.db.get_value("Beauty Branch", beauty_branch, "company")
	if not company:
		return None
	return frappe.db.get_value("Company", company, "default_holiday_list")


def is_branch_holiday(beauty_branch: str, appointment_date, company: str | None = None) -> bool:
	settings = get_hr_schedule_settings()
	if not settings["block_holidays"]:
		return False

	holiday_list = get_branch_holiday_list(beauty_branch, company)
	if not holiday_list:
		return False

	from erpnext.setup.doctype.holiday_list.holiday_list import is_holiday

	return bool(is_holiday(holiday_list, getdate(appointment_date)))


def get_hr_shift_window(employee: str, appointment_date, consider_default_shift: bool = True) -> dict | None:
	"""Return HR shift start/end for a calendar date."""
	if not hrms_available():
		return None

	from hrms.hr.doctype.shift_assignment.shift_assignment import get_employee_shift

	appointment_date = getdate(appointment_date)
	midday = datetime.combine(appointment_date, datetime.min.time()) + timedelta(hours=12)
	shift = get_employee_shift(
		employee,
		for_timestamp=midday,
		consider_default_shift=consider_default_shift,
	)
	if not shift or not shift.get("start_datetime") or not shift.get("end_datetime"):
		return None

	start = shift.start_datetime
	end = shift.end_datetime
	if getdate(start) != appointment_date and getdate(end) != appointment_date:
		return None

	return {"start": start, "end": end, "source": "hr_shift"}


def get_beauty_employee_schedule_window(
	employee: str,
	beauty_branch: str,
	weekday: str,
	appointment_date,
) -> dict | None:
	rows = frappe.get_all(
		"Beauty Employee Schedule",
		filters={
			"employee": employee,
			"beauty_branch": beauty_branch,
			"weekday": weekday,
			"is_active": 1,
		},
		fields=["start_time", "end_time"],
		limit=1,
	)
	if not rows:
		return None

	from frappe.utils import get_time

	row = rows[0]
	start_time = get_time(row.start_time)
	end_time = get_time(row.end_time)
	return {
		"start": datetime.combine(getdate(appointment_date), start_time),
		"end": datetime.combine(getdate(appointment_date), end_time),
		"source": "beauty_schedule",
	}


def resolve_employee_window(
	employee: str,
	beauty_branch: str,
	weekday: str,
	appointment_date,
	branch_window: dict,
) -> dict | None:
	"""Combine HR shift, leave, and Beauty Employee Schedule into one bookable window."""
	settings = get_hr_schedule_settings()
	appointment_date = getdate(appointment_date)

	if not is_employee_active_for_booking(employee):
		return None

	if settings["enabled"] and settings["block_leave"] and is_employee_on_leave(employee, appointment_date):
		return None

	beauty_window = get_beauty_employee_schedule_window(
		employee, beauty_branch, weekday, appointment_date
	)
	hr_window = None
	if settings["enabled"]:
		hr_window = get_hr_shift_window(
			employee,
			appointment_date,
			consider_default_shift=settings["consider_default_shift"],
		)

	mode = settings["mode"]
	selected = None

	if mode == "HR Primary":
		selected = hr_window or beauty_window
	elif mode == "Beauty Schedule Primary":
		selected = beauty_window or hr_window
	else:
		selected = _intersect_windows([window for window in (hr_window, beauty_window) if window])

	if not selected:
		if settings["enabled"] and mode == "HR Primary":
			return None
		return branch_window

	start = max(selected["start"], branch_window["start"])
	end = min(selected["end"], branch_window["end"])
	if end <= start:
		return None

	return {"start": start, "end": end}


def _intersect_windows(windows: list[dict]) -> dict | None:
	if not windows:
		return None
	start = max(window["start"] for window in windows)
	end = min(window["end"] for window in windows)
	if end <= start:
		return None
	return {"start": start, "end": end}


def sync_beauty_schedules_to_hr_shifts(
	beauty_branch: str,
	company: str | None = None,
	days_ahead: int | None = None,
) -> dict:
	"""Create/update HR Shift Assignments from all Beauty Employee Schedule rows for a branch."""
	if not hrms_available():
		frappe.throw("Frappe HR is not installed on this site")

	settings = get_hr_schedule_settings()
	days_ahead = days_ahead or settings["sync_days_ahead"]
	company = company or frappe.db.get_value("Beauty Branch", beauty_branch, "company")
	if not company:
		frappe.throw("Branch company is required")

	schedules = frappe.get_all(
		"Beauty Employee Schedule",
		filters={"beauty_branch": beauty_branch},
		pluck="name",
	)
	if not schedules:
		return {"updated": 0, "message": "No Beauty Employee Schedules found"}

	total = {"created": 0, "updated": 0, "deactivated": 0}
	for name in schedules:
		result = sync_beauty_employee_schedule_by_name(name, days_ahead=days_ahead)
		for key in total:
			total[key] += result.get(key, 0)

	return {
		**total,
		"beauty_branch": beauty_branch,
		"schedules": len(schedules),
		"sync_days_ahead": days_ahead,
	}


def sync_beauty_employee_schedule_by_name(schedule_name: str, days_ahead: int | None = None) -> dict:
	doc = frappe.get_doc("Beauty Employee Schedule", schedule_name)
	return sync_beauty_employee_schedule(doc, days_ahead=days_ahead)


def sync_beauty_employee_schedule(schedule_doc, days_ahead: int | None = None) -> dict:
	"""Sync one Beauty Employee Schedule row to HR Shift Assignments (rolling window)."""
	if not hrms_available() or not should_auto_sync_hr_shifts():
		return {"created": 0, "updated": 0, "deactivated": 0}

	from frappe.utils import add_days

	settings = get_hr_schedule_settings()
	days_ahead = days_ahead or settings["sync_days_ahead"]
	start_date = getdate(now_datetime())
	end_date = add_days(start_date, days_ahead)
	target_idx = WEEKDAYS.index(schedule_doc.weekday)

	created = updated = deactivated = 0
	shift_type = None
	if schedule_doc.is_active:
		shift_type = _ensure_shift_type(schedule_doc.start_time, schedule_doc.end_time, schedule_doc.company)

	current = start_date
	while current <= end_date:
		if current.weekday() != target_idx:
			current = add_days(current, 1)
			continue

		action = _sync_hr_shift_for_date(
			schedule_doc.employee,
			schedule_doc.company,
			current,
			shift_type,
			active=bool(schedule_doc.is_active),
		)
		if action == "created":
			created += 1
		elif action == "updated":
			updated += 1
		elif action == "deactivated":
			deactivated += 1
		current = add_days(current, 1)

	return {"created": created, "updated": updated, "deactivated": deactivated}


def maintain_hr_shift_horizon():
	"""Daily job: keep HR shifts aligned for all active beauty employee schedules."""
	if not should_auto_sync_hr_shifts():
		return

	branches = frappe.get_all("Beauty Branch", filters={"is_active": 1}, pluck="name")
	for branch in branches:
		try:
			sync_beauty_schedules_to_hr_shifts(branch)
		except Exception:
			frappe.log_error(title=f"HR shift horizon sync failed for {branch}")


def queue_beauty_employee_schedule_sync(schedule_name: str) -> None:
	if not should_auto_sync_hr_shifts():
		return

	frappe.enqueue(
		"beauty_cloud.services.hr_schedule.sync_beauty_employee_schedule_by_name",
		queue="short",
		schedule_name=schedule_name,
		now=True,
	)


def on_beauty_employee_schedule_change(doc, method=None):
	queue_beauty_employee_schedule_sync(doc.name)


def _ensure_shift_type(start_time, end_time, company: str) -> str:
	label = f"Salon {str(start_time)[:5]}-{str(end_time)[:5]}"
	existing = frappe.db.get_value("Shift Type", {"start_time": start_time, "end_time": end_time}, "name")
	if existing:
		return existing

	doc = frappe.get_doc(
		{
			"doctype": "Shift Type",
			"name": label,
			"start_time": start_time,
			"end_time": end_time,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def _sync_hr_shift_for_date(
	employee: str,
	company: str,
	shift_date,
	shift_type: str | None,
	active: bool,
) -> str | None:
	shift_date = getdate(shift_date)
	existing = frappe.get_all(
		"Shift Assignment",
		filters={
			"employee": employee,
			"start_date": shift_date,
			"docstatus": 1,
		},
		fields=["name", "shift_type", "status"],
		order_by="creation desc",
	)

	if not active:
		changed = False
		for row in existing:
			if row.status == "Active":
				frappe.db.set_value("Shift Assignment", row.name, "status", "Inactive")
				changed = True
		return "deactivated" if changed else None

	if not shift_type:
		return None

	for row in existing:
		if row.status == "Active" and row.shift_type == shift_type:
			return None

	for row in existing:
		if row.status == "Active" and row.shift_type != shift_type:
			frappe.db.set_value("Shift Assignment", row.name, "status", "Inactive")

	if frappe.db.exists(
		"Shift Assignment",
		{
			"employee": employee,
			"shift_type": shift_type,
			"start_date": shift_date,
			"docstatus": 1,
			"status": "Active",
		},
	):
		return "updated" if existing else None

	doc = frappe.get_doc(
		{
			"doctype": "Shift Assignment",
			"employee": employee,
			"company": company,
			"shift_type": shift_type,
			"start_date": shift_date,
			"end_date": shift_date,
			"status": "Active",
		}
	)
	doc.insert(ignore_permissions=True)
	doc.submit()
	return "created" if not existing else "updated"


def on_employee_update(doc, method=None):
	"""Keep booking data aligned when HR employee status changes."""
	if doc.status not in ("Active",):
		_deactivate_beauty_resources(doc.name)


def _deactivate_beauty_resources(employee: str) -> None:
	for schedule in frappe.get_all(
		"Beauty Employee Schedule",
		filters={"employee": employee, "is_active": 1},
		pluck="name",
	):
		frappe.db.set_value("Beauty Employee Schedule", schedule, "is_active", 0)

	for skill in frappe.get_all(
		"Employee Service Skill",
		filters={"employee": employee, "is_active": 1},
		pluck="name",
	):
		frappe.db.set_value("Employee Service Skill", skill, "is_active", 0)
