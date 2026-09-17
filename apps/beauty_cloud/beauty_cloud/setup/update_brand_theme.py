# Copyright (c) 2026, Beauty Cloud and contributors

"""Apply Beau-T-Cloud palette and logo URLs to existing branding records."""

from __future__ import annotations

import frappe


def apply_beau_t_cloud_branding():
	logo_path = "/files/beau-t-cloud-primary.png"
	favicon_path = "/files/beau-t-cloud-favicon.png"

	rows = frappe.get_all("Beauty Cloud Branding Settings", pluck="name")
	for name in rows:
		doc = frappe.get_doc("Beauty Cloud Branding Settings", name)
		doc.application_title = doc.application_title or "Beau-T-Cloud"
		doc.primary_color = "#FF1B9A"
		doc.secondary_color = "#2E1A2F"
		doc.accent_color = "#FCEFF5"
		doc.background_color = "#FFFFFF"
		doc.surface_color = "#FAFAFA"
		doc.text_color = "#5A445C"
		doc.muted_text_color = "#747474"
		if frappe.db.exists("File", {"file_url": logo_path}):
			doc.logo_light = logo_path
			doc.logo_dark = logo_path
		if frappe.db.exists("File", {"file_url": favicon_path}):
			doc.favicon = favicon_path
		doc.save(ignore_permissions=True)

	frappe.db.commit()
	return {"updated": len(rows)}
