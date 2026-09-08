# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.utils.files import public_file_url


def get_public_stylists(company: str, limit: int = 6) -> list[dict]:
	"""Active employees with at least one service skill, for website embed sections."""
	fetch_limit = max(limit * 3, 50) if limit else 500
	employees = frappe.get_all(
		"Employee Service Skill",
		filters={"company": company, "is_active": 1},
		fields=["employee"],
		distinct=True,
		limit_page_length=fetch_limit,
	)
	employee_ids = [row.employee for row in employees if row.employee]
	if not employee_ids:
		return []

	rows = frappe.get_all(
		"Employee",
		filters={"name": ("in", employee_ids), "company": company, "status": "Active"},
		fields=["name", "employee_name", "image", "designation"],
		order_by="employee_name asc",
	)
	if limit and limit > 0:
		rows = rows[:limit]

	result = []
	for row in rows:
		designation = row.designation
		if designation and frappe.db.exists("Designation", designation):
			designation = frappe.db.get_value("Designation", designation, "designation_name") or designation
		result.append(
			{
				"name": row.name,
				"employee_name": row.employee_name,
				"image": public_file_url(row.image),
				"designation": designation,
			}
		)
	return result
