# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, flt, getdate, now_datetime, today


def _require_feature(setting_field: str):
	settings = frappe.get_single("Beauty Cloud Settings")
	if not settings.get(setting_field):
		frappe.throw(_("Feature {0} is not enabled").format(setting_field))


def list_packages(company: str | None = None) -> list[dict]:
	_require_feature("enable_service_packages")
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	return frappe.get_all(
		"Beauty Service Package",
		filters={"company": company, "is_active": 1},
		fields=["name", "package_code", "package_name", "package_price", "validity_days", "description"],
		order_by="package_name asc",
	)


def get_package(name: str) -> dict:
	_require_feature("enable_service_packages")
	doc = frappe.get_doc("Beauty Service Package", name)
	return doc.as_dict()


def get_wallet_balance(customer: str) -> dict:
	_require_feature("enable_customer_wallet")
	if not frappe.db.exists("Beauty Customer Wallet", customer):
		return {"customer": customer, "balance": 0, "exists": False}
	wallet = frappe.get_doc("Beauty Customer Wallet", customer)
	return {"customer": customer, "balance": flt(wallet.balance), "exists": True}


def credit_wallet(customer: str, amount: float, company: str | None = None, notes: str | None = None) -> dict:
	_require_feature("enable_customer_wallet")
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	wallet = _get_or_create_wallet(customer, company)
	wallet.append(
		"transactions",
		{
			"transaction_type": "Credit",
			"amount": flt(amount),
			"notes": notes,
		},
	)
	wallet.balance = flt(wallet.balance) + flt(amount)
	wallet.save(ignore_permissions=True)
	return wallet.as_dict()


def redeem_wallet(customer: str, amount: float, notes: str | None = None) -> dict:
	_require_feature("enable_customer_wallet")
	wallet = frappe.get_doc("Beauty Customer Wallet", customer)
	if flt(wallet.balance) < flt(amount):
		frappe.throw(_("Insufficient wallet balance"))

	wallet.append(
		"transactions",
		{
			"transaction_type": "Debit",
			"amount": flt(amount),
			"notes": notes or "Redemption",
		},
	)
	wallet.balance = flt(wallet.balance) - flt(amount)
	wallet.save(ignore_permissions=True)
	return wallet.as_dict()


def validate_gift_card(code: str) -> dict:
	_require_feature("enable_gift_cards")
	if not frappe.db.exists("Beauty Gift Card", code):
		frappe.throw(_("Gift card not found"))
	card = frappe.get_doc("Beauty Gift Card", code)
	if card.status != "Active":
		frappe.throw(_("Gift card is not active"))
	if card.expiry_date and getdate(card.expiry_date) < getdate(today()):
		frappe.throw(_("Gift card expired"))
	return {
		"gift_card_code": card.name,
		"balance": flt(card.balance),
		"status": card.status,
	}


def redeem_gift_card(code: str, amount: float, customer: str | None = None) -> dict:
	card = frappe.get_doc("Beauty Gift Card", validate_gift_card(code)["gift_card_code"])
	if flt(card.balance) < flt(amount):
		frappe.throw(_("Insufficient gift card balance"))
	card.balance = flt(card.balance) - flt(amount)
	if card.balance <= 0:
		card.status = "Redeemed"
	if customer:
		card.customer = customer
	card.save(ignore_permissions=True)
	return card.as_dict()


def create_gift_card(amount: float, company: str | None = None, expiry_days: int | None = 365) -> dict:
	_require_feature("enable_gift_cards")
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	import secrets

	code = f"GC-{secrets.token_hex(4).upper()}"
	doc = frappe.get_doc(
		{
			"doctype": "Beauty Gift Card",
			"gift_card_code": code,
			"company": company,
			"initial_amount": flt(amount),
			"balance": flt(amount),
			"status": "Active",
			"expiry_date": add_days(today(), expiry_days) if expiry_days else None,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


def _get_or_create_wallet(customer: str, company: str):
	if frappe.db.exists("Beauty Customer Wallet", customer):
		return frappe.get_doc("Beauty Customer Wallet", customer)
	doc = frappe.get_doc(
		{
			"doctype": "Beauty Customer Wallet",
			"customer": customer,
			"company": company,
			"balance": 0,
			"is_active": 1,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc
