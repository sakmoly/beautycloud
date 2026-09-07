# Copyright (c) 2026, Beauty Cloud and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document

HEX_COLOR = re.compile(r"^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$")


class BeautyCloudBrandingSettings(Document):
	def validate(self):
		for fieldname in (
			"primary_color",
			"secondary_color",
			"accent_color",
			"background_color",
			"surface_color",
			"text_color",
			"muted_text_color",
			"success_color",
			"warning_color",
			"danger_color",
		):
			value = self.get(fieldname)
			if value and not HEX_COLOR.match(value):
				frappe.throw(_("Invalid colour for {0}").format(_(self.meta.get_label(fieldname))))
