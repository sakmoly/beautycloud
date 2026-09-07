# Copyright (c) 2026, Beauty Cloud and contributors

from datetime import timedelta

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_datetime


class BeautyAppointment(Document):
	def validate(self):
		self._validate_branch_company()
		self._validate_services()
		self._sync_service_lines()
		self._calculate_totals()

	def _validate_branch_company(self):
		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company and branch_company != self.company:
				frappe.throw(_("Branch must belong to company {0}").format(self.company))

	def _validate_services(self):
		if not self.services:
			frappe.throw(_("At least one service line is required"))

		for row in self.services:
			service_company = frappe.db.get_value("Beauty Service", row.beauty_service, "company")
			if service_company and service_company != self.company:
				frappe.throw(_("Service {0} does not belong to this company").format(row.beauty_service))

			if row.employee and not frappe.db.exists(
				"Employee Service Skill",
				{
					"employee": row.employee,
					"beauty_service": row.beauty_service,
					"company": self.company,
					"is_active": 1,
				},
			):
				frappe.msgprint(
					_("Beautician {0} has no active skill for {1}").format(
						row.employee_name or row.employee, row.service_name or row.beauty_service
					),
					indicator="orange",
				)

	def _sync_service_lines(self):
		for row in self.services:
			if not row.rate:
				row.rate = frappe.db.get_value(
					"Beauty Service", row.beauty_service, "standard_selling_price"
				) or 0

			if not row.duration:
				row.duration = frappe.db.get_value(
					"Beauty Service", row.beauty_service, "default_duration"
				) or 0

			if row.start_time and row.duration and not row.end_time:
				row.end_time = get_datetime(row.start_time) + timedelta(minutes=int(row.duration))

			row.amount = flt(row.rate) - flt(row.discount_amount)

			if not row.beauty_service_recipe:
				row.beauty_service_recipe = frappe.db.get_value(
					"Beauty Service Recipe",
					{"beauty_service": row.beauty_service, "is_active": 1},
					"name",
				)

		if self.services:
			starts = [get_datetime(row.start_time) for row in self.services if row.start_time]
			ends = [get_datetime(row.end_time) for row in self.services if row.end_time]
			if starts:
				self.scheduled_start = min(starts)
			if ends:
				self.scheduled_end = max(ends)

	def _calculate_totals(self):
		self.total_amount = sum(flt(row.amount) for row in self.services)

	def on_update(self):
		if self.status == "Cancelled" and self.docstatus == 0:
			for row in self.services:
				if row.status not in ("Cancelled", "Completed"):
					row.status = "Cancelled"
