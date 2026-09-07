# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


COMPANY = "Bahyea Bauty"


def ensure_defaults():
	company = frappe.db.get_value("Company", {"company_name": COMPANY})
	if not company:
		company = frappe.db.get_value("Company", {"name": COMPANY})

	if not company:
		frappe.log_error("Beauty Cloud: default company not found for settings bootstrap")
		return

	settings = frappe.get_single("Beauty Cloud Settings")
	settings.company = company
	settings.invoice_posting_type = settings.invoice_posting_type or "Sales Invoice"
	settings.enable_sms = 0
	settings.sms_note = "SMS OTP is disabled. Configure when SMS provider is available."
	settings.otp_expiry_minutes = settings.otp_expiry_minutes or 10
	settings.otp_max_attempts = settings.otp_max_attempts or 5
	settings.require_payment_at_booking = 1
	settings.require_payment_before_service = 1
	settings.require_payment_at_kiosk = 0
	settings.booking_payment_type = settings.booking_payment_type or "Full Amount"
	settings.booking_deposit_percent = settings.booking_deposit_percent or 50
	settings.enable_telr = 1
	settings.telr_store_id = settings.telr_store_id or "1234"
	settings.telr_auth_key = settings.telr_auth_key or "demo-auth-key"
	settings.telr_demo_mode = 1
	settings.telr_currency = settings.telr_currency or "SAR"
	settings.telr_note = (
		"Telr demo mode is ON — booking uses simulated payment (test card 4111…). "
		"No live Telr API calls are made until demo mode is disabled."
	)

	if not settings.get("allowed_payment_methods"):
		for mode in ("Cash", "Wire Transfer"):
			if frappe.db.exists("Mode of Payment", mode):
				settings.append(
					"allowed_payment_methods",
					{
						"mode_of_payment": mode,
						"enabled": 1,
						"allow_in_booking": 1 if mode == "Cash" else 0,
						"allow_in_pos": 1,
						"allow_in_kiosk": 1 if mode == "Cash" else 0,
					},
				)
		if frappe.db.exists("Mode of Payment", "Online Payment"):
			settings.append(
				"allowed_payment_methods",
				{
					"mode_of_payment": "Online Payment",
					"enabled": 1,
					"allow_in_booking": 1,
					"allow_in_pos": 0,
					"allow_in_kiosk": 0,
				},
			)

	settings.save(ignore_permissions=True)


def load_demo_data():
	company = frappe.db.get_value("Company", {"company_name": COMPANY}) or COMPANY
	if not frappe.db.exists("Company", company):
		return

	_create_branch(company)
	_create_branding(company)
	_create_service_categories(company)
	_create_services(company)
	frappe.db.commit()


def _create_branch(company: str):
	if frappe.db.exists("Beauty Branch", "BBY-MAIN"):
		return

	retail_wh = _ensure_warehouse(company, "BBY Retail - BBY", "BBY Retail")
	cons_wh = _ensure_warehouse(company, "BBY Consumables - BBY", "BBY Consumables")

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Branch",
			"branch_code": "BBY-MAIN",
			"branch_name": "Bahyea Bauty Main Salon",
			"company": company,
			"is_active": 1,
			"retail_warehouse": retail_wh,
			"consumables_warehouse": cons_wh,
			"default_warehouse": retail_wh,
			"phone": "+966500000000",
			"email": "info@beautycloud.local",
			"address": "Dammam, Saudi Arabia",
		}
	)
	doc.insert(ignore_permissions=True)


def _ensure_warehouse(company: str, name: str, wh_name: str) -> str:
	if frappe.db.exists("Warehouse", name):
		return name

	company_abbr = frappe.db.get_value("Company", company, "abbr")
	parent = frappe.db.get_value("Warehouse", {"company": company, "is_group": 1, "name": ("like", "%All Warehouses%")})
	if not parent:
		parent = frappe.db.get_value("Warehouse", {"company": company, "is_group": 1})

	doc = frappe.get_doc(
		{
			"doctype": "Warehouse",
			"warehouse_name": wh_name,
			"company": company,
			"is_group": 0,
			"parent_warehouse": parent,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def _create_branding(company: str):
	if frappe.db.get_all("Beauty Cloud Branding Settings", filters={"company": company}, limit=1):
		return

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Cloud Branding Settings",
			"company": company,
			"enabled": 1,
			"application_title": "Beauty Cloud",
			"company_display_name": "Bahyea Bauty",
			"primary_color": "#6B4EFF",
			"secondary_color": "#1A1A2E",
			"accent_color": "#E8B4BC",
			"support_email": "support@beautycloud.local",
		}
	)
	doc.insert(ignore_permissions=True)


def _create_service_categories(company: str):
	categories = [
		("Hair", "الشعر", 1),
		("Skin & Facial", "البشرة والعناية", 2),
		("Nails", "الأظافر", 3),
	]
	for name, name_ar, order in categories:
		if frappe.db.exists("Beauty Service Category", name):
			continue
		frappe.get_doc(
			{
				"doctype": "Beauty Service Category",
				"category_name": name,
				"category_name_ar": name_ar,
				"company": company,
				"is_group": 0,
				"is_active": 1,
				"sort_order": order,
			}
		).insert(ignore_permissions=True)


def _create_services(company: str):
	services = [
		("SRV-HAIR-CUT", "Hair Cut & Style", "Hair", 45, 120),
		("SRV-BLOW-DRY", "Blow Dry", "Hair", 30, 80),
		("SRV-FACIAL", "Classic Facial", "Skin & Facial", 60, 250),
		("SRV-MANICURE", "Manicure", "Nails", 45, 90),
		("SRV-PEDICURE", "Pedicure", "Nails", 60, 110),
	]
	for code, name, category, duration, price in services:
		if frappe.db.exists("Beauty Service", code):
			continue
		frappe.get_doc(
			{
				"doctype": "Beauty Service",
				"service_code": code,
				"service_name": name,
				"company": company,
				"service_category": category,
				"is_active": 1,
				"default_duration": duration,
				"standard_selling_price": price,
				"online_booking_enabled": 1,
				"kiosk_enabled": 1,
				"pos_enabled": 1,
				"allow_salon": 1,
			}
		).insert(ignore_permissions=True)
