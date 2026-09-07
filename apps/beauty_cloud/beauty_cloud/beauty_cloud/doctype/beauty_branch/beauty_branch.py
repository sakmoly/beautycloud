# Copyright (c) 2026, Beauty Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyBranch(Document):
	def validate(self):
		for fieldname in ("retail_warehouse", "consumables_warehouse", "default_warehouse"):
			warehouse = self.get(fieldname)
			if warehouse and frappe.db.get_value("Warehouse", warehouse, "company") != self.company:
				frappe.throw(_("Warehouse {0} must belong to company {1}").format(warehouse, self.company))
