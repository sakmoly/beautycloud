# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import hashlib
import hmac

import frappe
from frappe import _

QR_PREFIX = "BCAPT"


def require_qr_for_check_in() -> bool:
	return bool(frappe.db.get_single_value("Beauty Cloud Settings", "require_qr_for_check_in"))


def require_id_for_check_in() -> bool:
	return bool(frappe.db.get_single_value("Beauty Cloud Settings", "require_id_for_check_in"))


def get_check_in_settings() -> dict:
	return {
		"require_qr_for_check_in": require_qr_for_check_in(),
		"require_id_for_check_in": require_id_for_check_in(),
	}


def _signing_secret() -> str:
	settings = frappe.get_single("Beauty Cloud Settings")
	custom = getattr(settings, "check_in_qr_secret", None)
	if custom:
		return str(custom)
	return (
		frappe.local.conf.get("encryption_key")
		or frappe.get_site_config().get("secret")
		or f"beauty-cloud-checkin-{frappe.local.site}"
	)


def generate_check_in_token(appointment: str) -> str:
	digest = hmac.new(
		_signing_secret().encode(),
		appointment.encode(),
		hashlib.sha256,
	).hexdigest()
	return digest[:16].upper()


def build_check_in_qr_text(appointment: str) -> str:
	return f"{QR_PREFIX}|{appointment}|{generate_check_in_token(appointment)}"


def parse_check_in_qr_text(qr_text: str) -> tuple[str, str] | None:
	text = (qr_text or "").strip()
	if not text:
		return None

	if text.startswith("{"):
		try:
			import json

			payload = json.loads(text)
			appointment = payload.get("appointment") or payload.get("name")
			token = payload.get("token") or payload.get("check_in_token") or ""
			if appointment:
				return appointment, token
		except Exception:
			return None

	parts = text.split("|")
	if len(parts) == 3 and parts[0] == QR_PREFIX:
		return parts[1].strip(), parts[2].strip()

	if frappe.db.exists("Beauty Appointment", text):
		return text, ""

	return None


def verify_check_in_token(appointment: str, token: str | None) -> bool:
	if not token:
		return False
	expected = generate_check_in_token(appointment)
	return hmac.compare_digest(expected, token.strip().upper())


def assert_check_in_token(appointment: str, token: str | None) -> None:
	if not require_qr_for_check_in():
		return
	if not verify_check_in_token(appointment, token):
		frappe.throw(
			_("Scan the customer's appointment QR code to verify before check-in."),
			title=_("QR Verification Required"),
		)


def assert_check_in_id(appointment: str, check_in_id: str | None) -> None:
	if not require_id_for_check_in():
		return

	entered = (check_in_id or "").strip().upper()
	expected = (appointment or "").strip().upper()
	if not entered:
		frappe.throw(
			_("Enter the guest's appointment ID to verify before check-in."),
			title=_("Appointment ID Required"),
		)
	if entered != expected:
		frappe.throw(
			_("Appointment ID {0} does not match this booking ({1}).").format(entered, appointment),
			title=_("Appointment ID Mismatch"),
		)
	if not frappe.db.exists("Beauty Appointment", appointment):
		frappe.throw(_("Appointment {0} not found").format(appointment))


def assert_check_in_verification(
	appointment: str,
	check_in_token: str | None = None,
	check_in_id: str | None = None,
) -> None:
	"""Require QR or ID validation per settings — never allow blind check-in."""
	qr_required = require_qr_for_check_in()
	id_required = require_id_for_check_in()

	if not qr_required and not id_required:
		frappe.throw(
			_("Enable appointment QR or ID validation in Beauty Cloud Settings before check-in."),
			title=_("Check-in Verification Required"),
		)

	if qr_required:
		assert_check_in_token(appointment, check_in_token)
	elif id_required:
		assert_check_in_id(appointment, check_in_id)


def get_check_in_qr_payload(appointment: str) -> dict:
	if not frappe.db.exists("Beauty Appointment", appointment):
		frappe.throw(_("Appointment {0} not found").format(appointment))

	qr_text = build_check_in_qr_text(appointment)
	return {
		"appointment": appointment,
		"qr_text": qr_text,
		"token": generate_check_in_token(appointment),
	}


def resolve_check_in_qr(qr_text: str) -> dict:
	parsed = parse_check_in_qr_text(qr_text)
	if not parsed:
		frappe.throw(_("Unrecognized appointment QR code"))

	appointment, token = parsed
	if require_qr_for_check_in() and not verify_check_in_token(appointment, token):
		frappe.throw(_("Invalid check-in QR code for this appointment"))

	doc = frappe.get_doc("Beauty Appointment", appointment)
	service = doc.services[0] if doc.services else None
	return {
		"appointment": doc.name,
		"customer_name": doc.customer_name,
		"appointment_date": str(doc.appointment_date),
		"scheduled_start": str(doc.scheduled_start) if doc.scheduled_start else None,
		"status": doc.status,
		"payment_status": doc.payment_status,
		"service_name": service.service_name if service else None,
		"employee_name": service.employee_name if service else None,
		"qr_verified": bool(token and verify_check_in_token(appointment, token)),
		"token": token if verify_check_in_token(appointment, token) else None,
	}
