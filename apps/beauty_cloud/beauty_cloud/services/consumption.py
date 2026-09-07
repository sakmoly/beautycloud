# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt


def preview_service_consumption(appointment_name: str, service_row: int) -> dict:
	"""Preview recipe items and quantities before posting consumption."""
	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	appt.check_permission("read")

	row = _get_service_row(appt, service_row)
	recipe_name = row.beauty_service_recipe or frappe.db.get_value(
		"Beauty Service Recipe",
		{"beauty_service": row.beauty_service, "is_active": 1},
		"name",
	)
	if not recipe_name:
		frappe.throw(_("No active recipe found for service {0}").format(row.beauty_service))

	recipe = frappe.get_doc("Beauty Service Recipe", recipe_name)
	branch = frappe.get_doc("Beauty Branch", appt.beauty_branch)
	warehouse = branch.consumables_warehouse or branch.default_warehouse
	if not warehouse:
		frappe.throw(_("Branch consumables warehouse is not configured"))

	items = _build_consumption_items(recipe, warehouse)
	total_amount = sum(flt(item.get("amount")) for item in items)

	return {
		"beauty_appointment": appt.name,
		"appointment_service_row": row.idx,
		"beauty_service": row.beauty_service,
		"service_name": row.service_name,
		"warehouse": warehouse,
		"recipe": recipe_name,
		"items": items,
		"total_amount": total_amount,
		"consumption_status": row.consumption_status or "Not Started",
	}


def submit_service_consumption(
	appointment_name: str,
	service_row: int,
	actual_items: list[dict] | None = None,
) -> dict:
	"""Create and post material consumption for one appointment service line."""
	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	appt.check_permission("write")

	row = _get_service_row(appt, service_row)
	if row.consumption_status == "Submitted":
		frappe.throw(_("Consumption already submitted for this service line"))

	if row.status not in ("Completed", "In Service"):
		frappe.throw(_("Service line must be completed before consumption can be posted"))

	existing = frappe.db.get_value(
		"Service Consumption",
		{
			"beauty_appointment": appointment_name,
			"appointment_service_row": row.idx,
			"status": "Submitted",
		},
		"name",
	)
	if existing:
		frappe.throw(_("Consumption document {0} already exists").format(existing))

	recipe_name = row.beauty_service_recipe or frappe.db.get_value(
		"Beauty Service Recipe",
		{"beauty_service": row.beauty_service, "is_active": 1},
		"name",
	)
	if not recipe_name:
		frappe.throw(_("No active recipe found for service {0}").format(row.beauty_service))

	recipe = frappe.get_doc("Beauty Service Recipe", recipe_name)
	branch = frappe.get_doc("Beauty Branch", appt.beauty_branch)
	warehouse = branch.consumables_warehouse or branch.default_warehouse
	if not warehouse:
		frappe.throw(_("Branch consumables warehouse is not configured"))

	items = _build_consumption_items(recipe, warehouse, actual_items)
	consumption = frappe.get_doc(
		{
			"doctype": "Service Consumption",
			"naming_series": "SCON-.YYYY.-",
			"company": appt.company,
			"beauty_branch": appt.beauty_branch,
			"beauty_appointment": appt.name,
			"appointment_service_row": row.idx,
			"beauty_service": row.beauty_service,
			"employee": row.employee,
			"status": "Draft",
			"items": items,
		}
	)
	consumption.insert(ignore_permissions=True)

	stock_entry = _create_material_issue(consumption, appt.company)
	consumption.db_set({"stock_entry": stock_entry.name, "status": "Submitted"})
	row.db_set("consumption_status", "Submitted")

	return consumption.as_dict()


def _get_service_row(appt, service_row: int):
	for row in appt.services:
		if row.idx == int(service_row):
			return row
	frappe.throw(_("Service row {0} not found").format(service_row))


def _build_consumption_items(recipe, warehouse: str, actual_items: list[dict] | None) -> list[dict]:
	override_map = {item["item"]: item for item in (actual_items or []) if item.get("item")}
	rows = []
	for recipe_item in recipe.items:
		override = override_map.get(recipe_item.item, {})
		actual_qty = flt(override.get("actual_qty", recipe_item.qty))
		valuation_rate = flt(
			override.get("valuation_rate")
			or frappe.db.get_value("Item", recipe_item.item, "valuation_rate")
			or 0
		)
		rows.append(
			{
				"item": recipe_item.item,
				"standard_qty": recipe_item.qty,
				"actual_qty": actual_qty,
				"uom": recipe_item.uom,
				"warehouse": override.get("warehouse") or warehouse,
				"valuation_rate": valuation_rate,
				"amount": actual_qty * valuation_rate,
				"variance_reason": override.get("variance_reason"),
			}
		)
	return rows


def _create_material_issue(consumption, company: str):
	se = frappe.get_doc(
		{
			"doctype": "Stock Entry",
			"stock_entry_type": "Material Issue",
			"company": company,
			"items": [
				{
					"item_code": row.item,
					"qty": row.actual_qty,
					"uom": row.uom,
					"stock_uom": row.uom,
					"s_warehouse": row.warehouse,
					"basic_rate": row.valuation_rate,
					"allow_zero_valuation_rate": 1,
				}
				for row in consumption.items
			],
		}
	)
	se.insert(ignore_permissions=True)
	se.submit()
	return se
