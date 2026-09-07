# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, today


class BeautyConsultation(Document):
	def validate(self):
		if not self.consultation_date:
			self.consultation_date = getdate(today())

		for row in self.items or []:
			if row.beauty_service and not row.service_name:
				row.service_name = frappe.db.get_value("Beauty Service", row.beauty_service, "service_name")
			if row.item and not row.item_name:
				row.item_name = frappe.db.get_value("Item", row.item, "item_name")
			if row.rate and row.qty:
				row.amount = flt(row.rate) * flt(row.qty)

		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company and branch_company != self.company:
				frappe.throw(_("Branch must belong to company {0}").format(self.company))
