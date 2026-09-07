# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class BeautyProductRecommendation(Document):
	def validate(self):
		if not self.items:
			frappe.throw(_("At least one recommended product is required"))

		total = 0
		for row in self.items:
			if not row.rate:
				row.rate = _get_item_selling_rate(row.item, self.company)
			row.amount = flt(row.rate) * flt(row.qty)
			total += row.amount
		self.total_amount = total


def _get_item_selling_rate(item_code: str, company: str) -> float:
	price = frappe.db.get_value(
		"Item Price",
		{"item_code": item_code, "selling": 1},
		"price_list_rate",
	)
	if price:
		return flt(price)
	return flt(frappe.db.get_value("Item", item_code, "standard_rate"))
