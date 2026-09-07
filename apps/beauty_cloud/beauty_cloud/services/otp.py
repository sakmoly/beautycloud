# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import hashlib
import secrets

import frappe
from frappe import _
from frappe.utils import add_to_date, now_datetime

from beauty_cloud.services.customer_identity import normalize_email, normalize_mobile


def request_otp(
	mobile: str | None = None,
	email: str | None = None,
	purpose: str = "Booking",
	channel: str | None = None,
) -> dict:
	mobile = normalize_mobile(mobile)
	email = normalize_email(email) if email else ""

	if not mobile and not email:
		frappe.throw(_("Mobile number or email is required"))

	settings = frappe.get_single("Beauty Cloud Settings")
	channel = _resolve_channel(channel, mobile, email)
	_check_rate_limit(mobile=mobile or None, email=email or None)

	otp = _generate_otp()
	doc = frappe.get_doc(
		{
			"doctype": "Beauty Cloud OTP Request",
			"mobile": mobile or None,
			"email": email or None,
			"channel": channel,
			"purpose": purpose,
			"status": "Pending",
			"expires_at": add_to_date(now_datetime(), minutes=settings.get("otp_expiry_minutes") or 10),
			"attempt_count": 0,
		}
	)
	doc.insert(ignore_permissions=True)
	doc.db_set("otp_hash", _hash_otp(otp, doc.name))

	sms_sent = False
	email_sent = False

	if channel in ("SMS", "Both") and mobile and settings.enable_sms:
		_send_sms(mobile, otp)
		sms_sent = True

	if channel in ("Email", "Both") and email and settings.get("enable_email_otp", 1):
		email_sent = _send_otp_email(email, otp, purpose)

	response = {
		"request_id": doc.name,
		"mobile": mobile or None,
		"email": email or None,
		"channel": channel,
		"expires_at": doc.expires_at,
		"sms_enabled": bool(settings.enable_sms),
		"email_enabled": bool(settings.get("enable_email_otp", 1)),
		"message": _("OTP sent successfully"),
	}

	if not sms_sent and not email_sent:
		response["message"] = _("OTP generated")
		response["dev_otp"] = otp

	return response


def verify_otp(
	otp: str,
	mobile: str | None = None,
	email: str | None = None,
	request_id: str | None = None,
) -> dict:
	mobile = normalize_mobile(mobile)
	email = normalize_email(email) if email else ""

	if not mobile and not email:
		frappe.throw(_("Mobile number or email is required"))

	settings = frappe.get_single("Beauty Cloud Settings")
	filters: dict = {"status": "Pending"}
	if request_id:
		filters["name"] = request_id
	else:
		if mobile:
			filters["mobile"] = mobile
		elif email:
			filters["email"] = email

	doc = frappe.get_doc("Beauty Cloud OTP Request", filters)

	if mobile and doc.mobile and doc.mobile != mobile:
		frappe.throw(_("OTP request does not match this mobile number"))
	if email and doc.email and doc.email != email:
		frappe.throw(_("OTP request does not match this email address"))

	if doc.expires_at and now_datetime() > doc.expires_at:
		doc.db_set("status", "Expired")
		frappe.throw(_("OTP has expired"))

	if doc.attempt_count >= (settings.get("otp_max_attempts") or 5):
		doc.db_set("status", "Blocked")
		frappe.throw(_("Maximum OTP attempts exceeded"))

	doc.db_set("attempt_count", doc.attempt_count + 1)
	if not _verify_hash(otp, doc.name, doc.otp_hash):
		frappe.throw(_("Invalid OTP"))

	token = secrets.token_urlsafe(32)
	doc.db_set(
		{
			"status": "Verified",
			"verified_at": now_datetime(),
			"verification_token": token,
		}
	)

	return {
		"verification_token": token,
		"mobile": doc.mobile or mobile or None,
		"email": doc.email or email or None,
		"expires_at": add_to_date(now_datetime(), minutes=30),
	}


def validate_verification_token(
	token: str,
	mobile: str | None = None,
	email: str | None = None,
) -> None:
	mobile = normalize_mobile(mobile)
	email = normalize_email(email) if email else ""

	if not token:
		frappe.throw(_("OTP verification is required before booking"))

	doc_name = frappe.db.get_value(
		"Beauty Cloud OTP Request",
		{"verification_token": token, "status": "Verified"},
		"name",
	)
	if not doc_name:
		frappe.throw(_("OTP verification is required before booking"))

	doc = frappe.get_doc("Beauty Cloud OTP Request", doc_name)
	if mobile and doc.mobile and doc.mobile != mobile:
		frappe.throw(_("OTP verification is required before booking"))
	if email and doc.email and doc.email != email:
		frappe.throw(_("OTP verification is required before booking"))


def _resolve_channel(channel: str | None, mobile: str, email: str) -> str:
	channel = (channel or "").strip()
	if channel in ("SMS", "Email", "Both"):
		return channel
	if mobile and email:
		return "Both"
	if email:
		return "Email"
	return "SMS"


def _generate_otp() -> str:
	return f"{secrets.randbelow(900000) + 100000:06d}"


def _hash_otp(otp: str, request_id: str) -> str:
	payload = f"{request_id}:{otp}:{frappe.local.site}"
	return hashlib.sha256(payload.encode()).hexdigest()


def _verify_hash(otp: str, request_id: str, stored_hash: str) -> bool:
	return secrets.compare_digest(_hash_otp(otp, request_id), stored_hash or "")


def _check_rate_limit(mobile: str | None = None, email: str | None = None):
	cutoff = add_to_date(now_datetime(), minutes=-15)
	if mobile:
		recent = frappe.db.count(
			"Beauty Cloud OTP Request",
			{"mobile": mobile, "creation": (">", cutoff)},
		)
		if recent >= 5:
			frappe.throw(_("Too many OTP requests. Please try again later."))
	if email:
		recent = frappe.db.count(
			"Beauty Cloud OTP Request",
			{"email": email, "creation": (">", cutoff)},
		)
		if recent >= 5:
			frappe.throw(_("Too many OTP requests. Please try again later."))


def _send_sms(mobile: str, otp: str):
	frappe.logger("beauty_cloud").info("SMS OTP to %s: %s", mobile, otp)


def _send_otp_email(email: str, otp: str, purpose: str) -> bool:
	subject = _("Your Beauty Cloud verification code")
	message = f"""
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;">
  <h2 style="color:#b76e79;">Verification code</h2>
  <p>Use this code to {purpose.lower()} with Beauty Cloud:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:0.25em;margin:24px 0;">{otp}</p>
  <p style="color:#666;font-size:14px;">This code expires in a few minutes. Do not share it with anyone.</p>
</div>
"""
	try:
		frappe.sendmail(
			recipients=[email],
			subject=subject,
			message=message,
			delayed=False,
		)
		return True
	except Exception:
		frappe.logger("beauty_cloud").info("Email OTP to %s: %s", email, otp)
		return False
