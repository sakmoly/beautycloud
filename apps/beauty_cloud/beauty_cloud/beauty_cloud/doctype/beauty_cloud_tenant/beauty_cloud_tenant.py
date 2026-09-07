# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, today


class BeautyCloudTenant(Document):
	def validate(self):
		if self.subscription_start and self.subscription_end:
			if getdate(self.subscription_end) < getdate(self.subscription_start):
				frappe.throw(_("Subscription end cannot be before start"))

		if self.status in ("Active", "Trial") and self.subscription_end:
			if getdate(self.subscription_end) < getdate(today()):
				frappe.msgprint(_("Subscription end date is in the past"))
