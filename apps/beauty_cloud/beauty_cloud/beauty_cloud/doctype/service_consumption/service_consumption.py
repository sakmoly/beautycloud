# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class ServiceConsumption(Document):
	def validate(self):
		if not self.items:
			frappe.throw(_("At least one consumption item is required"))

		total = 0
		for row in self.items:
			row.amount = flt(row.actual_qty) * flt(row.valuation_rate or 0)
			total += row.amount
		self.total_material_cost = total

	def before_submit(self):
		if self.status != "Draft":
			frappe.throw(_("Only draft consumption documents can be submitted"))

	def on_submit(self):
		self.status = "Submitted"

	def on_cancel(self):
		self.status = "Cancelled"
