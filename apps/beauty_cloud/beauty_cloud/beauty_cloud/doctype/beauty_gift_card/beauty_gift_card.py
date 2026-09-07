# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class BeautyGiftCard(Document):
	def validate(self):
		if flt(self.balance) < 0:
			frappe.throw(_("Gift card balance cannot be negative"))
		if self.initial_amount and not self.balance:
			self.balance = self.initial_amount
