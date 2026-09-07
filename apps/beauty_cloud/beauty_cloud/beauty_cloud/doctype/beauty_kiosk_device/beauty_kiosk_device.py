# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyKioskDevice(Document):
	def validate(self):
		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company and self.company and branch_company != self.company:
				frappe.throw(_("Branch must belong to company {0}").format(self.company))

	def before_insert(self):
		if not self.get_password("api_key", raise_exception=False):
			import secrets

			self.api_key = secrets.token_urlsafe(32)
