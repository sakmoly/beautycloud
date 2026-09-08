# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


from beauty_cloud.utils.files import public_file_url


def get_resolved_branding(company: str, branch: str | None = None) -> dict:
	"""Resolve branding with branch → company → defaults priority."""
	doc = None
	if branch:
		docname = frappe.db.get_value(
			"Beauty Cloud Branding Settings",
			{"company": company, "branch": branch, "enabled": 1},
		)
		if docname:
			doc = frappe.get_doc("Beauty Cloud Branding Settings", docname)

	if not doc:
		docname = frappe.db.get_value(
			"Beauty Cloud Branding Settings",
			{"company": company, "branch": ("is", "not set"), "enabled": 1},
		)
		if docname:
			doc = frappe.get_doc("Beauty Cloud Branding Settings", docname)

	defaults = {
		"application_title": "Beauty Cloud",
		"company_display_name": frappe.db.get_value("Company", company, "company_name"),
		"theme_mode": "Light",
		"primary_color": "#5B2C6F",
		"secondary_color": "#E91E8C",
		"accent_color": "#F4A5C8",
		"background_color": "#FFFBFC",
		"surface_color": "#FFF5F9",
		"text_color": "#2D1B36",
		"muted_text_color": "#8B6F96",
		"success_color": "#16A34A",
		"warning_color": "#D97706",
		"danger_color": "#DC2626",
		"border_radius_style": "md",
		"promo_bar_enabled": 0,
	}

	if not doc:
		return {
			**defaults,
			"hero_slides": [],
			"menu_items": [],
			"footer_menu_items": [],
			"css_variables": _to_css_variables(defaults),
		}

	data = {**defaults, **doc.as_dict()}
	return {
		"application_title": data.get("application_title"),
		"company_display_name": data.get("company_display_name"),
		"logo_light": public_file_url(data.get("logo_light")),
		"logo_dark": public_file_url(data.get("logo_dark")),
		"favicon": public_file_url(data.get("favicon")),
		"booking_header_image": public_file_url(data.get("booking_header_image")),
		"promo_bar_enabled": bool(data.get("promo_bar_enabled")),
		"promo_bar_text": data.get("promo_bar_text"),
		"hero_slides": _serialize_hero_slides(data.get("hero_slides") or []),
		"menu_items": _serialize_menu_items(data.get("menu_items") or []),
		"footer_menu_items": _serialize_menu_items(data.get("footer_menu_items") or []),
		"tagline": data.get("tagline"),
		"hero_title": data.get("hero_title"),
		"hero_subtitle": data.get("hero_subtitle"),
		"about_teaser": data.get("about_teaser"),
		"instagram_url": data.get("instagram_url"),
		"facebook_url": data.get("facebook_url"),
		"twitter_url": data.get("twitter_url"),
		"tiktok_url": data.get("tiktok_url"),
		"theme_mode": data.get("theme_mode"),
		"support_email": data.get("support_email"),
		"support_phone": data.get("support_phone"),
		"custom_footer_text": data.get("custom_footer_text"),
		"css_variables": _to_css_variables(data),
	}


def _serialize_hero_slides(rows: list) -> list[dict]:
	slides = []
	for row in rows:
		if isinstance(row, dict):
			image = row.get("image")
			title = row.get("title")
		else:
			image = getattr(row, "image", None)
			title = getattr(row, "title", None)
		if not title:
			continue
		slides.append(
			{
				"image": public_file_url(image if isinstance(row, dict) else getattr(row, "image", None)),
				"eyebrow": row.get("eyebrow") if isinstance(row, dict) else getattr(row, "eyebrow", None),
				"title": title,
				"subtitle": row.get("subtitle") if isinstance(row, dict) else getattr(row, "subtitle", None),
				"cta_label": row.get("cta_label") if isinstance(row, dict) else getattr(row, "cta_label", None),
				"cta_link": row.get("cta_link") if isinstance(row, dict) else getattr(row, "cta_link", None),
				"sort_order": row.get("sort_order") if isinstance(row, dict) else getattr(row, "sort_order", 0),
			}
		)
	return sorted(slides, key=lambda s: s.get("sort_order") or 0)


def _serialize_menu_items(rows: list) -> list[dict]:
	items = []
	for row in rows:
		if isinstance(row, dict):
			data = row
		else:
			data = {
				"label": getattr(row, "label", None),
				"url": getattr(row, "url", None),
				"link_type": getattr(row, "link_type", None),
				"parent_label": getattr(row, "parent_label", None),
				"sort_order": getattr(row, "sort_order", 0),
				"is_visible": getattr(row, "is_visible", 1),
				"highlight": getattr(row, "highlight", 0),
				"open_in_new_tab": getattr(row, "open_in_new_tab", 0),
			}
		if not data.get("label") or not data.get("url"):
			continue
		items.append(
			{
				"label": data.get("label"),
				"url": data.get("url"),
				"link_type": data.get("link_type") or "Internal",
				"parent_label": data.get("parent_label"),
				"sort_order": data.get("sort_order") or 0,
				"is_visible": bool(data.get("is_visible", 1)),
				"highlight": bool(data.get("highlight")),
				"open_in_new_tab": bool(data.get("open_in_new_tab")),
			}
		)
	return sorted(items, key=lambda r: r.get("sort_order") or 0)


def _to_css_variables(data: dict) -> dict:
	mapping = {
		"--bc-primary": data.get("primary_color"),
		"--bc-secondary": data.get("secondary_color"),
		"--bc-accent": data.get("accent_color"),
		"--bc-background": data.get("background_color"),
		"--bc-surface": data.get("surface_color"),
		"--bc-text": data.get("text_color"),
		"--bc-muted": data.get("muted_text_color"),
		"--bc-success": data.get("success_color"),
		"--bc-warning": data.get("warning_color"),
		"--bc-danger": data.get("danger_color"),
	}
	radius = {"sm": "0.375rem", "md": "0.75rem", "lg": "1rem", "full": "9999px"}
	mapping["--bc-radius"] = radius.get(data.get("border_radius_style") or "md", "0.75rem")
	mapping["--bc-tan"] = data.get("accent_color") or "#D4B896"
	mapping["--bc-gold"] = data.get("secondary_color") or "#C4A574"
	return mapping
