# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, flt


def get_vat_settings() -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	rate = flt(getattr(settings, "vat_percent", None) or 15)
	return {
		"enabled": bool(getattr(settings, "enable_vat", 1)),
		"prices_include_vat": bool(getattr(settings, "prices_include_vat", 1)),
		"vat_percent": rate,
		"sales_taxes_template": getattr(settings, "sales_taxes_template", None),
		"vat_account": getattr(settings, "vat_account", None),
	}


def split_vat_amount(amount: float, vat_percent: float, prices_include_vat: bool = True) -> dict:
	"""Split a gross or net amount into net, VAT, and total."""
	amount = flt(amount)
	rate = flt(vat_percent)
	if rate <= 0:
		return {"net_amount": amount, "vat_amount": 0.0, "total_amount": amount}

	if prices_include_vat:
		net = flt(amount / (1 + rate / 100), 2)
		vat = flt(amount - net, 2)
		return {"net_amount": net, "vat_amount": vat, "total_amount": amount}

	vat = flt(amount * rate / 100, 2)
	return {"net_amount": amount, "vat_amount": vat, "total_amount": flt(amount + vat, 2)}


def _resolve_vat_account(company: str, preferred: str | None = None) -> str:
	if preferred and frappe.db.exists("Account", preferred):
		return preferred

	account = frappe.db.get_value(
		"Account",
		{"company": company, "account_type": "Tax", "disabled": 0, "account_name": ("like", "%VAT%")},
		"name",
	)
	if account:
		return account

	account = frappe.db.get_value(
		"Account",
		{"company": company, "account_type": "Tax", "disabled": 0},
		"name",
	)
	if not account:
		frappe.throw(_("No VAT/Tax account found for company {0}").format(company))
	return account


def _template_title(company: str, inclusive: bool) -> str:
	label = "Inclusive" if inclusive else "Exclusive"
	return f"Saudi VAT 15% {label} - {company}"


def ensure_vat_setup(company: str | None = None, settings=None) -> dict:
	"""Create/update VAT templates and link them in Beauty Cloud Settings."""
	settings = settings or frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	if not company:
		frappe.throw(_("Company is required to configure VAT"))

	vat_account = _resolve_vat_account(company, getattr(settings, "vat_account", None))
	rate = flt(getattr(settings, "vat_percent", None) or 15)
	if not flt(rate):
		rate = 15

	# Beauty Cloud retail prices are VAT-inclusive unless explicitly switched off in settings.
	if not getattr(settings, "sales_taxes_template", None):
		settings.enable_vat = 1
		settings.prices_include_vat = 1

	inclusive = bool(cint(getattr(settings, "prices_include_vat", 1)))

	template_name = _ensure_sales_tax_template(company, vat_account, rate, inclusive)
	item_template_name = _ensure_item_tax_template(company, vat_account, rate)
	_link_item_tax_to_service_items(item_template_name, company)

	settings.enable_vat = cint(getattr(settings, "enable_vat", 1))
	settings.vat_percent = rate
	settings.prices_include_vat = cint(inclusive)
	settings.vat_account = vat_account
	settings.sales_taxes_template = template_name
	settings.save(ignore_permissions=True)

	return {
		"sales_taxes_template": template_name,
		"item_tax_template": item_template_name,
		"vat_account": vat_account,
	}


def _ensure_sales_tax_template(company: str, vat_account: str, rate: float, inclusive: bool) -> str:
	title = _template_title(company, inclusive)
	existing = frappe.db.get_value(
		"Sales Taxes and Charges Template",
		{"company": company, "title": title},
		"name",
	)
	if existing:
		doc = frappe.get_doc("Sales Taxes and Charges Template", existing)
	else:
		doc = frappe.get_doc(
			{
				"doctype": "Sales Taxes and Charges Template",
				"title": title,
				"company": company,
				"is_default": 1,
			}
		)

	doc.taxes = []
	doc.append(
		"taxes",
		{
			"charge_type": "On Net Total",
			"account_head": vat_account,
			"description": f"VAT {int(rate)}%",
			"rate": rate,
			"included_in_print_rate": 1 if inclusive else 0,
		},
	)
	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)

	# Disable the opposite template as default if both exist.
	other_title = _template_title(company, not inclusive)
	other = frappe.db.get_value(
		"Sales Taxes and Charges Template",
		{"company": company, "title": other_title},
		"name",
	)
	if other:
		frappe.db.set_value("Sales Taxes and Charges Template", other, "is_default", 0)

	return doc.name


def _ensure_item_tax_template(company: str, vat_account: str, rate: float) -> str:
	title = f"Saudi VAT {int(rate)}% - {company}"
	existing = frappe.db.get_value("Item Tax Template", {"company": company, "title": title}, "name")
	if existing:
		doc = frappe.get_doc("Item Tax Template", existing)
	else:
		doc = frappe.get_doc(
			{
				"doctype": "Item Tax Template",
				"title": title,
				"company": company,
			}
		)

	doc.taxes = []
	doc.append("taxes", {"tax_type": vat_account, "tax_rate": rate})
	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	return doc.name


def _link_item_tax_to_service_items(item_tax_template: str, company: str) -> None:
	item_codes = frappe.get_all(
		"Beauty Service",
		filters={"company": company, "is_active": 1},
		pluck="item",
	)
	item_codes = sorted({code for code in item_codes if code and frappe.db.exists("Item", code)})
	for item_code in item_codes:
		item = frappe.get_doc("Item", item_code)
		if any(row.item_tax_template == item_tax_template for row in item.taxes or []):
			continue
		item.append("taxes", {"item_tax_template": item_tax_template, "tax_category": ""})
		item.save(ignore_permissions=True)


def apply_sales_taxes(invoice, settings=None) -> None:
	"""Attach the configured sales tax template before invoice insert/submit."""
	settings = settings or frappe.get_single("Beauty Cloud Settings")
	if not getattr(settings, "enable_vat", 1):
		return

	template = getattr(settings, "sales_taxes_template", None)
	if not template or not frappe.db.exists("Sales Taxes and Charges Template", template):
		ensure_vat_setup(settings.company, settings=settings)
		settings = frappe.get_single("Beauty Cloud Settings")
		template = settings.sales_taxes_template

	if not template:
		return

	invoice.taxes_and_charges = template
	if hasattr(invoice, "set_missing_values"):
		invoice.set_missing_values()
	if hasattr(invoice, "calculate_taxes_and_totals"):
		invoice.calculate_taxes_and_totals()
