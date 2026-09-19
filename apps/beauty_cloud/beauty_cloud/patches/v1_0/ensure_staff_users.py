# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.setup.demo_data import _ensure_pos_registers
from beauty_cloud.setup.staff_users import ensure_staff_users


def execute():
	company = frappe.db.get_value("Company", {"company_name": "beautcloud"}) or frappe.db.get_value("Company", {"name": "beautcloud"}) or "beautcloud"
	if not frappe.db.exists("Company", company):
		return

	ensure_staff_users(company)
	_ensure_pos_registers(company)
	frappe.db.commit()
