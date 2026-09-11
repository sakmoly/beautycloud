# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.api.utils import parse_payload
from beauty_cloud.services.setup_wizard import (
	complete_setup,
	get_setup_status,
	load_sample_data,
	save_setup_step,
)


@frappe.whitelist()
def get_status():
	return get_setup_status()


@frappe.whitelist()
def get_context():
	companies = frappe.get_all("Company", fields=["name", "company_name"], order_by="name asc")
	settings = frappe.get_single("Beauty Cloud Settings")
	branches = []
	if settings.company:
		branches = frappe.get_all(
			"Beauty Branch",
			filters={"company": settings.company},
			fields=["name", "branch_code", "branch_name", "is_active"],
			order_by="branch_name asc",
		)
	return {
		"companies": companies,
		"branches": branches,
		"settings": {
			"company": settings.company,
			"setup_complete": bool(settings.setup_complete),
		},
	}


@frappe.whitelist()
def save_step(step_id: str, data=None, **kwargs):
	return save_setup_step(step_id, parse_payload(data, **kwargs))


@frappe.whitelist()
def complete():
	return complete_setup()


@frappe.whitelist()
def load_samples(scope: str = "all"):
	return load_sample_data(scope)
