# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class EmployeeServiceSkill(Document):
	def validate(self):
		employee_company = frappe.db.get_value("Employee", self.employee, "company")
		if employee_company and employee_company != self.company:
			frappe.throw(_("Employee must belong to company {0}").format(self.company))

		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company != self.company:
				frappe.throw(_("Branch must belong to the same company"))

		service_company = frappe.db.get_value("Beauty Service", self.beauty_service, "company")
		if service_company and service_company != self.company:
			frappe.throw(_("Beauty service must belong to the same company"))
