# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, getdate, today


def get_beautician_stock(employee: str, beauty_branch: str | None = None) -> dict:
	profile = _get_stock_profile(employee, beauty_branch)
	if not profile:
		return {"employee": employee, "warehouse": None, "items": []}

	return {
		"employee": employee,
		"employee_name": profile.employee_name,
		"beauty_branch": profile.beauty_branch,
		"warehouse": profile.warehouse,
		"items": get_warehouse_stock(profile.warehouse),
	}


def get_branch_stock(beauty_branch: str, stock_type: str = "consumables") -> dict:
	branch = frappe.get_doc("Beauty Branch", beauty_branch)
	warehouse = branch.consumables_warehouse if stock_type == "consumables" else branch.retail_warehouse
	if not warehouse:
		frappe.throw(_("No {0} warehouse configured for branch {1}").format(stock_type, beauty_branch))

	return {
		"beauty_branch": beauty_branch,
		"stock_type": stock_type,
		"warehouse": warehouse,
		"items": get_warehouse_stock(warehouse),
	}


def get_warehouse_stock(warehouse: str) -> list[dict]:
	if not warehouse:
		return []

	return frappe.db.sql(
		"""
		select
			b.item_code,
			i.item_name,
			i.stock_uom,
			b.actual_qty,
			b.valuation_rate,
			b.stock_value
		from `tabBin` b
		inner join `tabItem` i on i.name = b.item_code
		where b.warehouse = %(warehouse)s and b.actual_qty != 0
		order by i.item_name asc
		""",
		{"warehouse": warehouse},
		as_dict=True,
	)


def transfer_stock(
	from_warehouse: str,
	to_warehouse: str,
	items: list[dict],
	company: str,
	purpose: str = "Material Transfer",
) -> dict:
	if not items:
		frappe.throw(_("At least one item is required"))

	se = frappe.get_doc(
		{
			"doctype": "Stock Entry",
			"stock_entry_type": purpose,
			"company": company,
			"items": [
				{
					"item_code": row["item"],
					"qty": flt(row["qty"]),
					"s_warehouse": from_warehouse,
					"t_warehouse": to_warehouse,
					"uom": row.get("uom") or frappe.db.get_value("Item", row["item"], "stock_uom"),
					"allow_zero_valuation_rate": 1,
				}
				for row in items
			],
		}
	)
	se.insert(ignore_permissions=True)
	se.submit()
	return {"stock_entry": se.name, "from_warehouse": from_warehouse, "to_warehouse": to_warehouse}


def assign_to_beautician(employee: str, beauty_branch: str, items: list[dict]) -> dict:
	profile = _get_stock_profile(employee, beauty_branch)
	if not profile:
		frappe.throw(_("No active stock profile for employee {0}").format(employee))

	branch = frappe.get_doc("Beauty Branch", beauty_branch)
	source = branch.consumables_warehouse or branch.default_warehouse
	if not source:
		frappe.throw(_("Branch source warehouse is not configured"))

	return transfer_stock(source, profile.warehouse, items, profile.company)


def return_from_beautician(employee: str, beauty_branch: str, items: list[dict]) -> dict:
	profile = _get_stock_profile(employee, beauty_branch)
	if not profile:
		frappe.throw(_("No active stock profile for employee {0}").format(employee))

	branch = frappe.get_doc("Beauty Branch", beauty_branch)
	target = branch.consumables_warehouse or branch.default_warehouse
	return transfer_stock(profile.warehouse, target, items, profile.company)


def record_wastage(
	warehouse: str,
	company: str,
	items: list[dict],
	employee: str | None = None,
	reason: str | None = None,
) -> dict:
	if not items:
		frappe.throw(_("At least one item is required"))

	expense_account = frappe.db.get_value("Company", company, "stock_adjustment_account")
	se = frappe.get_doc(
		{
			"doctype": "Stock Entry",
			"stock_entry_type": "Material Issue",
			"company": company,
			"items": [
				{
					"item_code": row["item"],
					"qty": flt(row["qty"]),
					"s_warehouse": warehouse,
					"uom": row.get("uom") or frappe.db.get_value("Item", row["item"], "stock_uom"),
					"basic_rate": flt(row.get("valuation_rate") or 0),
					"allow_zero_valuation_rate": 1,
					"expense_account": expense_account,
				}
				for row in items
			],
		}
	)
	se.insert(ignore_permissions=True)
	se.submit()

	return {
		"stock_entry": se.name,
		"warehouse": warehouse,
		"employee": employee,
		"reason": reason,
	}


def create_inventory_count(payload: dict) -> dict:
	data = frappe._dict(payload)
	settings = frappe.get_single("Beauty Cloud Settings")
	warehouse = data.warehouse
	if not warehouse and data.employee:
		profile = _get_stock_profile(data.employee, data.beauty_branch)
		warehouse = profile.warehouse if profile else None
	if not warehouse:
		frappe.throw(_("Warehouse is required"))

	items = []
	for row in data.get("items") or []:
		system_qty = flt(
			frappe.db.get_value("Bin", {"item_code": row["item"], "warehouse": warehouse}, "actual_qty")
		)
		items.append(
			{
				"item": row["item"],
				"uom": row.get("uom") or frappe.db.get_value("Item", row["item"], "stock_uom"),
				"system_qty": system_qty,
				"physical_qty": flt(row.get("physical_qty", system_qty)),
			}
		)

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Inventory Count",
			"naming_series": "BICN-.YYYY.-",
			"company": data.company or settings.company,
			"beauty_branch": data.beauty_branch,
			"warehouse": warehouse,
			"employee": data.get("employee"),
			"count_date": data.get("count_date") or today(),
			"status": "Draft",
			"notes": data.get("notes"),
			"items": items,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


def submit_inventory_count(name: str) -> dict:
	doc = frappe.get_doc("Beauty Inventory Count", name)
	if doc.status == "Submitted":
		frappe.throw(_("Inventory count already submitted"))

	reconciliation_items = [
		{
			"item_code": row.item,
			"warehouse": doc.warehouse,
			"qty": row.physical_qty,
			"valuation_rate": row.valuation_rate or flt(frappe.db.get_value("Item", row.item, "valuation_rate")),
		}
		for row in doc.items
		if flt(row.variance_qty) != 0
	]

	stock_entry = None
	if reconciliation_items:
		sr = frappe.get_doc(
			{
				"doctype": "Stock Reconciliation",
				"company": doc.company,
				"purpose": "Stock Reconciliation",
				"posting_date": getdate(doc.count_date),
				"items": reconciliation_items,
			}
		)
		sr.insert(ignore_permissions=True)
		sr.submit()
		stock_entry = sr.name

	doc.db_set({"status": "Submitted", "stock_entry": stock_entry})
	return doc.as_dict()


def resolve_consumption_warehouse(
	employee: str | None,
	beauty_branch: str,
	default_warehouse: str,
	source_policy: str | None = None,
) -> str:
	settings = frappe.get_single("Beauty Cloud Settings")
	if not settings.enable_beautician_stock_custody or not employee:
		return default_warehouse

	if source_policy == "Branch Consumables Warehouse":
		return default_warehouse

	profile = _get_stock_profile(employee, beauty_branch)
	if profile and profile.warehouse:
		balance_exists = frappe.db.sql(
			"""
			select 1 from `tabBin`
			where warehouse = %(wh)s and actual_qty > 0 limit 1
			""",
			{"wh": profile.warehouse},
		)
		if balance_exists or source_policy == "Beautician Warehouse":
			return profile.warehouse

	return default_warehouse


def _get_stock_profile(employee: str, beauty_branch: str | None = None):
	filters = {"employee": employee, "is_active": 1}
	if beauty_branch:
		filters["beauty_branch"] = beauty_branch

	name = frappe.db.get_value("Beauty Employee Stock Profile", filters, "name")
	if not name and beauty_branch:
		name = frappe.db.get_value(
			"Beauty Employee Stock Profile", {"employee": employee, "is_active": 1}, "name"
		)
	return frappe.get_doc("Beauty Employee Stock Profile", name) if name else None
