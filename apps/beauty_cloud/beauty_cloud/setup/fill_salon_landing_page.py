# Copyright (c) 2026, Beauty Cloud and contributors
"""
Reusable Salon Landing page fill script.

Usage:
  bench --site site.beautycloud execute \\
    beauty_cloud.setup.fill_salon_landing_page.fill_salon_landing_page

Copy this file and edit PAGE only for new treatment or promo pages.
"""

import frappe

from beauty_cloud.constants.page_templates import salon_landing_default_why_us
from beauty_cloud.services.web_content import _default_salon_faq, _salon_landing_seed_sections


PAGE = {
	"page_slug": "salon-offer",
	"title": "Salon Offer",
	"page_template": "Salon Landing",
	"published": 0,
	"show_in_menu": 0,
	"menu_label": "",
	"menu_sort_order": 0,
	"meta_description": "Salon landing page template for Beauty Cloud.",
	"hero_title": "Salon Offer",
	"hero_subtitle": "Short tagline for this treatment or promotion",
	"showcase_title": "What to expect",
	"showcase_body": "<p>Describe the experience, duration, and results your guests can expect.</p>",
	"why_us_section_sort_order": 30,
	"faq_section_sort_order": 60,
}


def fill_salon_landing_page(page: dict | None = None):
	spec = page or PAGE
	sections = _salon_landing_seed_sections(
		title=spec["hero_title"],
		subtitle=spec["hero_subtitle"],
		showcase_title=spec["showcase_title"],
		showcase_body=spec["showcase_body"],
	)
	why_us = salon_landing_default_why_us(spec.get("why_us_section_sort_order") or 30)
	faq = _default_salon_faq(spec.get("faq_section_sort_order") or 60)

	settings = frappe.get_single("Beauty Cloud Settings")
	company = settings.company
	slug = spec["page_slug"]

	if frappe.db.exists("Beauty Web Page", slug):
		doc = frappe.get_doc("Beauty Web Page", slug)
	else:
		doc = frappe.new_doc("Beauty Web Page")
		doc.page_slug = slug
		doc.company = company

	doc.title = spec["title"]
	doc.page_template = spec.get("page_template") or "Salon Landing"
	doc.published = spec.get("published") or 0
	doc.show_in_menu = spec.get("show_in_menu") or 0
	doc.menu_label = spec.get("menu_label") or spec["title"]
	doc.menu_sort_order = spec.get("menu_sort_order") or 0
	doc.meta_description = spec.get("meta_description")

	doc.set("sections", sections)
	doc.set("why_us_items", why_us)
	doc.set("faq_items", faq)

	doc.flags.ignore_permissions = True
	doc.save()

	return {
		"name": doc.name,
		"slug": doc.page_slug,
		"url": f"/p/{doc.page_slug}",
		"published": doc.published,
		"template": doc.page_template,
	}
