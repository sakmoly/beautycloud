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
	_ensure_branch_schedule(company)
	_ensure_service_category_tree(company)
	_create_services(company)
	_ensure_beauticians(company)
	_ensure_employee_skills(company)
	_ensure_employee_schedules(company)
	_ensure_web_pages(company)
	_ensure_pos_registers(company)
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
	existing = frappe.db.get_all("Beauty Cloud Branding Settings", filters={"company": company}, limit=1)
	if existing:
		doc = frappe.get_doc("Beauty Cloud Branding Settings", existing[0].name)
	else:
		doc = frappe.get_doc(
			{
				"doctype": "Beauty Cloud Branding Settings",
				"company": company,
				"enabled": 1,
				"application_title": "Beauty Cloud",
				"company_display_name": "Bahyea Bauty",
				"primary_color": "#1A1A1A",
				"secondary_color": "#C4A574",
				"accent_color": "#D4B896",
				"support_email": "support@beautycloud.local",
			}
		)
		doc.insert(ignore_permissions=True)

	doc.surface_color = "#FFF5F9"
	doc.background_color = "#FFFBFC"
	doc.primary_color = "#5B2C6F"
	doc.secondary_color = "#E91E8C"
	doc.accent_color = "#F4A5C8"

	from beauty_cloud.setup.salon_content import BRANDING, HERO_SLIDES

	doc.tagline = BRANDING["tagline"]
	doc.hero_title = BRANDING["hero_title"]
	doc.hero_subtitle = BRANDING["hero_subtitle"]
	doc.about_teaser = BRANDING["about_teaser"]
	doc.promo_bar_enabled = 1
	doc.promo_bar_text = BRANDING["promo_bar_text"]
	doc.custom_footer_text = BRANDING.get("custom_footer_text")
	doc.instagram_url = BRANDING.get("instagram_url")
	doc.facebook_url = BRANDING.get("facebook_url")
	doc.twitter_url = BRANDING.get("twitter_url")
	doc.tiktok_url = BRANDING.get("tiktok_url")
	doc.booking_header_image = doc.booking_header_image or HERO_SLIDES[0]["image"]

	doc.set("hero_slides", [])
	for slide in HERO_SLIDES:
		doc.append("hero_slides", slide)

	doc.save(ignore_permissions=True)


def _ensure_service_category_tree(company: str):
	"""Two-level category tree: group → leaf subcategories."""
	tree = [
		(
			"Hair",
			"الشعر",
			1,
			[
				("Hair Styling", "تصفيف الشعر", 1),
				("Hair Coloring", "صبغ الشعر", 2),
				("Hair Treatments", "علاجات الشعر", 3),
			],
		),
		(
			"Skin & Facial",
			"البشرة والعناية",
			2,
			[
				("Facials", "العناية بالبشرة", 1),
				("Skin Treatments", "علاجات البشرة", 2),
				("Threading & Waxing", "التشذيب والشمع", 3),
			],
		),
		(
			"Nails",
			"الأظافر",
			3,
			[
				("Manicure & Pedicure", "العناية بالأظافر", 1),
				("Nail Art", "فن الأظافر", 2),
				("Gel & Extensions", "جل وتركيب", 3),
			],
		),
	]

	for group_name, group_ar, group_order, leaves in tree:
		group_doc = _upsert_category(
			company,
			group_name,
			group_ar,
			group_order,
			is_group=1,
			parent=None,
		)
		for leaf_name, leaf_ar, leaf_order in leaves:
			_upsert_category(
				company,
				leaf_name,
				leaf_ar,
				leaf_order,
				is_group=0,
				parent=group_doc.name,
			)

	# Migrate legacy flat categories that matched old demo names.
	legacy_map = {
		"Hair": "Hair Styling",
		"Skin & Facial": "Facials",
		"Nails": "Manicure & Pedicure",
	}
	for old_name, new_leaf in legacy_map.items():
		if frappe.db.exists("Beauty Service Category", old_name):
			old = frappe.get_doc("Beauty Service Category", old_name)
			if not old.is_group and old_name != new_leaf:
				frappe.db.set_value(
					"Beauty Service",
					{"service_category": old_name},
					"service_category",
					new_leaf,
				)
				if old_name not in {group_name for group_name, *_ in tree}:
					frappe.delete_doc("Beauty Service Category", old_name, ignore_permissions=True)


def _upsert_category(
	company: str,
	name: str,
	name_ar: str,
	sort_order: int,
	is_group: int,
	parent: str | None,
):
	if frappe.db.exists("Beauty Service Category", name):
		doc = frappe.get_doc("Beauty Service Category", name)
		doc.category_name_ar = name_ar
		doc.is_group = is_group
		doc.sort_order = sort_order
		doc.is_active = 1
		doc.parent_beauty_service_category = parent
		doc.save(ignore_permissions=True)
		return doc

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Service Category",
			"category_name": name,
			"category_name_ar": name_ar,
			"company": company,
			"is_group": is_group,
			"is_active": 1,
			"sort_order": sort_order,
			"parent_beauty_service_category": parent,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc


def _ensure_web_pages(company: str):
	from beauty_cloud.services.web_content import (
		ensure_default_footer_menu,
		ensure_default_menu,
		ensure_default_web_pages,
	)

	ensure_default_web_pages(company)
	ensure_default_menu(company)
	ensure_default_footer_menu(company)


def _create_services(company: str):
	# (code, name, name_ar, category, duration, price, description)
	services = [
		# Hair Styling
		("SRV-HAIR-CUT", "Hair Cut & Style", "قص وتصفيف", "Hair Styling", 45, 120, "Precision cut and finish tailored to your style."),
		("SRV-BLOW-DRY", "Blow Dry", "تصفيف بالسشوار", "Hair Styling", 30, 80, "Smooth, voluminous blow dry with heat styling."),
		("SRV-UPDO", "Updo & Occasion Styling", "تسريحة مناسبات", "Hair Styling", 60, 180, "Elegant updo for weddings and special events."),
		# Hair Coloring
		("SRV-ROOT-TOUCH", "Root Touch-Up", "صبغ الجذور", "Hair Coloring", 60, 150, "Refresh your color from root to mid-length."),
		("SRV-FULL-COLOR", "Full Hair Color", "صبغ كامل", "Hair Coloring", 90, 280, "All-over color with premium ammonia-free formula."),
		("SRV-HIGHLIGHTS", "Highlights & Balayage", "هايلايت وبالياج", "Hair Coloring", 120, 350, "Hand-painted highlights for natural dimension."),
		# Hair Treatments
		("SRV-KERATIN", "Keratin Treatment", "علاج الكيراتين", "Hair Treatments", 90, 400, "Smoothing treatment for frizz-free, silky hair."),
		("SRV-HAIR-MASK", "Deep Conditioning Mask", "قناع ترطيب", "Hair Treatments", 45, 120, "Intensive hydration and repair for damaged hair."),
		# Facials
		("SRV-FACIAL", "Classic Facial", "فacial كلاسيكي", "Facials", 60, 250, "Deep cleanse, exfoliation, and hydration for glowing skin."),
		("SRV-ANTI-AGE", "Anti-Aging Facial", "فacial مضاد للشيخوخة", "Facials", 75, 320, "Firming treatment with collagen-boosting serums."),
		("SRV-HYDRA", "Hydra Facial", "فacial ترطيب", "Facials", 60, 290, "Multi-step hydration for instantly plump, dewy skin."),
		# Skin Treatments
		("SRV-CHEM-PEEL", "Chemical Peel", "تقشير كيميائي", "Skin Treatments", 45, 220, "Light peel to refine texture and even skin tone."),
		("SRV-MICRO", "Microdermabrasion", "تقشير الجلد", "Skin Treatments", 50, 260, "Gentle exfoliation for brighter, smoother skin."),
		# Threading & Waxing
		("SRV-THREAD", "Eyebrow Threading", "تشذيب الحواجب", "Threading & Waxing", 20, 40, "Precise eyebrow shaping with threading."),
		("SRV-WAX-FULL", "Full Face Wax", "شمع الوجه", "Threading & Waxing", 30, 70, "Gentle waxing for smooth, hair-free skin."),
		("SRV-WAX-BODY", "Half Leg Wax", "شمع نصف الساق", "Threading & Waxing", 45, 90, "Professional leg waxing with soothing aftercare."),
		# Manicure & Pedicure
		("SRV-MANICURE", "Classic Manicure", "مانيكير كلاسيكي", "Manicure & Pedicure", 45, 90, "Nail shaping, cuticle care, and polish."),
		("SRV-PEDICURE", "Spa Pedicure", "باديكير سبا", "Manicure & Pedicure", 60, 110, "Relaxing foot soak, exfoliation, and polish."),
		("SRV-MANI-PEDI", "Mani-Pedi Combo", "مانيكير وباديكير", "Manicure & Pedicure", 90, 170, "Complete hand and foot care in one visit."),
		# Nail Art
		("SRV-NAIL-ART", "Nail Art Design", "تصميم أظافر", "Nail Art", 60, 130, "Custom nail art with gems, patterns, and accents."),
		("SRV-FRENCH", "French Manicure", "مانيكير فرنسي", "Nail Art", 45, 100, "Timeless French tips with perfect white smile line."),
		# Gel & Extensions
		("SRV-GEL-MANI", "Gel Manicure", "جل مانيكير", "Gel & Extensions", 60, 140, "Long-lasting gel polish with chip-free finish."),
		("SRV-GEL-PEDI", "Gel Pedicure", "جل باديكير", "Gel & Extensions", 75, 160, "Durable gel pedicure with glossy shine."),
		("SRV-EXTENSIONS", "Acrylic Extensions", "تركيب أظافر", "Gel & Extensions", 90, 220, "Full set acrylic extensions shaped to your preference."),
	]
	for code, name, name_ar, category, duration, price, description in services:
		if frappe.db.exists("Beauty Service", code):
			frappe.db.set_value(
				"Beauty Service",
				code,
				{
					"service_name": name,
					"service_name_ar": name_ar,
					"service_category": category,
					"description": description,
					"default_duration": duration,
					"standard_selling_price": price,
					"online_booking_enabled": 1,
					"is_active": 1,
				},
			)
			continue
		frappe.get_doc(
			{
				"doctype": "Beauty Service",
				"service_code": code,
				"service_name": name,
				"service_name_ar": name_ar,
				"company": company,
				"service_category": category,
				"description": description,
				"is_active": 1,
				"default_duration": duration,
				"standard_selling_price": price,
				"online_booking_enabled": 1,
				"kiosk_enabled": 1,
				"pos_enabled": 1,
				"allow_salon": 1,
			}
		).insert(ignore_permissions=True)


def _ensure_pos_registers(company: str):
	if not frappe.db.exists("Beauty Branch", "BBY-MAIN"):
		return

	frappe.db.set_value(
		"Beauty Branch",
		"BBY-MAIN",
		{
			"require_business_day_for_pos": 1,
			"require_register_session_for_pos": 1,
			"require_all_registers_closed_for_day_close": 1,
			"business_day_cutoff_time": "03:00:00",
		},
	)

	registers = [
		("REG-01", "Front Desk Counter"),
		("REG-02", "Back Desk Counter"),
	]
	for code, name in registers:
		if frappe.db.exists("Beauty POS Register", code):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "Beauty POS Register",
				"register_code": code,
				"register_name": name,
				"beauty_branch": "BBY-MAIN",
				"company": company,
				"is_active": 1,
			}
		)
		doc.insert(ignore_permissions=True)

	from beauty_cloud.services.register_session import get_open_business_day, open_business_day

	if not get_open_business_day("BBY-MAIN"):
		open_business_day("BBY-MAIN")


def _ensure_branch_schedule(company: str):
	"""Ensure branch has opening hours for slot generation."""
	if not frappe.db.exists("Beauty Branch", "BBY-MAIN"):
		return

	if frappe.db.exists("Beauty Branch Schedule", "BBY-MAIN"):
		return

	weekdays = [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday",
	]
	doc = frappe.get_doc(
		{
			"doctype": "Beauty Branch Schedule",
			"beauty_branch": "BBY-MAIN",
			"company": company,
			"slot_interval_minutes": 15,
			"hours": [
				{
					"weekday": day,
					"open_time": "09:00:00",
					"close_time": "21:00:00",
					"is_closed": 0,
				}
				for day in weekdays
			],
		}
	)
	doc.insert(ignore_permissions=True)


BEAUTICIANS = [
	{
		"employee_name": "Sara Al-Ahmad",
		"first_name": "Sara",
		"last_name": "Al-Ahmad",
		"gender": "Female",
		"designation": "Senior Hair Stylist",
		"image": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&h=650&fit=crop&q=80",
		"services": [
			"SRV-HAIR-CUT", "SRV-BLOW-DRY", "SRV-UPDO", "SRV-ROOT-TOUCH",
			"SRV-FULL-COLOR", "SRV-HIGHLIGHTS", "SRV-KERATIN", "SRV-HAIR-MASK",
		],
	},
	{
		"employee_name": "Fatima Hassan",
		"first_name": "Fatima",
		"last_name": "Hassan",
		"gender": "Female",
		"designation": "Nail & Skin Specialist",
		"image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=650&fit=crop&q=80",
		"services": [
			"SRV-MANICURE", "SRV-PEDICURE", "SRV-MANI-PEDI", "SRV-NAIL-ART",
			"SRV-FRENCH", "SRV-GEL-MANI", "SRV-GEL-PEDI", "SRV-EXTENSIONS",
			"SRV-THREAD", "SRV-WAX-FULL",
		],
	},
	{
		"employee_name": "Noura Al-Mutairi",
		"first_name": "Noura",
		"last_name": "Al-Mutairi",
		"gender": "Female",
		"designation": "Facial & Skin Therapist",
		"image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=650&fit=crop&q=80",
		"services": [
			"SRV-FACIAL", "SRV-ANTI-AGE", "SRV-HYDRA", "SRV-CHEM-PEEL",
			"SRV-MICRO", "SRV-THREAD", "SRV-WAX-FULL", "SRV-WAX-BODY",
		],
	},
	{
		"employee_name": "Layla Al-Qahtani",
		"first_name": "Layla",
		"last_name": "Al-Qahtani",
		"gender": "Female",
		"designation": "Color & Treatment Expert",
		"image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=650&fit=crop&q=80",
		"services": [
			"SRV-HAIR-CUT", "SRV-BLOW-DRY", "SRV-ROOT-TOUCH", "SRV-FULL-COLOR",
			"SRV-HIGHLIGHTS", "SRV-KERATIN", "SRV-HAIR-MASK", "SRV-UPDO",
		],
	},
	{
		"employee_name": "Mariam Al-Otaibi",
		"first_name": "Mariam",
		"last_name": "Al-Otaibi",
		"gender": "Female",
		"designation": "Bridal & Occasion Stylist",
		"image": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&h=650&fit=crop&q=80",
		"services": ["SRV-UPDO", "SRV-BLOW-DRY", "SRV-HAIR-CUT", "SRV-HIGHLIGHTS"],
	},
	{
		"employee_name": "Hana Al-Shehri",
		"first_name": "Hana",
		"last_name": "Al-Shehri",
		"gender": "Female",
		"designation": "Senior Nail Artist",
		"image": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&h=650&fit=crop&q=80",
		"services": ["SRV-MANICURE", "SRV-PEDICURE", "SRV-NAIL-ART", "SRV-GEL-MANI", "SRV-GEL-PEDI", "SRV-FRENCH"],
	},
	{
		"employee_name": "Aisha Al-Harbi",
		"first_name": "Aisha",
		"last_name": "Al-Harbi",
		"gender": "Female",
		"designation": "Makeup & Brow Artist",
		"image": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=650&fit=crop&q=80",
		"services": ["SRV-THREAD", "SRV-FACIAL", "SRV-UPDO", "SRV-BLOW-DRY"],
	},
	{
		"employee_name": "Reem Al-Dosari",
		"first_name": "Reem",
		"last_name": "Al-Dosari",
		"gender": "Female",
		"designation": "Spa & Wellness Therapist",
		"image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=650&fit=crop&q=80",
		"services": ["SRV-FACIAL", "SRV-HYDRA", "SRV-ANTI-AGE", "SRV-WAX-BODY", "SRV-PEDICURE"],
	},
]


def _ensure_designation(name: str):
	if frappe.db.exists("Designation", name):
		return
	frappe.get_doc({"doctype": "Designation", "designation_name": name}).insert(
		ignore_permissions=True
	)


def _ensure_beauticians(company: str):
	for row in BEAUTICIANS:
		designation = row.get("designation")
		if designation:
			_ensure_designation(designation)

		existing = frappe.db.get_value(
			"Employee",
			{"employee_name": row["employee_name"], "company": company},
			"name",
		)
		if existing:
			frappe.db.set_value(
				"Employee",
				existing,
				{
					"image": row["image"],
					"designation": row["designation"],
					"status": "Active",
				},
			)
			continue

		doc = frappe.get_doc(
			{
				"doctype": "Employee",
				"naming_series": "HR-EMP-",
				"first_name": row["first_name"],
				"last_name": row["last_name"],
				"employee_name": row["employee_name"],
				"company": company,
				"gender": row["gender"],
				"status": "Active",
				"date_of_birth": "1992-06-15",
				"date_of_joining": "2024-01-01",
				"designation": row["designation"],
				"image": row["image"],
			}
		)
		doc.insert(ignore_permissions=True)


def _ensure_employee_skills(company: str):
	branch = "BBY-MAIN"
	for row in BEAUTICIANS:
		employee = frappe.db.get_value(
			"Employee",
			{"employee_name": row["employee_name"], "company": company},
			"name",
		)
		if not employee:
			continue

		for service_code in row["services"]:
			if not frappe.db.exists("Beauty Service", service_code):
				continue
			skill_name = frappe.db.get_value(
				"Employee Service Skill",
				{"employee": employee, "beauty_service": service_code, "company": company},
				"name",
			)
			if skill_name:
				frappe.db.set_value(
					"Employee Service Skill",
					skill_name,
					{"is_active": 1, "beauty_branch": branch},
				)
				continue

			frappe.get_doc(
				{
					"doctype": "Employee Service Skill",
					"employee": employee,
					"company": company,
					"beauty_branch": branch,
					"beauty_service": service_code,
					"is_active": 1,
					"skill_level": "Senior" if "Senior" in row.get("designation", "") else "Standard",
				}
			).insert(ignore_permissions=True)


def _ensure_employee_schedules(company: str):
	branch = "BBY-MAIN"
	weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
	# Sunday off for demo variety — branch still open

	for row in BEAUTICIANS:
		employee = frappe.db.get_value(
			"Employee",
			{"employee_name": row["employee_name"], "company": company},
			"name",
		)
		if not employee:
			continue

		for weekday in weekdays:
			if frappe.db.exists(
				"Beauty Employee Schedule",
				{"employee": employee, "beauty_branch": branch, "weekday": weekday},
			):
				continue
			frappe.get_doc(
				{
					"doctype": "Beauty Employee Schedule",
					"employee": employee,
					"company": company,
					"beauty_branch": branch,
					"weekday": weekday,
					"start_time": "09:00:00",
					"end_time": "21:00:00",
					"is_active": 1,
				}
			).insert(ignore_permissions=True)
