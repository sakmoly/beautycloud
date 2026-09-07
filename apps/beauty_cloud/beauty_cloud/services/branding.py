# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


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
		"primary_color": "#6B4EFF",
		"secondary_color": "#1A1A2E",
		"accent_color": "#E8B4BC",
		"background_color": "#FFFFFF",
		"surface_color": "#F8F5FF",
		"text_color": "#1A1A2E",
		"muted_text_color": "#6B7280",
		"success_color": "#16A34A",
		"warning_color": "#D97706",
		"danger_color": "#DC2626",
		"border_radius_style": "md",
	}

	if not doc:
		return {
			**defaults,
			"css_variables": _to_css_variables(defaults),
		}

	data = {**defaults, **doc.as_dict()}
	return {
		"application_title": data.get("application_title"),
		"company_display_name": data.get("company_display_name"),
		"logo_light": data.get("logo_light"),
		"logo_dark": data.get("logo_dark"),
		"favicon": data.get("favicon"),
		"booking_header_image": data.get("booking_header_image"),
		"theme_mode": data.get("theme_mode"),
		"support_email": data.get("support_email"),
		"support_phone": data.get("support_phone"),
		"custom_footer_text": data.get("custom_footer_text"),
		"css_variables": _to_css_variables(data),
	}


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
	return mapping
