# Copyright (c) 2026, Beauty Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class BeautyCloudSettings(Document):
	def validate(self):
		if not self.enable_sms:
			self.sms_note = "SMS OTP is disabled. Customer booking can use email or staff-assisted registration until SMS is configured."
		else:
			self.sms_note = "SMS OTP enabled — configure SMS provider integration before production use."

		if self.require_payment_at_booking and not self.enable_telr:
			frappe.throw(_("Enable Telr Payment Gateway when payment at booking is required."))

		if self.enable_telr and self.telr_demo_mode:
			self.telr_note = (
				"Telr demo mode is ON — booking uses simulated payment (test card 4111…). "
				"No live Telr API calls are made until demo mode is disabled."
			)
		elif self.enable_telr:
			self.telr_note = (
				"Live Telr mode — set Store ID and Auth Key from your Telr merchant dashboard. "
				"Use test flag via demo mode before going live."
			)
		else:
			self.telr_note = "Telr gateway is disabled."


def get_allowed_payment_modes(channel: str | None = None) -> list[str]:
	"""Return enabled Mode of Payment names for an optional channel."""
	settings = frappe.get_single("Beauty Cloud Settings")
	modes: list[str] = []
	channel_field_map = {
		"booking": "allow_in_booking",
		"pos": "allow_in_pos",
		"kiosk": "allow_in_kiosk",
	}
	fieldname = channel_field_map.get(channel or "")

	for row in settings.get("allowed_payment_methods") or []:
		if not row.enabled:
			continue
		if fieldname and not row.get(fieldname):
			continue
		if row.mode_of_payment:
			modes.append(row.mode_of_payment)

	return modes
