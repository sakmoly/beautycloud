# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.hr_schedule import hrms_available, sync_beauty_schedules_to_hr_shifts


@frappe.whitelist()
def sync_branch_shifts(beauty_branch: str, days_ahead: int = 90):
	if not hrms_available():
		frappe.throw("Frappe HR is not installed on this site")
	return sync_beauty_schedules_to_hr_shifts(beauty_branch, days_ahead=int(days_ahead or 90))


@frappe.whitelist()
def get_hr_integration_status():
	from beauty_cloud.services.hr_schedule import get_hr_schedule_settings

	settings = get_hr_schedule_settings()
	return {
		"hrms_installed": hrms_available(),
		**settings,
	}
