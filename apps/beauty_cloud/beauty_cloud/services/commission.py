# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe.utils import flt, getdate


def preview_commission(appointment_name: str, service_row: int | None = None) -> list[dict]:
	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	appt.check_permission("read")
	rows = appt.services if service_row is None else [r for r in appt.services if r.idx == int(service_row)]
	return [_preview_line(appt, row) for row in rows]


def calculate_commission(appointment_name: str, service_row: int) -> dict:
	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	appt.check_permission("write")
	row = next((r for r in appt.services if r.idx == int(service_row)), None)
	if not row:
		frappe.throw("Service row not found")

	if row.commission_status == "Posted":
		frappe.throw("Commission already posted for this line")

	preview = _preview_line(appt, row)
	if not preview.get("commission_amount"):
		frappe.throw("No commission amount calculated")

	ledger = frappe.get_doc(
		{
			"doctype": "Commission Ledger",
			"naming_series": "CLED-.YYYY.-",
			"company": appt.company,
			"employee": row.employee,
			"commission_rule": preview.get("commission_rule"),
			"source_doctype": "Beauty Appointment",
			"source_name": appt.name,
			"source_row": row.idx,
			"basis_amount": preview.get("basis_amount"),
			"material_cost": preview.get("material_cost"),
			"commission_rate": preview.get("commission_rate"),
			"commission_amount": preview.get("commission_amount"),
			"status": "Posted",
		}
	)
	ledger.insert(ignore_permissions=True)
	row.db_set("commission_status", "Posted")
	return ledger.as_dict()


def get_commission_ledger(employee: str | None = None, company: str | None = None, limit: int = 50):
	settings = frappe.get_single("Beauty Cloud Settings")
	filters = {"company": company or settings.company, "status": "Posted"}
	if employee:
		filters["employee"] = employee

	return frappe.get_all(
		"Commission Ledger",
		filters=filters,
		fields=[
			"name",
			"employee",
			"employee_name",
			"source_name",
			"source_row",
			"basis_amount",
			"material_cost",
			"commission_rate",
			"commission_amount",
			"status",
			"creation",
		],
		order_by="creation desc",
		limit_page_length=int(limit),
	)


def _preview_line(appt, row) -> dict:
	material_cost = _get_material_cost(appt.name, row.idx)
	net_amount = flt(row.amount) - flt(row.discount_amount)
	rule = _resolve_commission_rule(appt, row)
	if not rule:
		return {
			"appointment": appt.name,
			"service_row": row.idx,
			"employee": row.employee,
			"basis_amount": net_amount,
			"material_cost": material_cost,
			"commission_rate": 0,
			"commission_amount": 0,
			"commission_rule": None,
			"commission_method": None,
		}

	basis, amount = _calculate_amount(rule, net_amount, material_cost)
	return {
		"appointment": appt.name,
		"service_row": row.idx,
		"employee": row.employee,
		"basis_amount": basis,
		"material_cost": material_cost,
		"commission_rate": rule.rate_or_amount,
		"commission_amount": amount,
		"commission_rule": rule.name,
		"commission_method": rule.commission_method,
	}


def _resolve_commission_rule(appt, row):
	filters = {
		"company": appt.company,
		"is_active": 1,
	}
	candidates = frappe.get_all(
		"Commission Rule",
		filters=filters,
		fields=[
			"name",
			"beauty_branch",
			"employee",
			"beauty_service",
			"service_category",
			"commission_method",
			"rate_or_amount",
			"effective_from",
			"effective_to",
		],
	)
	service_category = frappe.db.get_value("Beauty Service", row.beauty_service, "service_category")
	appointment_date = getdate(appt.appointment_date)
	scored = []
	for rule in candidates:
		score = 0
		if rule.beauty_branch and rule.beauty_branch != appt.beauty_branch:
			continue
		if rule.beauty_branch == appt.beauty_branch:
			score += 8
		if rule.employee and rule.employee != row.employee:
			continue
		if rule.employee == row.employee:
			score += 4
		if rule.beauty_service and rule.beauty_service != row.beauty_service:
			continue
		if rule.beauty_service == row.beauty_service:
			score += 2
		if rule.service_category and rule.service_category != service_category:
			continue
		if rule.service_category == service_category:
			score += 1
		if rule.effective_from and appointment_date < getdate(rule.effective_from):
			continue
		if rule.effective_to and appointment_date > getdate(rule.effective_to):
			continue
		scored.append((score, rule))

	if not scored:
		return None

	scored.sort(key=lambda item: item[0], reverse=True)
	return scored[0][1]


def _calculate_amount(rule, net_amount: float, material_cost: float) -> tuple[float, float]:
	method = rule.commission_method
	rate = flt(rule.rate_or_amount)
	if method == "Fixed Amount":
		return net_amount, rate
	if method == "Percentage of Gross":
		return net_amount, net_amount * rate / 100
	if method == "Percentage of Net After Discount":
		return net_amount, net_amount * rate / 100
	if method == "Percentage of Net After Material Cost":
		basis = max(net_amount - material_cost, 0)
		return basis, basis * rate / 100
	return net_amount, 0


def _get_material_cost(appointment_name: str, service_row: int) -> float:
	return flt(
		frappe.db.get_value(
			"Service Consumption",
			{
				"beauty_appointment": appointment_name,
				"appointment_service_row": service_row,
				"status": "Submitted",
			},
			"total_material_cost",
		)
	)
