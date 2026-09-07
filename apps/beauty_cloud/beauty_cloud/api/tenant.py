# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.tenant import (
	get_current_tenant,
	get_plan,
	get_tenant_context,
	list_plans,
	list_tenants,
	provision_current_site,
	register_tenant,
	update_tenant_plan,
)


@frappe.whitelist()
def current():
	return get_tenant_context()


@frappe.whitelist()
def plans():
	return list_plans()


@frappe.whitelist()
def plan_detail(plan_code: str):
	return get_plan(plan_code)


@frappe.whitelist()
def tenants(status: str | None = None):
	frappe.only_for("System Manager")
	return list_tenants(status)


@frappe.whitelist()
def register(data):
	frappe.only_for("System Manager")
	if isinstance(data, str):
		import json

		data = json.loads(data)
	return register_tenant(data)


@frappe.whitelist()
def change_plan(tenant_code: str, plan_code: str, subscription_end: str | None = None):
	frappe.only_for("System Manager")
	return update_tenant_plan(tenant_code, plan_code, subscription_end)


@frappe.whitelist()
def provision(
	tenant_code: str,
	tenant_name: str,
	plan_code: str = "PLAN-PRO",
	company: str | None = None,
	public_url: str | None = None,
):
	frappe.only_for("System Manager")
	return provision_current_site(tenant_code, tenant_name, plan_code, company, public_url)


@frappe.whitelist()
def me():
	return get_current_tenant()
