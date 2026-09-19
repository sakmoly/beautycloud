# Copyright (c) 2026, Beauty Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyCloudSettings(Document):
	def validate(self):
		if not self.enable_sms:
			self.sms_note = "SMS OTP is disabled. Customer booking can use email or staff-assisted registration until SMS is configured."
		else:
			self.sms_note = "SMS OTP enabled — configure SMS provider integration before production use."

		if (self.require_payment_at_booking or self.require_payment_at_kiosk) and not self.enable_telr:
			frappe.throw(_("Enable Telr Payment Gateway when payment at booking or kiosk is required."))

		if self.enable_telr and not self.telr_demo_mode:
			store_id = (self.telr_store_id or "").strip()
			if not store_id or store_id in {"1234", "0000"}:
				frappe.throw(
					_(
						"Telr Store ID {0} is a demo placeholder. Enter the real Store ID from "
						"your Telr merchant dashboard, or enable Telr Demo Mode."
					).format(store_id or _("(empty)"))
				)

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

		if self.auto_cancel_unpaid_draft_bookings:
			minutes = int(self.unpaid_draft_hold_minutes or 0)
			if minutes < 1:
				frappe.throw(_("Unpaid Draft Hold must be at least 1 minute when auto-cancel is enabled."))
			if minutes > 480:
				frappe.throw(_("Unpaid Draft Hold cannot exceed 480 minutes (8 hours)."))
			self.unpaid_draft_note = (
				f"Unpaid Online/Kiosk draft bookings are cancelled after {minutes} minutes "
				"and their time slots are released automatically."
			)
		else:
			self.unpaid_draft_note = (
				"Unpaid draft bookings stay on the schedule until reception cancels them manually."
			)

		from beauty_cloud.services.hr_schedule import hrms_available

		if self.enable_hr_schedule and hrms_available():
			mode = self.hr_schedule_mode or "HR Primary"
			if self.auto_sync_hr_shifts:
				horizon = int(self.hr_sync_days_ahead or 90)
				self.hr_schedule_note = (
					f"Booking uses Frappe HR with mode '{mode}'. "
					f"Beauty Employee Schedule changes auto-sync to HR shifts for the next {horizon} days."
				)
			else:
				self.hr_schedule_note = (
					f"Booking uses Frappe HR with mode '{mode}'. "
					"Auto-sync is off — run manual HR shift sync after changing weekly beautician hours."
				)
		elif self.enable_hr_schedule:
			self.hr_schedule_note = "Frappe HR is not installed on this site — install the hrms app to activate this integration."
		else:
			self.hr_schedule_note = "HR schedule integration is disabled — booking uses Beauty Employee Schedule only."

		if not self.require_qr_for_check_in and not self.require_id_for_check_in:
			frappe.throw(
				_("Enable either Require QR Scan for Check-in or Require Appointment ID for Check-in.")
			)


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
