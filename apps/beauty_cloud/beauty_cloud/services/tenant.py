# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, flt, getdate, now_datetime, today


DEFAULT_FEATURES = (
	"online_booking",
	"reception",
	"beautician_tablet",
	"inventory_custody",
	"pos",
	"commission",
	"loyalty",
	"kiosk",
	"multi_branch",
	"management_reports",
)


def get_current_tenant(site_name: str | None = None) -> dict | None:
	site_name = site_name or frappe.local.site
	tenant_name = frappe.db.get_value("Beauty Cloud Tenant", {"site_name": site_name}, "name")
	if not tenant_name:
		return None
	return frappe.get_doc("Beauty Cloud Tenant", tenant_name).as_dict()


def get_current_tenant_or_throw(site_name: str | None = None) -> dict:
	tenant = get_current_tenant(site_name)
	if not tenant:
		frappe.throw(_("No tenant registered for site {0}").format(site_name or frappe.local.site))
	return tenant


def get_tenant_context(site_name: str | None = None) -> dict:
	tenant = get_current_tenant(site_name)
	if not tenant:
		settings = frappe.get_single("Beauty Cloud Settings")
		return {
			"tenant": None,
			"plan": None,
			"features": {key: True for key in DEFAULT_FEATURES},
			"limits": {},
			"status": "Active",
			"company": settings.company,
		}

	plan = get_plan(tenant["plan"])
	features = _plan_features(plan)
	limits = _plan_limits(plan)
	return {
		"tenant": {
			"tenant_code": tenant["tenant_code"],
			"tenant_name": tenant["tenant_name"],
			"status": tenant["status"],
			"site_name": tenant["site_name"],
			"public_url": tenant.get("public_url"),
			"subscription_start": tenant.get("subscription_start"),
			"subscription_end": tenant.get("subscription_end"),
		},
		"plan": {
			"plan_code": plan["plan_code"],
			"plan_name": plan["plan_name"],
			"monthly_price": plan.get("monthly_price"),
		},
		"features": features,
		"limits": limits,
		"status": tenant["status"],
		"company": tenant["company"],
	}


def get_plan(plan_code: str) -> dict:
	if not frappe.db.exists("Beauty Cloud Plan", plan_code):
		frappe.throw(_("Plan {0} not found").format(plan_code))
	return frappe.get_doc("Beauty Cloud Plan", plan_code).as_dict()


def list_plans(active_only: bool = True) -> list[dict]:
	filters = {"is_active": 1} if active_only else {}
	return frappe.get_all(
		"Beauty Cloud Plan",
		filters=filters,
		fields=["name", "plan_code", "plan_name", "monthly_price", "currency", "is_active"],
		order_by="plan_name asc",
	)


def list_tenants(status: str | None = None) -> list[dict]:
	filters = {}
	if status:
		filters["status"] = status
	return frappe.get_all(
		"Beauty Cloud Tenant",
		filters=filters,
		fields=[
			"name",
			"tenant_code",
			"tenant_name",
			"status",
			"site_name",
			"company",
			"plan",
			"subscription_end",
			"public_url",
		],
		order_by="tenant_name asc",
	)


def is_feature_enabled(feature_key: str, site_name: str | None = None) -> bool:
	context = get_tenant_context(site_name)
	if context["status"] in ("Suspended", "Cancelled"):
		return False
	return bool(context["features"].get(feature_key))


def require_feature(feature_key: str):
	if not is_feature_enabled(feature_key):
		frappe.throw(_("Feature {0} is not enabled for this tenant").format(feature_key))


def get_limit(limit_key: str, site_name: str | None = None) -> int | None:
	context = get_tenant_context(site_name)
	return context["limits"].get(limit_key)


def check_limit(limit_key: str, current_count: int, site_name: str | None = None) -> dict:
	limit = get_limit(limit_key, site_name)
	if limit is None:
		return {"allowed": True, "limit": None, "current": current_count}

	allowed = int(current_count) < int(limit)
	return {
		"allowed": allowed,
		"limit": limit,
		"current": current_count,
		"remaining": max(int(limit) - int(current_count), 0),
	}


def enforce_limit(limit_key: str, count_fn, site_name: str | None = None):
	result = check_limit(limit_key, count_fn(), site_name)
	if not result["allowed"]:
		frappe.throw(
			_("Plan limit reached for {0} ({1}/{2})").format(
				limit_key, result["current"], result["limit"]
			)
		)
	return result


def register_tenant(data: dict) -> dict:
	payload = frappe._dict(data)
	if frappe.db.exists("Beauty Cloud Tenant", {"site_name": payload.site_name}):
		frappe.throw(_("Tenant already exists for site {0}").format(payload.site_name))

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Cloud Tenant",
			"tenant_code": payload.tenant_code,
			"tenant_name": payload.tenant_name,
			"site_name": payload.site_name,
			"company": payload.company,
			"plan": payload.plan,
			"status": payload.get("status") or "Active",
			"subscription_start": payload.get("subscription_start") or today(),
			"subscription_end": payload.get("subscription_end"),
			"public_url": payload.get("public_url"),
			"contact_email": payload.get("contact_email"),
			"contact_phone": payload.get("contact_phone"),
			"notes": payload.get("notes"),
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.as_dict()


def update_tenant_plan(tenant_code: str, plan_code: str, subscription_end: str | None = None) -> dict:
	doc = frappe.get_doc("Beauty Cloud Tenant", tenant_code)
	if not frappe.db.exists("Beauty Cloud Plan", plan_code):
		frappe.throw(_("Plan {0} not found").format(plan_code))
	doc.plan = plan_code
	if subscription_end:
		doc.subscription_end = subscription_end
	doc.save(ignore_permissions=True)
	return doc.as_dict()


def provision_current_site(
	tenant_code: str,
	tenant_name: str,
	plan_code: str,
	company: str | None = None,
	public_url: str | None = None,
) -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	if not company:
		frappe.throw(_("Default company is required to provision tenant"))

	existing = get_current_tenant()
	if existing:
		return {
			"status": "exists",
			"tenant": existing,
			"context": get_tenant_context(),
		}

	if not frappe.db.exists("Beauty Cloud Plan", plan_code):
		ensure_default_plan()
		if not frappe.db.exists("Beauty Cloud Plan", plan_code):
			frappe.throw(_("Plan {0} not found").format(plan_code))

	tenant = register_tenant(
		{
			"tenant_code": tenant_code,
			"tenant_name": tenant_name,
			"site_name": frappe.local.site,
			"company": company,
			"plan": plan_code,
			"status": "Active",
			"subscription_start": today(),
			"subscription_end": add_days(today(), 365),
			"public_url": public_url,
		}
	)
	return {
		"status": "created",
		"tenant": tenant,
		"context": get_tenant_context(),
	}


def ensure_default_plan() -> str:
	if frappe.db.exists("Beauty Cloud Plan", "PLAN-PRO"):
		return "PLAN-PRO"

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Cloud Plan",
			"plan_code": "PLAN-PRO",
			"plan_name": "Beauty Cloud Pro",
			"is_active": 1,
			"monthly_price": 999,
			"currency": frappe.db.get_value("Company", frappe.get_single("Beauty Cloud Settings").company, "default_currency")
			or "SAR",
			"max_branches": 5,
			"max_employees": 50,
			"max_kiosk_devices": 10,
			"description": "Full-feature salon SaaS plan for production tenants.",
			"features": [{"feature_key": key, "enabled": 1} for key in DEFAULT_FEATURES],
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def _plan_features(plan: dict) -> dict[str, bool]:
	features = {key: False for key in DEFAULT_FEATURES}
	for row in plan.get("features") or []:
		if row.get("feature_key"):
			features[row["feature_key"]] = bool(row.get("enabled"))
	return features


def _plan_limits(plan: dict) -> dict[str, int]:
	return {
		"max_branches": int(plan.get("max_branches") or 0),
		"max_employees": int(plan.get("max_employees") or 0),
		"max_kiosk_devices": int(plan.get("max_kiosk_devices") or 0),
	}
