# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, getdate, now_datetime, today


def validate_cart(cart: dict) -> dict:
	data = frappe._dict(cart)
	settings = frappe.get_single("Beauty Cloud Settings")
	company = data.company or settings.company

	if not data.customer:
		frappe.throw(_("Customer is required"))
	if not data.beauty_branch:
		frappe.throw(_("Branch is required"))
	if not data.get("items"):
		frappe.throw(_("Cart items are required"))

	lines = []
	grand_total = 0
	for row in data.get("items"):
		line = _normalize_cart_line(row, company)
		grand_total += line["amount"]
		lines.append(line)

	payments = data.get("payments") or []
	paid = sum(flt(p.get("amount")) for p in payments)
	wallet_credit = flt(data.get("wallet_amount") or 0)
	gift_card_credit = flt(data.get("gift_card_amount") or 0)
	total_paid = paid + wallet_credit + gift_card_credit

	return {
		"customer": data.customer,
		"beauty_branch": data.beauty_branch,
		"beauty_appointment": data.get("beauty_appointment"),
		"source": data.get("source") or "POS",
		"items": lines,
		"grand_total": grand_total,
		"payments": payments,
		"wallet_amount": wallet_credit,
		"gift_card_code": data.get("gift_card_code"),
		"gift_card_amount": gift_card_credit,
		"paid_amount": total_paid,
		"outstanding_amount": max(grand_total - total_paid, 0),
		"change_amount": max(total_paid - grand_total, 0),
		"invoice_posting_type": settings.invoice_posting_type,
	}


def checkout(cart: dict) -> dict:
	validated = validate_cart(cart)
	settings = frappe.get_single("Beauty Cloud Settings")
	company = validated.get("company") or settings.company

	if validated["outstanding_amount"] > 0 and not cart.get("allow_partial"):
		frappe.throw(
			_("Outstanding amount {0} must be settled").format(validated["outstanding_amount"])
		)

	from beauty_cloud.services.register_session import resolve_checkout_session

	session = resolve_checkout_session(validated | cart)

	tx = frappe.get_doc(
		{
			"doctype": "Beauty POS Transaction",
			"naming_series": "BPOS-.YYYY.-",
			"company": company,
			"beauty_branch": validated["beauty_branch"],
			"customer": validated["customer"],
			"beauty_appointment": validated.get("beauty_appointment"),
			"source": validated.get("source") or "POS",
			"status": "Draft",
			"posting_date": session["business_date"],
			"business_date": session["business_date"],
			"beauty_business_day": session.get("beauty_business_day"),
			"beauty_register_session": session.get("beauty_register_session"),
			"beauty_pos_register": session.get("beauty_pos_register"),
			"register_code": session.get("register_code"),
			"cashier": session.get("cashier"),
			"items": validated["items"],
			"payments": validated.get("payments") or [],
			"notes": cart.get("notes"),
		}
	)
	tx.insert(ignore_permissions=True)

	_apply_wallet_redemption(validated)
	_apply_gift_card_redemption(validated)

	invoice = _create_invoice(tx, settings)
	tx.db_set(
		{
			"invoice_doctype": invoice.doctype,
			"invoice": invoice.name,
			"grand_total": invoice.grand_total,
			"paid_amount": validated["paid_amount"],
			"outstanding_amount": validated["outstanding_amount"],
			"change_amount": validated["change_amount"],
			"status": _payment_status(validated),
		}
	)

	_create_payment_entries(tx, invoice, validated.get("payments") or [])

	if tx.beauty_appointment:
		appt_payment_status = _appointment_payment_status(validated)
		frappe.db.set_value(
			"Beauty Appointment",
			tx.beauty_appointment,
			{
				"beauty_pos_transaction": tx.name,
				"payment_status": appt_payment_status,
			},
		)
		from beauty_cloud.services.reception import maybe_restore_appointment_after_payment

		maybe_restore_appointment_after_payment(tx.beauty_appointment, appt_payment_status)

	return tx.as_dict()


def load_appointment_for_pos(name: str) -> dict:
	"""Build a POS cart from an existing beauty appointment."""
	doc = frappe.get_doc("Beauty Appointment", name)
	doc.check_permission("read")

	items = []
	for row in doc.services:
		items.append(
			{
				"line_type": "Service",
				"beauty_service": row.beauty_service,
				"service_name": row.service_name,
				"qty": 1,
				"rate": flt(row.rate or row.amount),
				"employee": row.employee,
				"employee_name": row.employee_name,
			}
		)

	return {
		"beauty_appointment": doc.name,
		"customer": doc.customer,
		"customer_name": doc.customer_name,
		"beauty_branch": doc.beauty_branch,
		"status": doc.status,
		"payment_status": doc.payment_status,
		"total_amount": flt(doc.total_amount),
		"items": items,
	}


def refund_transaction(name: str, amount: float | None = None, reason: str | None = None) -> dict:
	original = frappe.get_doc("Beauty POS Transaction", name)
	if original.status == "Refunded":
		frappe.throw(_("Transaction already refunded"))
	if not original.invoice:
		frappe.throw(_("No invoice linked to refund"))

	refund_amount = flt(amount or original.grand_total)
	return_invoice = _create_return_invoice(original, refund_amount)

	reversal = frappe.get_doc(
		{
			"doctype": "Beauty POS Transaction",
			"naming_series": "BPOS-.YYYY.-",
			"company": original.company,
			"beauty_branch": original.beauty_branch,
			"customer": original.customer,
			"beauty_appointment": original.beauty_appointment,
			"source": original.source,
			"status": "Refunded",
			"is_return": 1,
			"return_against": original.name,
			"invoice_doctype": return_invoice.doctype,
			"invoice": return_invoice.name,
			"grand_total": -refund_amount,
			"paid_amount": -refund_amount,
			"notes": reason,
			"items": original.items,
		}
	)
	reversal.insert(ignore_permissions=True)
	original.db_set("status", "Refunded")

	if original.beauty_appointment:
		_reverse_appointment_commissions(original.beauty_appointment)

	return reversal.as_dict()


def lookup_barcode(barcode: str, beauty_branch: str) -> dict:
	item = frappe.db.get_value(
		"Item",
		{"item_code": barcode, "disabled": 0},
		["name", "item_name", "stock_uom", "standard_rate", "barcode"],
		as_dict=True,
	)
	if not item:
		item = frappe.db.get_value(
			"Item",
			{"barcode": barcode, "disabled": 0},
			["name", "item_name", "stock_uom", "standard_rate", "barcode"],
			as_dict=True,
		)
	if not item:
		frappe.throw(_("Item not found for barcode {0}").format(barcode))

	warehouse = frappe.db.get_value("Beauty Branch", beauty_branch, "retail_warehouse")
	stock_qty = flt(
		frappe.db.get_value("Bin", {"item_code": item.name, "warehouse": warehouse}, "actual_qty")
	)
	return {**item, "item_code": item.name, "stock_qty": stock_qty, "warehouse": warehouse}


def get_payment_methods(channel: str = "pos"):
	from beauty_cloud.beauty_cloud.doctype.beauty_cloud_settings.beauty_cloud_settings import (
		get_allowed_payment_modes,
	)

	return get_allowed_payment_modes(channel)


def _normalize_cart_line(row: dict, company: str) -> dict:
	row = frappe._dict(row)
	qty = flt(row.qty or 1)
	rate = flt(row.rate or 0)
	discount = flt(row.discount_amount or 0)

	if row.line_type == "Service" or row.get("beauty_service"):
		service = row.beauty_service
		if not rate:
			rate = flt(
				frappe.db.get_value("Beauty Service", service, "standard_selling_price")
			)
		item_code, item_name = _resolve_service_item(service)
		return {
			"line_type": "Service",
			"beauty_service": service,
			"item": item_code,
			"item_name": item_name or frappe.db.get_value("Beauty Service", service, "service_name"),
			"qty": qty,
			"rate": rate,
			"discount_amount": discount,
			"amount": qty * rate - discount,
			"employee": row.get("employee"),
			"recommended_by": row.get("recommended_by"),
			"fulfillment_status": "N/A",
		}

	item_code = row.item
	if not item_code:
		frappe.throw(_("Item or beauty service is required on cart line"))
	if not rate:
		rate = flt(frappe.db.get_value("Item", item_code, "standard_rate"))
	from beauty_cloud.services.retail_fulfillment import default_fulfillment_status

	return {
		"line_type": row.get("line_type") or "Item",
		"item": item_code,
		"item_name": row.get("item_name") or frappe.db.get_value("Item", item_code, "item_name"),
		"qty": qty,
		"rate": rate,
		"discount_amount": discount,
		"amount": qty * rate - discount,
		"employee": row.get("employee"),
		"recommended_by": row.get("recommended_by"),
		"fulfillment_status": default_fulfillment_status(row.get("line_type") or "Item", item_code),
	}


def _resolve_service_item(beauty_service: str) -> tuple[str | None, str | None]:
	linked = frappe.db.get_value("Beauty Service", beauty_service, ["item", "service_name"], as_dict=True)
	if linked and linked.item:
		return linked.item, linked.service_name
	if frappe.db.exists("Item", beauty_service):
		return beauty_service, linked.service_name if linked else beauty_service
	if frappe.db.exists("Item", "BC-SERVICE"):
		return "BC-SERVICE", linked.service_name if linked else beauty_service
	return None, linked.service_name if linked else beauty_service


def _create_invoice(tx, settings):
	branch = frappe.get_doc("Beauty Branch", tx.beauty_branch)
	invoice_items = []
	for row in tx.items:
		item_code = row.item or "BC-SERVICE"
		if not frappe.db.exists("Item", item_code):
			frappe.throw(_("Item {0} not found for invoicing").format(item_code))
		invoice_items.append(
			{
				"item_code": item_code,
				"item_name": row.item_name,
				"qty": row.qty,
				"rate": row.rate,
				"discount_amount": row.discount_amount,
				"warehouse": branch.retail_warehouse if frappe.db.get_value("Item", item_code, "is_stock_item") else None,
			}
		)

	if settings.invoice_posting_type == "POS Invoice" and branch.pos_profile:
		inv = frappe.get_doc(
			{
				"doctype": "POS Invoice",
				"customer": tx.customer,
				"company": tx.company,
				"posting_date": tx.posting_date,
				"pos_profile": branch.pos_profile,
				"set_warehouse": branch.retail_warehouse,
				"items": invoice_items,
			}
		)
	else:
		inv = frappe.get_doc(
			{
				"doctype": "Sales Invoice",
				"customer": tx.customer,
				"company": tx.company,
				"posting_date": tx.posting_date,
				"items": invoice_items,
			}
		)

	inv.insert(ignore_permissions=True)
	inv.submit()
	return inv


def _create_payment_entries(tx, invoice, payments: list[dict]):
	if not payments:
		return

	from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

	company_currency = frappe.get_cached_value("Company", tx.company, "default_currency")
	allocated = 0
	for idx, payment in enumerate(payments):
		amount = flt(payment.get("amount"))
		if amount <= 0:
			continue

		mode = payment.get("mode_of_payment") or "Cash"

		pe = get_payment_entry(
			invoice.doctype,
			invoice.name,
			party_amount=min(amount, flt(invoice.grand_total) - allocated),
		)
		pe.mode_of_payment = mode

		cash_account = _resolve_payment_account(tx.company, mode)
		if not cash_account:
			frappe.throw(_("No ledger account configured for payment mode {0}").format(mode))

		pe.paid_to = cash_account
		pe.paid_to_account_currency = (
			frappe.db.get_value("Account", cash_account, "account_currency") or company_currency
		)
		pe.paid_to_account_type = frappe.db.get_value("Account", cash_account, "account_type")

		if pe.paid_from and not pe.paid_from_account_currency:
			pe.paid_from_account_currency = (
				frappe.db.get_value("Account", pe.paid_from, "account_currency") or company_currency
			)
		if pe.paid_from and not pe.paid_from_account_type:
			pe.paid_from_account_type = frappe.db.get_value("Account", pe.paid_from, "account_type")

		pe.paid_amount = amount
		pe.received_amount = amount
		pe.reference_no = tx.name
		pe.reference_date = tx.posting_date

		# ERPNext requires both rates before submit; force 1 for single-currency SAR.
		if pe.paid_from_account_currency == company_currency:
			pe.source_exchange_rate = 1
		if pe.paid_to_account_currency == company_currency:
			pe.target_exchange_rate = 1
		if pe.paid_from_account_currency == pe.paid_to_account_currency:
			rate = flt(pe.source_exchange_rate) or flt(pe.target_exchange_rate) or 1
			pe.source_exchange_rate = rate
			pe.target_exchange_rate = rate
		else:
			pe.set_exchange_rate(invoice)
			pe.source_exchange_rate = flt(pe.source_exchange_rate) or 1
			pe.target_exchange_rate = flt(pe.target_exchange_rate) or 1

		pe.set_amounts()
		pe.set_amounts_in_company_currency()
		pe.insert(ignore_permissions=True)
		pe.submit()
		if tx.payments and idx < len(tx.payments):
			tx.payments[idx].payment_entry = pe.name
		allocated += amount
	tx.save(ignore_permissions=True)


def _resolve_payment_account(company: str, mode_of_payment: str) -> str | None:
	account = frappe.db.get_value(
		"Mode of Payment Account",
		{"parent": mode_of_payment, "company": company},
		"default_account",
	)
	if account:
		return account
	return frappe.db.get_value("Company", company, "default_cash_account")


def _create_return_invoice(original, refund_amount: float):
	inv = frappe.get_doc(original.invoice_doctype, original.invoice)
	return_inv = frappe.copy_doc(inv)
	return_inv.is_return = 1
	return_inv.return_against = inv.name
	return_inv.items = []
	for row in inv.items:
		return_inv.append(
			"items",
			{
				"item_code": row.item_code,
				"qty": -row.qty,
				"rate": row.rate,
				"warehouse": row.warehouse,
			},
		)
	return_inv.insert(ignore_permissions=True)
	return_inv.submit()
	return return_inv


def _feature_enabled(field: str) -> bool:
	meta = frappe.get_meta("Beauty Cloud Settings")
	if not meta.has_field(field):
		return False
	return bool(frappe.db.get_single_value("Beauty Cloud Settings", field))


def _apply_wallet_redemption(validated: dict):
	if not _feature_enabled("enable_customer_wallet"):
		return
	amount = flt(validated.get("wallet_amount"))
	if amount <= 0:
		return

	from beauty_cloud.services.loyalty import redeem_wallet

	redeem_wallet(validated["customer"], amount, notes="POS checkout")


def _apply_gift_card_redemption(validated: dict):
	if not _feature_enabled("enable_gift_cards"):
		return
	code = validated.get("gift_card_code")
	amount = flt(validated.get("gift_card_amount"))
	if not code or amount <= 0:
		return

	from beauty_cloud.services.loyalty import redeem_gift_card

	redeem_gift_card(code, amount, validated["customer"])


def _payment_status(validated: dict) -> str:
	if validated["outstanding_amount"] <= 0:
		return "Paid"
	if validated["paid_amount"] > 0:
		return "Partially Paid"
	return "Draft"


def _appointment_payment_status(validated: dict) -> str:
	if validated["outstanding_amount"] <= 0:
		return "Paid"
	if validated["paid_amount"] > 0:
		return "Partially Paid" if validated["outstanding_amount"] > 0 else "Deposit Paid"
	return "Unpaid"


def _reverse_appointment_commissions(appointment_name: str):
	from beauty_cloud.services.commission import reverse_commission_for_appointment

	reverse_commission_for_appointment(appointment_name)


def get_today_orders(beauty_branch: str, appointment_date: str | None = None) -> list[dict]:
	"""Today's bookings for the POS order list (Baheya: start from Booking list)."""
	from beauty_cloud.services.reception import get_waiting_queue

	date = getdate(appointment_date or today())
	orders = get_waiting_queue(beauty_branch, date)

	completed_unpaid = frappe.get_all(
		"Beauty Appointment",
		filters={
			"beauty_branch": beauty_branch,
			"appointment_date": date,
			"status": "Completed",
			"payment_status": ("in", ["Unpaid", "Partially Paid"]),
		},
		fields=[
			"name",
			"customer_name",
			"appointment_date",
			"scheduled_start",
			"scheduled_end",
			"status",
			"payment_status",
			"source",
			"total_amount",
			"modified",
		],
		order_by="scheduled_start asc",
	)
	seen = {row["name"] for row in orders}
	for row in completed_unpaid:
		if row.name in seen:
			continue
		services = frappe.get_all(
			"Beauty Appointment Service",
			filters={"parent": row.name},
			fields=["idx", "beauty_service", "service_name", "employee_name", "start_time", "status"],
		)
		orders.append({**row, "services": services})

	return orders


def get_service_catalog() -> dict:
	"""Service categories with POS-enabled services (Fresha-style drill-down)."""
	settings = frappe.get_single("Beauty Cloud Settings")
	categories = frappe.get_all(
		"Beauty Service Category",
		filters={"company": settings.company, "is_active": 1, "is_group": 0},
		fields=["name", "category_name", "sort_order"],
		order_by="sort_order asc, category_name asc",
	)
	services = frappe.get_all(
		"Beauty Service",
		filters={"company": settings.company, "is_active": 1, "pos_enabled": 1},
		fields=[
			"name",
			"service_code",
			"service_name",
			"service_category",
			"default_duration",
			"standard_selling_price",
		],
		order_by="service_name asc",
	)

	by_category: dict[str, list] = {}
	for svc in services:
		key = svc.service_category or "_other"
		by_category.setdefault(key, []).append(svc)

	groups = []
	seen = set()
	for cat in categories:
		if cat.name in by_category:
			groups.append(
				{
					"name": cat.name,
					"label": cat.category_name,
					"services": by_category[cat.name],
				}
			)
			seen.add(cat.name)

	for key, svc_list in by_category.items():
		if key in seen:
			continue
		label = next((c.category_name for c in categories if c.name == key), None)
		groups.append(
			{
				"name": key,
				"label": label or ("Other" if key == "_other" else key),
				"services": svc_list,
			}
		)

	return {"categories": groups, "total_services": len(services)}


def get_product_categories(beauty_branch: str) -> list[dict]:
	warehouse = frappe.db.get_value("Beauty Branch", beauty_branch, "retail_warehouse")
	if not warehouse:
		return []

	return frappe.db.sql(
		"""
		select i.item_group as name, count(distinct i.name) as item_count
		from `tabItem` i
		inner join `tabBin` b on b.item_code = i.name
		where i.disabled = 0 and i.is_stock_item = 1
			and b.warehouse = %(warehouse)s and b.actual_qty > 0
		group by i.item_group
		order by i.item_group asc
		""",
		{"warehouse": warehouse},
		as_dict=True,
	)


def search_customers(query: str, limit: int = 12) -> list[dict]:
	query = (query or "").strip()
	if len(query) < 2:
		return []

	like = f"%{query}%"
	return frappe.db.sql(
		"""
		select name, customer_name, mobile_no, email_id
		from `tabCustomer`
		where disabled = 0
			and (customer_name like %(like)s or mobile_no like %(like)s or name like %(like)s)
		order by modified desc
		limit %(limit)s
		""",
		{"like": like, "limit": int(limit)},
		as_dict=True,
	)
