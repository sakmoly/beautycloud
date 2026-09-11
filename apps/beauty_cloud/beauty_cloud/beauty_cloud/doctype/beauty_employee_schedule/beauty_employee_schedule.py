# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import time_diff_in_seconds


class BeautyEmployeeSchedule(Document):
	def validate(self):
		if self.start_time and self.end_time:
			if time_diff_in_seconds(self.end_time, self.start_time) <= 0:
				frappe.throw(_("End time must be after start time"))

		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company and branch_company != self.company:
				frappe.throw(_("Branch must belong to company {0}").format(self.company))

	def on_trash(self):
		from beauty_cloud.services.hr_schedule import sync_beauty_employee_schedule

		self.is_active = 0
		sync_beauty_employee_schedule(self)
