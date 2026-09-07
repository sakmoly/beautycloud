# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.otp import request_otp, verify_otp


@frappe.whitelist(allow_guest=True)
def request_customer_otp(
	mobile: str | None = None,
	email: str | None = None,
	purpose: str = "Booking",
	channel: str | None = None,
):
	return request_otp(mobile=mobile, email=email, purpose=purpose, channel=channel)


@frappe.whitelist(allow_guest=True)
def verify_customer_otp(
	otp: str,
	mobile: str | None = None,
	email: str | None = None,
	request_id: str | None = None,
):
	return verify_otp(otp=otp, mobile=mobile, email=email, request_id=request_id)
