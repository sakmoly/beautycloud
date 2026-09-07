# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.inventory import (
	assign_to_beautician,
	create_inventory_count,
	get_beautician_stock,
	get_branch_stock,
	record_wastage,
	return_from_beautician,
	submit_inventory_count,
	transfer_stock,
)


@frappe.whitelist()
def get_beautician_inventory(employee: str, beauty_branch: str | None = None):
	return get_beautician_stock(employee, beauty_branch)


@frappe.whitelist()
def get_branch_inventory(beauty_branch: str, stock_type: str = "consumables"):
	return get_branch_stock(beauty_branch, stock_type)


@frappe.whitelist()
def transfer(from_warehouse: str, to_warehouse: str, items: str, company: str | None = None):
	import json

	company = company or frappe.get_single("Beauty Cloud Settings").company
	return transfer_stock(from_warehouse, to_warehouse, json.loads(items), company)


@frappe.whitelist()
def assign_stock(employee: str, beauty_branch: str, items: str):
	import json

	return assign_to_beautician(employee, beauty_branch, json.loads(items))


@frappe.whitelist()
def return_stock(employee: str, beauty_branch: str, items: str):
	import json

	return return_from_beautician(employee, beauty_branch, json.loads(items))


@frappe.whitelist()
def wastage(warehouse: str, items: str, company: str | None = None, employee: str | None = None, reason: str | None = None):
	import json

	company = company or frappe.get_single("Beauty Cloud Settings").company
	return record_wastage(warehouse, company, json.loads(items), employee, reason)


@frappe.whitelist()
def create_count(data):
	if isinstance(data, str):
		import json

		data = json.loads(data)
	return create_inventory_count(data)


@frappe.whitelist()
def submit_count(name: str):
	return submit_inventory_count(name)
