# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, flt, getdate, now_datetime, today


FULFILLMENT_ROLES = {
	"System Manager",
	"Beauty Cloud Branch Manager",
	"Beauty Cloud Receptionist",
	"Beauty Cloud Cashier",
}


def default_fulfillment_status(line_type: str, item_code: str | None = None) -> str:
	if line_type != "Item" or not item_code:
		return "N/A"
	if frappe.db.get_value("Item", item_code, "is_stock_item"):
		return "Pending"
	return "N/A"


def get_fulfillment_queue(
	beauty_branch: str,
	business_date: str | None = None,
	status: str = "pending",
	search: str | None = None,
	page: int = 1,
	page_size: int = 50,
) -> dict:
	business_date = getdate(business_date or today())
	status = (status or "pending").lower()
	page = max(cint(page), 1)
	page_size = min(max(cint(page_size), 1), 200)
	offset = (page - 1) * page_size

	status_filter = ""
	if status == "pending":
		status_filter = "and coalesce(item.fulfillment_status, 'Pending') = 'Pending'"
	elif status == "delivered":
		status_filter = "and item.fulfillment_status = 'Delivered'"
	else:
		status_filter = "and coalesce(item.fulfillment_status, 'Pending') in ('Pending', 'Delivered')"

	search_filter = ""
	params: dict = {
		"branch": beauty_branch,
		"business_date": business_date,
		"limit": page_size,
		"offset": offset,
	}
	if search and search.strip():
		search_filter = """
			and (
				tx.customer_name like %(search)s
				or tx.name like %(search)s
				or tx.invoice like %(search)s
				or item.item_name like %(search)s
				or item.item like %(search)s
			)
		"""
		params["search"] = f"%{search.strip()}%"

	count_row = frappe.db.sql(
		f"""
		select count(*) as total
		from `tabBeauty POS Transaction Item` item
		inner join `tabBeauty POS Transaction` tx on tx.name = item.parent
		where tx.beauty_branch = %(branch)s
		  and tx.business_date = %(business_date)s
		  and tx.status in ('Paid', 'Partially Paid')
		  and item.line_type = 'Item'
		  and coalesce(item.fulfillment_status, 'Pending') != 'N/A'
		  {status_filter}
		  {search_filter}
		""",
		params,
		as_dict=True,
	)[0]

	rows = frappe.db.sql(
		f"""
		select
			item.name as line_name,
			item.parent as transaction,
			item.item,
			item.item_name,
			item.qty,
			item.rate,
			item.amount,
			coalesce(item.fulfillment_status, 'Pending') as fulfillment_status,
			item.delivered_at,
			item.delivered_by,
			tx.customer_name,
			tx.customer,
			tx.invoice,
			tx.invoice_doctype,
			tx.beauty_appointment,
			tx.register_code,
			tx.cashier,
			tx.posting_date,
			tx.modified as paid_at
		from `tabBeauty POS Transaction Item` item
		inner join `tabBeauty POS Transaction` tx on tx.name = item.parent
		where tx.beauty_branch = %(branch)s
		  and tx.business_date = %(business_date)s
		  and tx.status in ('Paid', 'Partially Paid')
		  and item.line_type = 'Item'
		  and coalesce(item.fulfillment_status, 'Pending') != 'N/A'
		  {status_filter}
		  {search_filter}
		order by tx.modified desc, item.idx asc
		limit %(limit)s offset %(offset)s
		""",
		params,
		as_dict=True,
	)

	pending_count = frappe.db.sql(
		"""
		select count(*) as total
		from `tabBeauty POS Transaction Item` item
		inner join `tabBeauty POS Transaction` tx on tx.name = item.parent
		where tx.beauty_branch = %(branch)s
		  and tx.business_date = %(business_date)s
		  and tx.status in ('Paid', 'Partially Paid')
		  and item.line_type = 'Item'
		  and coalesce(item.fulfillment_status, 'Pending') = 'Pending'
		""",
		{"branch": beauty_branch, "business_date": business_date},
	)[0][0]

	for row in rows:
		row["qty"] = flt(row.get("qty"))
		row["rate"] = flt(row.get("rate"))
		row["amount"] = flt(row.get("amount"))

	return {
		"items": rows,
		"total": int(count_row.total or 0),
		"page": page,
		"page_size": page_size,
		"pending_count": int(pending_count or 0),
		"business_date": str(business_date),
		"can_mark_delivered": _can_mark_delivered(),
	}


def mark_items_delivered(line_names: list[str]) -> dict:
	_assert_can_mark_delivered()
	if not line_names:
		frappe.throw(_("Select at least one product line to mark delivered"))

	updated = []
	now = now_datetime()
	user = frappe.session.user

	for line_name in line_names:
		row = frappe.db.get_value(
			"Beauty POS Transaction Item",
			line_name,
			["name", "parent", "line_type", "fulfillment_status", "item_name"],
			as_dict=True,
		)
		if not row:
			frappe.throw(_("Product line {0} not found").format(line_name))
		if row.line_type != "Item":
			frappe.throw(_("Only retail product lines can be marked delivered"))
		if row.fulfillment_status == "Delivered":
			continue
		if row.fulfillment_status == "N/A":
			frappe.throw(_("Line {0} does not require handoff").format(row.item_name or line_name))

		tx = frappe.get_doc("Beauty POS Transaction", row.parent)
		tx.check_permission("write")

		frappe.db.set_value(
			"Beauty POS Transaction Item",
			line_name,
			{
				"fulfillment_status": "Delivered",
				"delivered_at": now,
				"delivered_by": user,
			},
		)
		updated.append(
			{
				"line_name": line_name,
				"transaction": row.parent,
				"item_name": row.item_name,
				"fulfillment_status": "Delivered",
				"delivered_at": now,
				"delivered_by": user,
			}
		)

	frappe.db.commit()
	return {"updated": updated, "count": len(updated)}


def _can_mark_delivered() -> bool:
	if frappe.session.user == "Administrator":
		return True
	return bool(set(frappe.get_roles()) & FULFILLMENT_ROLES)


def _assert_can_mark_delivered():
	if not _can_mark_delivered():
		frappe.throw(_("You are not allowed to mark retail products as delivered"))
