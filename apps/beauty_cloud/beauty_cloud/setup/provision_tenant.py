# Copyright (c) 2026, Beauty Cloud and contributors

"""Provision a Beauty Cloud tenant on the current Frappe site."""

from __future__ import annotations

import frappe


def provision(
	tenant_code: str = "BBY-DEMO",
	tenant_name: str = "Bahyea Bauty Demo Tenant",
	plan_code: str = "PLAN-PRO",
	company: str | None = None,
	public_url: str | None = None,
):
	from beauty_cloud.services.tenant import provision_current_site

	result = provision_current_site(
		tenant_code=tenant_code,
		tenant_name=tenant_name,
		plan_code=plan_code,
		company=company,
		public_url=public_url,
	)
	frappe.db.commit()
	return result
