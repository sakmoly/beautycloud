# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class CommissionRule(Document):
	def validate(self):
		if self.rate_or_amount is not None and self.rate_or_amount < 0:
			frappe.throw(_("Rate / Amount cannot be negative"))

		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company and branch_company != self.company:
				frappe.throw(_("Branch must belong to company {0}").format(self.company))
