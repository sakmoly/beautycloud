# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyServiceRecipe(Document):
	def validate(self):
		if not self.items:
			frappe.throw(_("At least one recipe item is required"))

		service_company = frappe.db.get_value("Beauty Service", self.beauty_service, "company")
		if service_company and self.company and service_company != self.company:
			frappe.throw(_("Recipe company must match the beauty service company"))
