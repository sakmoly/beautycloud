# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class BeautyInventoryCount(Document):
	def validate(self):
		if not self.items:
			frappe.throw(_("At least one count line is required"))

		for row in self.items:
			if row.system_qty is None:
				row.system_qty = flt(
					frappe.db.get_value(
						"Bin", {"item_code": row.item, "warehouse": self.warehouse}, "actual_qty"
					)
				)
			row.variance_qty = flt(row.physical_qty) - flt(row.system_qty)
			if not row.valuation_rate:
				row.valuation_rate = flt(frappe.db.get_value("Item", row.item, "valuation_rate"))
			row.variance_amount = flt(row.variance_qty) * flt(row.valuation_rate or 0)
