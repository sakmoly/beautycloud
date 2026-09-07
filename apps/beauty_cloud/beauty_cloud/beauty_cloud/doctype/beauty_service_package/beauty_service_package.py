# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyServicePackage(Document):
	def validate(self):
		if not self.items:
			frappe.throw(_("At least one service is required in the package"))
