# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint


RATE_LIMITED_METHODS = {
	"beauty_cloud.api.otp.request_customer_otp": {"limit": 20, "window_seconds": 300},
	"beauty_cloud.api.booking.create_online_booking": {"limit": 30, "window_seconds": 300},
	"beauty_cloud.api.payment.initiate_payment": {"limit": 30, "window_seconds": 300},
	"beauty_cloud.api.payment.complete_demo_payment_session": {"limit": 30, "window_seconds": 300},
	"beauty_cloud.api.payment.telr_return": {"limit": 60, "window_seconds": 300},
	"beauty_cloud.api.kiosk.book": {"limit": 30, "window_seconds": 300},
	"beauty_cloud.api.pos.checkout_cart": {"limit": 60, "window_seconds": 300},
}

IDEMPOTENT_METHODS = {
	"beauty_cloud.api.pos.checkout_cart",
	"beauty_cloud.api.booking.create_online_booking",
	"beauty_cloud.api.kiosk.book",
}


def before_api_request():
	if frappe.request.method != "POST":
		return

	cmd = frappe.form_dict.get("cmd")
	if not cmd or not str(cmd).startswith("beauty_cloud.api."):
		return

	enforce_rate_limit(str(cmd))


def enforce_rate_limit(api_method: str):
	config = RATE_LIMITED_METHODS.get(api_method)
	if not config:
		return

	identity = _request_identity()
	cache_key = f"beauty_cloud:rate:{api_method}:{identity}"
	count = cint(frappe.cache.get_value(cache_key) or 0)
	if count >= config["limit"]:
		frappe.throw(_("Rate limit exceeded. Please retry later."), frappe.RateLimitExceededError)

	frappe.cache.set_value(cache_key, count + 1, expires_in_sec=config["window_seconds"])


def get_rate_limit_audit() -> dict:
	return {
		"rate_limited_methods": RATE_LIMITED_METHODS,
		"idempotent_methods": sorted(IDEMPOTENT_METHODS),
		"identity_source": "session_user_or_ip",
	}


def _request_identity() -> str:
	if frappe.session.user and frappe.session.user != "Guest":
		return f"user:{frappe.session.user}"
	return f"ip:{getattr(frappe.local, 'request_ip', 'unknown')}"
