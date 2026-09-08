# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe.model.document import Document


class BeautyWebPage(Document):
	def validate(self):
		self._validate_single_home_page()
		if self.published and self.page_template == "Salon Landing":
			self._validate_salon_landing()

	def _validate_single_home_page(self):
		if not self.is_home_page:
			return
		existing = frappe.db.get_value(
			"Beauty Web Page",
			{
				"company": self.company,
				"is_home_page": 1,
				"name": ("!=", self.name),
			},
			"name",
		)
		if existing:
			frappe.throw(
				frappe._("Only one home page is allowed per company. Existing: {0}").format(existing)
			)

	def _validate_salon_landing(self):
		section_types = {row.section_type for row in self.get("sections") or []}
		if not section_types.intersection({"Hero", "Book CTA", "CTA"}):
			frappe.throw(
				frappe._("Salon Landing pages must include a Hero or Book CTA section before publishing.")
			)
