# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, today


class BeautyPOSTransaction(Document):
	def validate(self):
		if not self.items:
			frappe.throw(_("At least one line item is required"))

		if not self.posting_date:
			self.posting_date = getdate(today())

		total = 0
		for row in self.items:
			row.amount = flt(row.qty) * flt(row.rate) - flt(row.discount_amount)
			total += row.amount
		self.grand_total = total

		paid = sum(flt(row.amount) for row in self.payments or [])
		self.paid_amount = paid
		self.outstanding_amount = max(flt(self.grand_total) - paid, 0)
		if paid > flt(self.grand_total):
			self.change_amount = paid - flt(self.grand_total)
