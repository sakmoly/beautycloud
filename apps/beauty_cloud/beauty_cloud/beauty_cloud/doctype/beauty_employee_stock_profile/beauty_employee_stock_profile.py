# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyEmployeeStockProfile(Document):
	def validate(self):
		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company and branch_company != self.company:
				frappe.throw(_("Branch must belong to company {0}").format(self.company))

		if self.warehouse:
			wh_company = frappe.db.get_value("Warehouse", self.warehouse, "company")
			if wh_company and wh_company != self.company:
				frappe.throw(_("Warehouse must belong to company {0}").format(self.company))
