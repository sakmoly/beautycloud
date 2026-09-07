# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.utils import flt

from beauty_cloud.api.utils import parse_payload
from beauty_cloud.services.pos import (
	checkout,
	get_payment_methods,
	get_product_categories,
	get_service_catalog,
	get_today_orders,
	load_appointment_for_pos,
	lookup_barcode,
	refund_transaction,
	search_customers,
	validate_cart,
)


@frappe.whitelist()
def validate(data=None, **kwargs):
	return validate_cart(parse_payload(data, **kwargs))


@frappe.whitelist()
def checkout_cart(data=None, **kwargs):
	return checkout(parse_payload(data, **kwargs))


@frappe.whitelist()
def load_appointment(name: str):
	return load_appointment_for_pos(name)


@frappe.whitelist()
def get_orders(beauty_branch: str, appointment_date: str | None = None):
	return get_today_orders(beauty_branch, appointment_date)


@frappe.whitelist()
def get_service_categories():
	return get_service_catalog()


@frappe.whitelist()
def get_product_groups(beauty_branch: str):
	return get_product_categories(beauty_branch)


@frappe.whitelist()
def customer_search(query: str, limit: int = 12):
	return search_customers(query, int(limit))


@frappe.whitelist()
def get_services():
	settings = frappe.get_single("Beauty Cloud Settings")
	return frappe.get_all(
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


@frappe.whitelist()
def get_catalogue(
	beauty_branch: str,
	search: str | None = None,
	item_group: str | None = None,
	page: int = 1,
	page_size: int = 48,
):
	from beauty_cloud.services.beautician import get_product_catalogue

	return get_product_catalogue(beauty_branch, search, item_group, int(page), int(page_size))


@frappe.whitelist()
def refund(name: str, amount: float | None = None, reason: str | None = None):
	return refund_transaction(name, float(amount) if amount else None, reason)


@frappe.whitelist()
def barcode_lookup(barcode: str, beauty_branch: str):
	return lookup_barcode(barcode, beauty_branch)


@frappe.whitelist()
def payment_methods(channel: str = "pos"):
	return get_payment_methods(channel)
