# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.loyalty import (
	create_gift_card,
	credit_wallet,
	get_package,
	get_wallet_balance,
	list_packages,
	redeem_gift_card,
	validate_gift_card,
)


@frappe.whitelist()
def packages(company: str | None = None):
	return list_packages(company)


@frappe.whitelist()
def package_detail(name: str):
	return get_package(name)


@frappe.whitelist()
def wallet_balance(customer: str):
	return get_wallet_balance(customer)


@frappe.whitelist()
def wallet_credit(customer: str, amount: float, notes: str | None = None):
	return credit_wallet(customer, float(amount), notes=notes)


@frappe.whitelist()
def gift_card_validate(code: str):
	return validate_gift_card(code)


@frappe.whitelist()
def gift_card_create(amount: float, expiry_days: int = 365):
	return create_gift_card(float(amount), expiry_days=int(expiry_days))


@frappe.whitelist()
def gift_card_redeem(code: str, amount: float, customer: str | None = None):
	return redeem_gift_card(code, float(amount), customer)
