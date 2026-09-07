# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.commission import (
	calculate_commission,
	get_commission_ledger,
	preview_commission,
)


@frappe.whitelist()
def preview(appointment_name: str, service_row: int | None = None):
	return preview_commission(appointment_name, int(service_row) if service_row else None)


@frappe.whitelist()
def calculate(appointment_name: str, service_row: int):
	return calculate_commission(appointment_name, int(service_row))


@frappe.whitelist()
def ledger(employee: str | None = None, company: str | None = None, limit: int = 50):
	return get_commission_ledger(employee=employee, company=company, limit=limit)
