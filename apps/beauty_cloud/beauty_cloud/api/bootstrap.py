# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.beauty_cloud.doctype.beauty_cloud_settings.beauty_cloud_settings import (
	get_allowed_payment_modes,
)
from beauty_cloud.services.booking_payment import get_booking_payment_settings
from beauty_cloud.services.payment_gate import get_salon_payment_settings
from beauty_cloud.services.branding import get_resolved_branding


@frappe.whitelist(allow_guest=True)
def get_public_bootstrap(company: str | None = None, branch: str | None = None):
	"""Public bootstrap for Next.js / booking shell."""
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	branding = get_resolved_branding(company, branch)
	payment_settings = get_booking_payment_settings()

	return {
		"application_title": branding.get("application_title") or "Beauty Cloud",
		"company": company,
		"company_display_name": branding.get("company_display_name"),
		"invoice_posting_type": settings.invoice_posting_type,
		"sms_enabled": bool(settings.enable_sms),
		"email_enabled": bool(settings.get("enable_email_otp", 1)),
		"send_booking_confirmation_email": bool(settings.get("send_booking_confirmation_email", 1)),
		"payment_methods": {
			"booking": get_allowed_payment_modes("booking"),
			"pos": get_allowed_payment_modes("pos"),
			"kiosk": get_allowed_payment_modes("kiosk"),
		},
		"booking_payment": payment_settings,
		"salon_payment": get_salon_payment_settings(),
		"branding": branding,
	}


@frappe.whitelist(allow_guest=True)
def get_branches(company: str | None = None):
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	return frappe.get_all(
		"Beauty Branch",
		filters={"company": company, "is_active": 1},
		fields=[
			"name",
			"branch_code",
			"branch_name",
			"retail_warehouse",
			"consumables_warehouse",
			"pos_profile",
			"phone",
			"email",
			"address",
		],
		order_by="branch_name asc",
	)


@frappe.whitelist(allow_guest=True)
def get_services(company: str | None = None, branch: str | None = None, online_only: int = 1):
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	filters = {"company": company, "is_active": 1}
	if online_only:
		filters["online_booking_enabled"] = 1

	return frappe.get_all(
		"Beauty Service",
		filters=filters,
		fields=[
			"name",
			"service_code",
			"service_name",
			"service_name_ar",
			"service_category",
			"default_duration",
			"standard_selling_price",
			"allow_salon",
			"allow_home",
			"allow_hotel",
			"description",
		],
		order_by="service_name asc",
	)
