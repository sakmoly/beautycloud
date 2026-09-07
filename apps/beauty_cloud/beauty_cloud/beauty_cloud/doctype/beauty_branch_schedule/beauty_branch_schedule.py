# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyBranchSchedule(Document):
	def validate(self):
		if not self.hours:
			frappe.throw(_("At least one opening-hours row is required"))

		weekdays = [row.weekday for row in self.hours]
		if len(weekdays) != len(set(weekdays)):
			frappe.throw(_("Duplicate weekday rows are not allowed"))
