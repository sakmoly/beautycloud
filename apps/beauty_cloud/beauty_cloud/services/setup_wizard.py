# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, today

SETUP_STEPS = (
	"company",
	"branding",
	"branch",
	"schedule",
	"services",
	"team",
	"payments",
	"tenant",
	"review",
)


def _require_setup_access():
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.AuthenticationError)
	roles = set(frappe.get_roles())
	if "System Manager" not in roles and "Beauty Cloud Branch Manager" not in roles:
		frappe.throw(_("Only salon administrators can run setup"))


def get_setup_status() -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	company = settings.company
	steps = [
		_check_company_step(company),
		_check_branding_step(company),
		_check_branch_step(company),
		_check_schedule_step(company),
		_check_services_step(company),
		_check_team_step(company),
		_check_payments_step(settings),
		_check_tenant_step(),
		_check_review_step(settings),
	]
	required = [step for step in steps if step["id"] not in ("tenant", "review")]
	complete = all(step["status"] == "complete" for step in required)
	return {
		"setup_complete": bool(settings.setup_complete),
		"setup_completed_at": settings.setup_completed_at,
		"ready": complete,
		"steps": steps,
		"company": company,
	}


def save_setup_step(step_id: str, data: dict | None = None) -> dict:
	_require_setup_access()
	data = frappe._dict(data or {})
	handlers = {
		"company": _save_company_step,
		"branding": _save_branding_step,
		"branch": _save_branch_step,
		"schedule": _save_schedule_step,
		"services": _save_services_step,
		"team": _save_team_step,
		"payments": _save_payments_step,
		"tenant": _save_tenant_step,
	}
	if step_id not in handlers:
		frappe.throw(_("Unknown setup step: {0}").format(step_id))
	result = handlers[step_id](data)
	frappe.db.commit()
	status = get_setup_status()
	return {"step": step_id, "result": result, "status": status}


def complete_setup() -> dict:
	_require_setup_access()
	status = get_setup_status()
	if not status["ready"]:
		blockers = [
			f"{step['label']}: {step['message']}"
			for step in status["steps"]
			if step["status"] != "complete" and step["id"] != "tenant"
		]
		frappe.throw(_("Setup is not complete yet.\n{0}").format("\n".join(blockers)))

	settings = frappe.get_single("Beauty Cloud Settings")
	settings.setup_complete = 1
	settings.setup_completed_at = now_datetime()
	settings.setup_completed_by = frappe.session.user
	settings.save(ignore_permissions=True)
	frappe.db.commit()
	return get_setup_status()


def load_sample_data(scope: str = "all") -> dict:
	_require_setup_access()
	from beauty_cloud.setup.demo_data import load_demo_data

	company = frappe.get_single("Beauty Cloud Settings").company
	if not company:
		frappe.throw(_("Set the company first"))

	if scope in ("all", "services", "team", "branch"):
		load_demo_data()
		frappe.db.commit()
		return {"scope": scope, "status": get_setup_status()}

	frappe.throw(_("Unknown sample scope: {0}").format(scope))


def _save_company_step(data) -> dict:
	if not data.company:
		frappe.throw(_("Company is required"))
	if not frappe.db.exists("Company", data.company):
		frappe.throw(_("Company {0} does not exist").format(data.company))

	settings = frappe.get_single("Beauty Cloud Settings")
	settings.company = data.company
	if data.get("invoice_posting_type"):
		settings.invoice_posting_type = data.invoice_posting_type
	settings.save(ignore_permissions=True)
	return {"company": settings.company}


def _save_branding_step(data) -> dict:
	company = frappe.get_single("Beauty Cloud Settings").company
	if not company:
		frappe.throw(_("Set the company first"))

	rows = frappe.get_all(
		"Beauty Cloud Branding Settings",
		filters={"company": company},
		pluck="name",
		limit=1,
	)
	if rows:
		doc = frappe.get_doc("Beauty Cloud Branding Settings", rows[0])
	else:
		doc = frappe.get_doc({"doctype": "Beauty Cloud Branding Settings", "company": company})

	doc.enabled = 1
	doc.application_title = data.get("application_title") or data.get("company_display_name") or doc.application_title or "Beauty Cloud"
	doc.company_display_name = data.get("company_display_name") or doc.company_display_name or company
	doc.primary_color = data.get("primary_color") or doc.primary_color or "#5B2C6F"
	doc.secondary_color = data.get("secondary_color") or doc.secondary_color or "#E91E8C"
	doc.accent_color = data.get("accent_color") or doc.accent_color or "#F4A5C8"
	doc.support_email = data.get("support_email") or doc.support_email
	doc.save(ignore_permissions=True)
	return {"name": doc.name}


def _save_branch_step(data) -> dict:
	company = frappe.get_single("Beauty Cloud Settings").company
	if not company:
		frappe.throw(_("Set the company first"))

	branch_code = (data.branch_code or "MAIN").strip().upper()
	branch_name = data.branch_name or "Main Salon"
	docname = data.get("name") or frappe.db.get_value("Beauty Branch", {"branch_code": branch_code}, "name")

	if docname:
		doc = frappe.get_doc("Beauty Branch", docname)
	else:
		from beauty_cloud.setup.demo_data import _ensure_warehouse

		retail_wh = _ensure_warehouse(company, f"{branch_code} Retail", f"{branch_name} Retail")
		cons_wh = _ensure_warehouse(company, f"{branch_code} Consumables", f"{branch_name} Consumables")
		doc = frappe.get_doc(
			{
				"doctype": "Beauty Branch",
				"branch_code": branch_code,
				"branch_name": branch_name,
				"company": company,
				"is_active": 1,
				"retail_warehouse": retail_wh,
				"consumables_warehouse": cons_wh,
				"default_warehouse": retail_wh,
			}
		)

	doc.branch_name = branch_name
	doc.phone = data.get("phone") or doc.phone
	doc.email = data.get("email") or doc.email
	doc.address = data.get("address") or doc.address
	doc.is_active = 1
	doc.save(ignore_permissions=True)

	from beauty_cloud.setup.branch_defaults import ensure_branch_booking_ready

	booking_defaults = ensure_branch_booking_ready(doc.name)
	return {
		"name": doc.name,
		"branch_code": doc.branch_code,
		"booking_defaults": booking_defaults,
	}


def _save_schedule_step(data) -> dict:
	branch = data.beauty_branch or _first_branch()
	if not branch:
		frappe.throw(_("Create a branch first"))

	default_hours = [
		{"weekday": day, "open_time": "09:00:00", "close_time": "21:00:00", "is_closed": 0}
		for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
	] + [{"weekday": "Sunday", "open_time": "09:00:00", "close_time": "21:00:00", "is_closed": 1}]

	if frappe.db.exists("Beauty Branch Schedule", branch):
		doc = frappe.get_doc("Beauty Branch Schedule", branch)
	else:
		company = frappe.db.get_value("Beauty Branch", branch, "company")
		doc = frappe.get_doc(
			{
				"doctype": "Beauty Branch Schedule",
				"beauty_branch": branch,
				"company": company,
				"slot_interval_minutes": int(data.get("slot_interval_minutes") or 15),
				"hours": default_hours,
			}
		)

	doc.slot_interval_minutes = int(data.get("slot_interval_minutes") or doc.slot_interval_minutes or 15)
	if data.get("hours"):
		doc.set("hours", [])
		for row in data.hours:
			doc.append("hours", row)
	elif not doc.hours:
		doc.set("hours", [])
		for row in default_hours:
			doc.append("hours", row)

	doc.save(ignore_permissions=True)
	return {"beauty_branch": branch, "slot_interval_minutes": doc.slot_interval_minutes}


def _save_services_step(data) -> dict:
	company = frappe.get_single("Beauty Cloud Settings").company
	if not company:
		frappe.throw(_("Set the company first"))

	if data.get("load_sample"):
		from beauty_cloud.setup.demo_data import _create_services, _ensure_service_category_tree

		_ensure_service_category_tree(company)
		_create_services(company)
		count = frappe.db.count("Beauty Service", {"company": company, "is_active": 1})
		return {"loaded_sample": True, "service_count": count}

	count = frappe.db.count("Beauty Service", {"company": company, "is_active": 1})
	if count == 0:
		frappe.throw(_("Add at least one service or load the sample service catalog"))
	return {"service_count": count}


def _save_team_step(data) -> dict:
	company = frappe.get_single("Beauty Cloud Settings").company
	if not company:
		frappe.throw(_("Set the company first"))

	if data.get("load_sample"):
		from beauty_cloud.setup.demo_data import (
			_ensure_beauticians,
			_ensure_employee_schedules,
			_ensure_employee_skills,
			_sync_hr_shifts,
		)

		_ensure_beauticians(company)
		_ensure_employee_skills(company)
		_ensure_employee_schedules(company)
		_sync_hr_shifts(company)

	employees = frappe.db.count("Employee", {"company": company, "status": "Active"})
	if employees == 0:
		frappe.throw(_("Add at least one active employee or load the sample team"))
	return {"employee_count": employees}


def _save_payments_step(data) -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	if "require_payment_at_booking" in data:
		settings.require_payment_at_booking = int(data.require_payment_at_booking)
	if "require_payment_before_service" in data:
		settings.require_payment_before_service = int(data.require_payment_before_service)
	if "require_payment_at_kiosk" in data:
		settings.require_payment_at_kiosk = int(data.require_payment_at_kiosk)
	if "enable_telr" in data:
		settings.enable_telr = int(data.enable_telr)
	if "telr_demo_mode" in data:
		settings.telr_demo_mode = int(data.telr_demo_mode)
	if "enable_hr_schedule" in data:
		settings.enable_hr_schedule = int(data.enable_hr_schedule)
	if "auto_sync_hr_shifts" in data:
		settings.auto_sync_hr_shifts = int(data.auto_sync_hr_shifts)
	settings.save(ignore_permissions=True)
	return {"saved": True}


def _save_tenant_step(data) -> dict:
	if not data.get("tenant_code"):
		return {"skipped": True}

	from beauty_cloud.services.tenant import provision_current_site

	return provision_current_site(
		data.tenant_code,
		data.get("tenant_name") or data.tenant_code,
		data.get("plan_code") or "PLAN-PRO",
		frappe.get_single("Beauty Cloud Settings").company,
		data.get("public_url"),
	)


def _first_branch() -> str | None:
	company = frappe.get_single("Beauty Cloud Settings").company
	if not company:
		return None
	return frappe.db.get_value("Beauty Branch", {"company": company, "is_active": 1}, "name")


def _check_company_step(company: str | None) -> dict:
	ok = bool(company and frappe.db.exists("Company", company))
	return {
		"id": "company",
		"label": "Company",
		"status": "complete" if ok else "pending",
		"message": company or "Select the ERPNext company for this salon",
	}


def _check_branding_step(company: str | None) -> dict:
	if not company:
		return {"id": "branding", "label": "Branding", "status": "pending", "message": "Waiting for company"}
	row = frappe.db.get_value(
		"Beauty Cloud Branding Settings",
		{"company": company, "enabled": 1},
		["name", "company_display_name"],
		as_dict=True,
	)
	ok = bool(row and row.company_display_name)
	return {
		"id": "branding",
		"label": "Branding",
		"status": "complete" if ok else "pending",
		"message": row.company_display_name if ok else "Add salon name and brand colors",
	}


def _check_branch_step(company: str | None) -> dict:
	if not company:
		return {"id": "branch", "label": "Branch", "status": "pending", "message": "Waiting for company"}
	count = frappe.db.count("Beauty Branch", {"company": company, "is_active": 1})
	ok = count > 0
	return {
		"id": "branch",
		"label": "Branch",
		"status": "complete" if ok else "pending",
		"message": f"{count} active branch(es)" if ok else "Create your first salon branch",
		"count": count,
	}


def _check_schedule_step(company: str | None) -> dict:
	branch = _first_branch()
	if not branch:
		return {"id": "schedule", "label": "Opening hours", "status": "pending", "message": "Waiting for branch"}
	ok = frappe.db.exists("Beauty Branch Schedule", branch)
	interval = frappe.db.get_value("Beauty Branch Schedule", branch, "slot_interval_minutes") if ok else None
	return {
		"id": "schedule",
		"label": "Opening hours",
		"status": "complete" if ok else "pending",
		"message": f"{interval or 15} min slots configured" if ok else "Set branch opening hours",
		"beauty_branch": branch,
	}


def _check_services_step(company: str | None) -> dict:
	if not company:
		return {"id": "services", "label": "Services", "status": "pending", "message": "Waiting for company"}
	total = frappe.db.count("Beauty Service", {"company": company, "is_active": 1})
	bookable = frappe.db.count(
		"Beauty Service",
		{"company": company, "is_active": 1, "online_booking_enabled": 1},
	)
	ok = total > 0 and bookable > 0
	return {
		"id": "services",
		"label": "Services",
		"status": "complete" if ok else "pending",
		"message": f"{bookable} bookable / {total} total services" if total else "Add services or load sample catalog",
		"count": total,
	}


def _check_team_step(company: str | None) -> dict:
	if not company:
		return {"id": "team", "label": "Team", "status": "pending", "message": "Waiting for company"}
	employees = frappe.db.count("Employee", {"company": company, "status": "Active"})
	skills = frappe.db.count("Employee Service Skill", {"company": company, "is_active": 1})
	schedules = frappe.db.count("Beauty Employee Schedule", {"company": company, "is_active": 1})
	ok = employees > 0 and skills > 0 and schedules > 0
	return {
		"id": "team",
		"label": "Team",
		"status": "complete" if ok else "pending",
		"message": f"{employees} staff, {skills} skills, {schedules} schedule rows" if employees else "Add employees, skills, and schedules",
		"count": employees,
	}


def _check_payments_step(settings) -> dict:
	ok = bool(
		settings.enable_hr_schedule
		or settings.enable_telr
		or settings.require_payment_at_booking
		or settings.require_payment_before_service
	)
	return {
		"id": "payments",
		"label": "Payments & HR",
		"status": "complete" if ok else "pending",
		"message": "Payment and HR integration preferences saved" if ok else "Configure payment rules",
	}


def _check_tenant_step() -> dict:
	from beauty_cloud.services.tenant import get_current_tenant

	tenant = get_current_tenant()
	ok = bool(tenant)
	return {
		"id": "tenant",
		"label": "Public site (optional)",
		"status": "complete" if ok else "pending",
		"message": tenant.get("tenant_name") if ok else "Optional: register tenant and public URL",
		"optional": True,
	}


def _check_review_step(settings) -> dict:
	status = bool(settings.setup_complete)
	return {
		"id": "review",
		"label": "Go live",
		"status": "complete" if status else "pending",
		"message": "Salon setup marked complete" if status else "Review checklist and finish setup",
	}
