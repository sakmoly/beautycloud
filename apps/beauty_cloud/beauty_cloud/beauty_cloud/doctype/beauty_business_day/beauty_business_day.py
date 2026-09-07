# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class BeautyBusinessDay(Document):
	def validate(self):
		if self.beauty_branch and self.business_date:
			duplicate = frappe.db.exists(
				"Beauty Business Day",
				{
					"beauty_branch": self.beauty_branch,
					"business_date": getdate(self.business_date),
					"name": ("!=", self.name),
				},
			)
			if duplicate:
				frappe.throw(
					_("Business day {0} already exists for branch {1}").format(
						self.business_date, self.beauty_branch
					)
				)
