# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.utils.files import public_file_url


def get_published_web_page(page_slug: str, company: str | None = None, branch: str | None = None) -> dict | None:
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company

	if branch:
		docname = frappe.db.get_value(
			"Beauty Web Page",
			{"page_slug": page_slug, "company": company, "branch": branch, "published": 1},
		)
		if docname:
			return _serialize_page(docname)

	docname = frappe.db.get_value(
		"Beauty Web Page",
		{"page_slug": page_slug, "company": company, "branch": ("is", "not set"), "published": 1},
	)
	if not docname:
		return None
	return _serialize_page(docname)


def get_home_page(company: str | None = None, branch: str | None = None) -> dict | None:
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company

	filters = {"company": company, "published": 1, "is_home_page": 1, "branch": ("is", "not set")}
	docname = frappe.db.get_value("Beauty Web Page", filters)
	if docname:
		return _serialize_page(docname)
	return get_published_web_page("home", company, branch)


def list_published_web_pages(company: str | None = None, menu_only: bool = False) -> list[dict]:
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	filters = {"company": company, "published": 1, "branch": ("is", "not set")}
	if menu_only:
		filters["show_in_menu"] = 1

	rows = frappe.get_all(
		"Beauty Web Page",
		filters=filters,
		fields=[
			"page_slug",
			"title",
			"subtitle",
			"menu_label",
			"show_in_menu",
			"menu_sort_order",
			"sort_order",
		],
		order_by="menu_sort_order asc, sort_order asc, title asc",
	)
	return [
		{
			"page_slug": row.page_slug,
			"title": row.title,
			"subtitle": row.subtitle,
			"menu_label": row.menu_label or row.title,
			"show_in_menu": bool(row.show_in_menu),
			"menu_sort_order": row.menu_sort_order or 0,
			"url": _page_url(row.page_slug),
		}
		for row in rows
	]


def get_public_navigation(company: str | None = None, branch: str | None = None) -> list[dict]:
	"""Merged navigation: branding menu items + CMS pages marked show_in_menu."""
	return _build_nav_from_menu_items(_header_menu_items(company, branch))


def get_public_footer_navigation(company: str | None = None, branch: str | None = None) -> list[dict]:
	"""Footer links from branding footer_menu_items."""
	from beauty_cloud.services.branding import get_resolved_branding

	branding = get_resolved_branding(company, branch)
	items = branding.get("footer_menu_items") or []
	if not items:
		items = [
			{"label": "Services", "url": "/services", "link_type": "System", "sort_order": 10, "is_visible": 1},
			{"label": "About", "url": "/about", "link_type": "System", "sort_order": 20, "is_visible": 1},
			{"label": "Branches", "url": "/branches", "link_type": "System", "sort_order": 30, "is_visible": 1},
			{"label": "Book appointment", "url": "/book", "link_type": "System", "sort_order": 40, "is_visible": 1},
		]
	return _build_nav_from_menu_items(items)


def _header_menu_items(company: str | None, branch: str | None) -> list[dict]:
	from beauty_cloud.services.branding import get_resolved_branding

	branding = get_resolved_branding(company, branch)
	items: list[dict] = []

	for row in branding.get("menu_items") or []:
		if not row.get("is_visible", True):
			continue
		items.append(
			{
				"label": row.get("label"),
				"url": row.get("url"),
				"link_type": row.get("link_type") or "Internal",
				"parent_label": row.get("parent_label"),
				"sort_order": row.get("sort_order") or 0,
				"highlight": bool(row.get("highlight")),
				"open_in_new_tab": bool(row.get("open_in_new_tab")),
				"source": "menu",
			}
		)

	for page in list_published_web_pages(company, menu_only=True):
		slug = page["page_slug"]
		if slug in ("home",):
			continue
		items.append(
			{
				"label": page["menu_label"],
				"url": page["url"],
				"link_type": "Internal",
				"parent_label": None,
				"sort_order": 100 + (page["menu_sort_order"] or 0),
				"highlight": False,
				"open_in_new_tab": False,
				"source": "page",
			}
		)

	return _inject_home_nav_item(items)


def _inject_home_nav_item(items: list[dict]) -> list[dict]:
	"""Ensure a Home link is always available in the header menu."""
	home_urls = {"/", "/home", ""}
	has_home = any((item.get("url") or "").strip().rstrip("/") in home_urls for item in items)
	if has_home:
		return items
	return [
		{
			"label": "Home",
			"url": "/",
			"link_type": "System",
			"parent_label": None,
			"sort_order": 0,
			"highlight": False,
			"open_in_new_tab": False,
			"source": "system",
		},
		*items,
	]


def _build_nav_from_menu_items(items: list[dict]) -> list[dict]:
	seen = set()
	unique: list[dict] = []
	for item in sorted(items, key=lambda r: (r.get("sort_order") or 0, r.get("label") or "")):
		key = (item.get("label"), item.get("url"))
		if key in seen:
			continue
		seen.add(key)
		unique.append(item)
	return _build_nav_tree(unique)


def _build_nav_tree(flat_items: list[dict]) -> list[dict]:
	parents = [item for item in flat_items if not item.get("parent_label")]
	children_by_parent: dict[str, list[dict]] = {}
	for item in flat_items:
		parent = item.get("parent_label")
		if not parent:
			continue
		children_by_parent.setdefault(parent, []).append(item)

	result = []
	for parent in parents:
		label = parent.get("label")
		node = {**parent, "children": children_by_parent.get(label, [])}
		result.append(node)
	return result


def _page_url(page_slug: str) -> str:
	if page_slug == "about":
		return "/about"
	if page_slug == "contact":
		return "/contact"
	return f"/p/{page_slug}"


def _serialize_page(docname: str) -> dict:
	doc = frappe.get_doc("Beauty Web Page", docname)
	company = doc.company

	gallery_by_name: dict[str, list[dict]] = {}
	gallery_by_sort: dict[int, list[dict]] = {}
	for row in doc.get("gallery_items") or []:
		item = {
			"image": public_file_url(row.image),
			"caption": row.caption,
			"sort_order": row.sort_order or 0,
		}
		if row.get("section_name"):
			gallery_by_name.setdefault(row.section_name, []).append(item)
		else:
			gallery_by_sort.setdefault(int(row.section_sort_order or 0), []).append(item)

	for bucket in (gallery_by_name, gallery_by_sort):
		for key in bucket:
			bucket[key].sort(key=lambda r: r.get("sort_order") or 0)

	why_us_by_sort: dict[int, list[dict]] = {}
	for row in doc.get("why_us_items") or []:
		key = int(row.section_sort_order or 0)
		why_us_by_sort.setdefault(key, []).append(
			{
				"icon": row.icon,
				"title": row.title,
				"description": row.description,
				"sort_order": row.sort_order or 0,
			}
		)
	for key in why_us_by_sort:
		why_us_by_sort[key].sort(key=lambda r: r.get("sort_order") or 0)

	faq_by_sort: dict[int, list[dict]] = {}
	for row in doc.get("faq_items") or []:
		key = int(row.section_sort_order or 0)
		faq_by_sort.setdefault(key, []).append(
			{
				"question": row.question,
				"answer": row.answer,
				"sort_order": row.sort_order or 0,
			}
		)
	for key in faq_by_sort:
		faq_by_sort[key].sort(key=lambda r: r.get("sort_order") or 0)

	sections = []
	for row in sorted(doc.get("sections") or [], key=lambda r: r.sort_order or 0):
		if row.get("is_visible") == 0:
			continue
		sort_key = int(row.sort_order or 0)
		gallery = gallery_by_name.get(row.name) or gallery_by_sort.get(sort_key, [])
		section = _serialize_section_row(
			row,
			company=company,
			gallery=gallery,
			why_us=why_us_by_sort.get(sort_key, []),
			faq=faq_by_sort.get(sort_key, []),
		)
		sections.append(section)

	return {
		"page_slug": doc.page_slug,
		"page_template": doc.page_template or "Standard",
		"title": doc.title,
		"subtitle": doc.subtitle,
		"meta_description": doc.meta_description,
		"is_home_page": bool(doc.is_home_page),
		"show_in_menu": bool(doc.show_in_menu),
		"menu_label": doc.menu_label or doc.title,
		"body": doc.body,
		"hero_image": public_file_url(doc.hero_image),
		"sections": sections,
		"url": _page_url(doc.page_slug),
	}


def _serialize_section_row(row, company: str, gallery: list[dict], why_us: list[dict], faq: list[dict]) -> dict:
	section = {
		"section_type": row.section_type,
		"title": row.title,
		"subtitle": row.subtitle,
		"body": row.body,
		"trust_chips": row.get("trust_chips"),
		"image": public_file_url(row.image),
		"image_position": row.image_position or "Left",
		"link_label": row.link_label,
		"link_url": row.link_url,
		"secondary_link_label": row.get("secondary_link_label"),
		"secondary_link_url": row.get("secondary_link_url"),
		"embed_category": row.get("embed_category"),
		"embed_limit": row.get("embed_limit") or 3,
		"sort_order": row.sort_order or 0,
		"gallery": gallery,
		"why_us": why_us,
		"faq": faq,
	}

	section_type = row.section_type
	if section_type == "Services Grid":
		from beauty_cloud.services.public_catalog import get_public_service_catalog

		parent = row.get("embed_category") or None
		catalog = get_public_service_catalog(parent, company, online_only=True)
		limit = int(row.get("embed_limit") or 3)
		section["categories"] = catalog.get("categories", [])[:limit]
	elif section_type == "Branches":
		limit = int(row.get("embed_limit") or 3)
		section["branches"] = _get_public_branches(company, limit)
	elif section_type == "Stylists":
		from beauty_cloud.services.public_stylists import get_public_stylists

		limit = int(row.get("embed_limit") or 0)
		section["stylists"] = get_public_stylists(company, limit=limit)

	return section


def _get_public_branches(company: str, limit: int) -> list[dict]:
	return frappe.get_all(
		"Beauty Branch",
		filters={"company": company, "is_active": 1},
		fields=["name", "branch_code", "branch_name", "phone", "email", "address"],
		order_by="branch_name asc",
		limit_page_length=limit,
	)


def ensure_default_web_pages(company: str):
	from beauty_cloud.constants.page_templates import home_default_sections, salon_landing_default_why_us
	from beauty_cloud.setup.salon_content import (
		ABOUT_BODY,
		BRIDAL,
		CONTACT_BODY,
		GALLERY_IMAGES,
		IMAGES,
		KERATIN,
		SUMMER_PROMO,
	)

	home_gallery = [
		{**item, "section_sort_order": 38} for item in GALLERY_IMAGES
	]

	pages = [
		{
			"page_slug": "about",
			"title": "About Bahyea Beauty",
			"subtitle": "Luxury salon care, thoughtfully delivered",
			"meta_description": "Learn about Bahyea Beauty — expert stylists, premium services, and online booking.",
			"show_in_menu": 1,
			"menu_label": "About Us",
			"menu_sort_order": 20,
			"body": ABOUT_BODY.strip(),
			"sort_order": 1,
			"force_refresh": True,
			"sections": [
				{
					"section_type": "Hero",
					"title": "About Bahyea Beauty",
					"subtitle": "Where artistry, care, and confidence come together",
					"image": IMAGES["salon_interior"],
					"link_label": "Book Now",
					"link_url": "/book",
					"secondary_link_label": "Our services",
					"secondary_link_url": "/services",
					"sort_order": 1,
				},
				{
					"section_type": "Trust Chips",
					"trust_chips": "Since 2018\n500+ guests monthly\nPremium products\nOnline booking\nArabic & English",
					"sort_order": 2,
				},
				{
					"section_type": "Rich Text",
					"body": ABOUT_BODY.strip(),
					"sort_order": 3,
				},
				{
					"section_type": "Why Us",
					"title": "Why guests choose us",
					"sort_order": 4,
				},
				{
					"section_type": "Stylists",
					"title": "Meet the team",
					"subtitle": "Our artists",
					"embed_limit": 0,
					"sort_order": 5,
				},
				{
					"section_type": "Book CTA",
					"title": "Experience the difference",
					"subtitle": "Book your first visit online — we will take care of the rest.",
					"link_label": "Book Now",
					"link_url": "/book",
					"sort_order": 6,
				},
			],
			"why_us_items": salon_landing_default_why_us(4),
		},
		{
			"page_slug": "contact",
			"title": "Contact Us",
			"subtitle": "We would love to hear from you",
			"meta_description": "Contact Bahyea Beauty — phone, email, and branch locations.",
			"show_in_menu": 1,
			"menu_label": "Contact Us",
			"menu_sort_order": 40,
			"sort_order": 2,
			"force_refresh": True,
			"sections": [
				{
					"section_type": "Hero",
					"title": "Get in touch",
					"subtitle": "Questions, appointments, or feedback — our team is here to help",
					"image": IMAGES["salon_interior"],
					"link_label": "Book online",
					"link_url": "/book",
					"sort_order": 1,
				},
				{
					"section_type": "Rich Text",
					"body": CONTACT_BODY.strip(),
					"sort_order": 2,
				},
				{
					"section_type": "Branches",
					"title": "Our locations",
					"subtitle": "Visit a branch near you",
					"embed_limit": 3,
					"link_label": "All branches",
					"link_url": "/branches",
					"sort_order": 3,
				},
				{
					"section_type": "FAQ",
					"title": "Quick answers",
					"sort_order": 4,
				},
				{
					"section_type": "Book CTA",
					"title": "Prefer to book online?",
					"subtitle": "Skip the phone queue — choose your services and time in minutes.",
					"link_label": "Book Appointment",
					"link_url": "/book",
					"sort_order": 5,
				},
			],
			"faq_items": _default_salon_faq(4),
		},
		{
			"page_slug": "home",
			"title": "Welcome",
			"is_home_page": 1,
			"published": 1,
			"page_template": "Standard",
			"sort_order": 0,
			"force_refresh": True,
			"sections": home_default_sections(),
			"why_us_items": salon_landing_default_why_us(20),
			"gallery_items": home_gallery,
		},
		{
			"page_slug": "bridal-package",
			"title": "Bridal Beauty Package",
			"page_template": "Salon Landing",
			"published": 1,
			"show_in_menu": 0,
			"meta_description": "Complete bridal hair, makeup and nail packages at Bahyea Beauty.",
			"sort_order": 10,
			"force_refresh": True,
			"sections": _salon_landing_seed_sections(
				title="Bridal Beauty Package",
				subtitle="Look breathtaking on your wedding day",
				showcase_title="Your bridal journey, start to finish",
				showcase_body=BRIDAL["showcase_body"],
				hero_image=IMAGES["bridal"],
				showcase_image=IMAGES["bridal"],
				trust_chips=BRIDAL["trust_chips"],
			),
			"why_us_items": salon_landing_default_why_us(30),
			"faq_items": _default_salon_faq(60),
		},
		{
			"page_slug": "keratin-treatment",
			"title": "Keratin Treatment",
			"page_template": "Salon Landing",
			"published": 1,
			"show_in_menu": 0,
			"meta_description": "Smooth, frizz-free hair with professional keratin treatments.",
			"sort_order": 11,
			"force_refresh": True,
			"sections": _salon_landing_seed_sections(
				title="Keratin Smoothing Treatment",
				subtitle="Silky, frizz-free hair that lasts for weeks",
				showcase_title="The treatment, step by step",
				showcase_body=KERATIN["showcase_body"],
				hero_image=IMAGES["keratin"],
				showcase_image=IMAGES["hair_styling"],
				trust_chips=KERATIN["trust_chips"],
			),
			"why_us_items": salon_landing_default_why_us(30),
			"faq_items": _default_salon_faq(60),
		},
		{
			"page_slug": "summer-promo",
			"title": "Summer Glow Promo",
			"page_template": "Salon Landing",
			"published": 1,
			"show_in_menu": 0,
			"meta_description": "Summer salon offers on hair, skin and nail treatments.",
			"sort_order": 12,
			"force_refresh": True,
			"sections": _salon_landing_seed_sections(
				title="Summer Glow Promo",
				subtitle="Limited-time offers on hair, skin & nails",
				showcase_title="Seasonal favourites",
				showcase_body=SUMMER_PROMO["showcase_body"],
				hero_image=IMAGES["summer"],
				showcase_image=IMAGES["facial"],
				trust_chips=SUMMER_PROMO["trust_chips"],
			),
			"why_us_items": salon_landing_default_why_us(30),
			"faq_items": _default_salon_faq(60),
		},
	]

	for page in pages:
		sections = page.pop("sections", [])
		why_us_items = page.pop("why_us_items", [])
		faq_items = page.pop("faq_items", [])
		gallery_items = page.pop("gallery_items", [])
		force_refresh = page.pop("force_refresh", False)
		slug = page["page_slug"]
		if frappe.db.exists("Beauty Web Page", slug):
			doc = frappe.get_doc("Beauty Web Page", slug)
			for key, value in page.items():
				setattr(doc, key, value)
			if sections and (force_refresh or not doc.sections):
				doc.sections = []
				for section in sections:
					doc.append("sections", section)
			if why_us_items and (force_refresh or not doc.why_us_items):
				doc.why_us_items = []
				for item in why_us_items:
					doc.append("why_us_items", item)
			if faq_items and (force_refresh or not doc.faq_items):
				doc.faq_items = []
				for item in faq_items:
					doc.append("faq_items", item)
			if gallery_items and (force_refresh or not doc.gallery_items):
				doc.gallery_items = []
				for item in gallery_items:
					doc.append("gallery_items", item)
			doc.save(ignore_permissions=True)
			continue

		doc = frappe.get_doc(
			{
				"doctype": "Beauty Web Page",
				"company": company,
				"published": 1,
				**page,
			}
		)
		for section in sections:
			doc.append("sections", section)
		for item in why_us_items:
			doc.append("why_us_items", item)
		for item in faq_items:
			doc.append("faq_items", item)
		for item in gallery_items:
			doc.append("gallery_items", item)
		doc.insert(ignore_permissions=True)


def _salon_landing_seed_sections(
	title: str,
	subtitle: str,
	showcase_title: str,
	showcase_body: str,
	hero_image: str | None = None,
	showcase_image: str | None = None,
	trust_chips: str | None = None,
) -> list[dict]:
	from beauty_cloud.constants.page_templates import salon_landing_default_sections

	sections = salon_landing_default_sections()
	for section in sections:
		if section["section_type"] == "Hero":
			section["title"] = title
			section["subtitle"] = subtitle
			if hero_image:
				section["image"] = hero_image
		if section["section_type"] == "Trust Chips" and trust_chips:
			section["trust_chips"] = trust_chips
		if section["section_type"] == "Text & Image":
			section["title"] = showcase_title
			section["body"] = showcase_body
			if showcase_image:
				section["image"] = showcase_image
	return sections


def _default_salon_faq(section_sort_order: int = 60) -> list[dict]:
	return [
		{
			"section_sort_order": section_sort_order,
			"question": "How do I book an appointment?",
			"answer": "<p>Use Book Now on this page. Choose your services, pick a time slot, and confirm with OTP verification.</p>",
			"sort_order": 1,
		},
		{
			"section_sort_order": section_sort_order,
			"question": "Can I reschedule or cancel?",
			"answer": "<p>Yes. Contact the branch or use your booking confirmation link. Cancellation policies may apply for same-day bookings.</p>",
			"sort_order": 2,
		},
		{
			"section_sort_order": section_sort_order,
			"question": "Do you accept walk-ins?",
			"answer": "<p>Walk-ins are welcome subject to availability. We recommend booking online to secure your preferred time and stylist.</p>",
			"sort_order": 3,
		},
	]


def ensure_default_menu(company: str):
	"""Seed default navigation on company branding if empty."""
	docname = frappe.db.get_value(
		"Beauty Cloud Branding Settings",
		{"company": company, "branch": ("is", "not set"), "enabled": 1},
	)
	if not docname:
		return
	doc = frappe.get_doc("Beauty Cloud Branding Settings", docname)
	if doc.get("menu_items"):
		return

	default_items = [
		{"label": "Home", "url": "/", "link_type": "System", "sort_order": 5, "is_visible": 1},
		{"label": "Store", "url": "/services", "link_type": "System", "sort_order": 10, "is_visible": 1},
		{
			"label": "Our Services",
			"url": "/services",
			"link_type": "System",
			"sort_order": 20,
			"is_visible": 1,
		},
		{
			"label": "Browse Services",
			"url": "/services",
			"link_type": "System",
			"parent_label": "Our Services",
			"sort_order": 21,
			"is_visible": 1,
		},
		{
			"label": "Book Appointment",
			"url": "/book",
			"link_type": "System",
			"parent_label": "Our Services",
			"sort_order": 22,
			"is_visible": 1,
		},
		{
			"label": "Where We Go",
			"url": "/branches",
			"link_type": "System",
			"sort_order": 30,
			"is_visible": 1,
		},
		{
			"label": "All Branches",
			"url": "/branches",
			"link_type": "System",
			"parent_label": "Where We Go",
			"sort_order": 31,
			"is_visible": 1,
		},
		{
			"label": "Book Now",
			"url": "/book",
			"link_type": "System",
			"sort_order": 100,
			"is_visible": 1,
			"highlight": 1,
		},
	]
	for item in default_items:
		doc.append("menu_items", item)
	doc.save(ignore_permissions=True)


def ensure_home_menu_item(company: str):
	"""Add Home to branding menu when missing (existing sites)."""
	docname = frappe.db.get_value(
		"Beauty Cloud Branding Settings",
		{"company": company, "branch": ("is", "not set"), "enabled": 1},
	)
	if not docname:
		return
	doc = frappe.get_doc("Beauty Cloud Branding Settings", docname)
	home_urls = {"/", "/home"}
	if any((row.url or "").strip() in home_urls for row in doc.get("menu_items") or []):
		return
	if any((row.label or "").strip().lower() == "home" for row in doc.get("menu_items") or []):
		return
	doc.append(
		"menu_items",
		{
			"label": "Home",
			"url": "/",
			"link_type": "System",
			"sort_order": 5,
			"is_visible": 1,
		},
	)
	doc.save(ignore_permissions=True)


def ensure_default_footer_menu(company: str):
	docname = frappe.db.get_value(
		"Beauty Cloud Branding Settings",
		{"company": company, "branch": ("is", "not set"), "enabled": 1},
	)
	if not docname:
		return
	doc = frappe.get_doc("Beauty Cloud Branding Settings", docname)
	if doc.get("footer_menu_items"):
		return

	default_items = [
		{"label": "Services", "url": "/services", "link_type": "System", "sort_order": 10, "is_visible": 1},
		{"label": "About", "url": "/about", "link_type": "System", "sort_order": 20, "is_visible": 1},
		{"label": "Contact", "url": "/contact", "link_type": "System", "sort_order": 25, "is_visible": 1},
		{"label": "Branches", "url": "/branches", "link_type": "System", "sort_order": 30, "is_visible": 1},
		{"label": "Book appointment", "url": "/book", "link_type": "System", "sort_order": 40, "is_visible": 1},
	]
	for item in default_items:
		doc.append("footer_menu_items", item)
	doc.save(ignore_permissions=True)
