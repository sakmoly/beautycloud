# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe


def ensure_branch_schedule(beauty_branch: str) -> dict:
	"""Create default opening hours for a branch if missing."""
	if frappe.db.exists("Beauty Branch Schedule", beauty_branch):
		return {"beauty_branch": beauty_branch, "created": False}

	company = frappe.db.get_value("Beauty Branch", beauty_branch, "company")
	if not company:
		frappe.throw(f"Branch {beauty_branch} not found")

	default_hours = [
		{"weekday": day, "open_time": "09:00:00", "close_time": "21:00:00", "is_closed": 0}
		for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
	] + [{"weekday": "Sunday", "open_time": "09:00:00", "close_time": "21:00:00", "is_closed": 1}]

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Branch Schedule",
			"beauty_branch": beauty_branch,
			"company": company,
			"slot_interval_minutes": 15,
			"hours": default_hours,
		}
	)
	doc.insert(ignore_permissions=True)
	return {"beauty_branch": beauty_branch, "created": True}


def copy_employee_schedules_to_branch(
	source_branch: str,
	target_branch: str,
	company: str | None = None,
) -> dict:
	"""Copy weekly Beauty Employee Schedule rows to another branch."""
	if source_branch == target_branch:
		return {"created": 0, "skipped": True}

	company = company or frappe.db.get_value("Beauty Branch", target_branch, "company")
	if not company:
		frappe.throw(f"Branch {target_branch} not found")

	rows = frappe.get_all(
		"Beauty Employee Schedule",
		filters={"beauty_branch": source_branch, "company": company, "is_active": 1},
		fields=["employee", "weekday", "start_time", "end_time"],
	)
	created = 0
	for row in rows:
		if frappe.db.exists(
			"Beauty Employee Schedule",
			{
				"employee": row.employee,
				"beauty_branch": target_branch,
				"weekday": row.weekday,
			},
		):
			continue
		frappe.get_doc(
			{
				"doctype": "Beauty Employee Schedule",
				"employee": row.employee,
				"company": company,
				"beauty_branch": target_branch,
				"weekday": row.weekday,
				"start_time": row.start_time,
				"end_time": row.end_time,
				"is_active": 1,
			}
		).insert(ignore_permissions=True)
		created += 1

	if created:
		from beauty_cloud.services.hr_schedule import sync_beauty_schedules_to_hr_shifts

		sync_beauty_schedules_to_hr_shifts(target_branch, company)

	return {"created": created, "source_branch": source_branch, "target_branch": target_branch}


def ensure_branch_booking_ready(beauty_branch: str) -> dict:
	"""Ensure a branch can accept bookings: hours + staff schedules."""
	schedule = ensure_branch_schedule(beauty_branch)
	company = frappe.db.get_value("Beauty Branch", beauty_branch, "company")
	source_rows = frappe.get_all(
		"Beauty Branch",
		filters={"company": company, "is_active": 1, "name": ("!=", beauty_branch)},
		fields=["name"],
		order_by="creation asc",
		limit=1,
	)
	source_branch = source_rows[0].name if source_rows else None
	copied = {"created": 0}
	if source_branch:
		copied = copy_employee_schedules_to_branch(source_branch, beauty_branch, company)
	elif not frappe.db.count("Beauty Employee Schedule", {"beauty_branch": beauty_branch, "is_active": 1}):
		copied = {"created": 0, "warning": "No source branch schedules to copy"}

	return {"schedule": schedule, "employee_schedules": copied}
