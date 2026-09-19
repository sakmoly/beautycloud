# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import json
import secrets

import frappe
import requests
from frappe import _
from frappe.utils import cint, flt, now_datetime

TELR_ORDER_URL = "https://secure.telr.com/gateway/order.json"
TELR_AUTHORISED = 3


def get_booking_payment_settings() -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	currency = settings.telr_currency or _company_currency(settings.company)
	return {
		"require_payment_at_booking": bool(settings.require_payment_at_booking),
		"booking_payment_type": settings.booking_payment_type or "Full Amount",
		"booking_deposit_percent": flt(settings.booking_deposit_percent or 50),
		"enable_telr": bool(settings.enable_telr),
		"telr_demo_mode": bool(settings.telr_demo_mode),
		"currency": currency,
	}


def calculate_booking_payment_amount(total_amount: float, payment_type: str, deposit_percent: float) -> float:
	total_amount = flt(total_amount)
	if payment_type == "Deposit Only":
		return flt(total_amount * deposit_percent / 100, 2)
	return total_amount


def create_kiosk_payment(appointment_name: str) -> dict:
	"""Start Telr card payment for a kiosk draft appointment (Mada / Credit Card)."""
	from beauty_cloud.services.payment_gate import get_salon_payment_settings

	if not get_salon_payment_settings()["require_payment_at_kiosk"]:
		frappe.throw(_("Kiosk payment is not enabled"))

	settings = get_booking_payment_settings()
	if not settings["enable_telr"]:
		frappe.throw(_("Telr payment gateway must be enabled for kiosk card payments"))

	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	if appt.source != "Kiosk":
		frappe.throw(_("Invalid appointment source for kiosk payment"))
	if appt.status not in ("Draft",):
		frappe.throw(_("Payment can only be initiated for draft appointments"))

	existing = frappe.db.get_value(
		"Beauty Booking Payment",
		{"beauty_appointment": appointment_name, "status": "Pending"},
		"name",
	)
	if existing:
		return get_payment_session(existing, settings, channel="kiosk")

	amount = flt(appt.total_amount)
	if amount <= 0:
		frappe.throw(_("Payment amount must be greater than zero"))

	cart_id = f"kiosk-{appointment_name}-{secrets.token_hex(4)}"
	demo_token = secrets.token_urlsafe(24) if settings["telr_demo_mode"] else None

	payment = frappe.get_doc(
		{
			"doctype": "Beauty Booking Payment",
			"company": appt.company,
			"beauty_appointment": appt.name,
			"customer": appt.customer,
			"status": "Pending",
			"payment_type": "Full Amount",
			"gateway": "Demo" if settings["telr_demo_mode"] else "Telr",
			"amount": amount,
			"currency": settings["currency"],
			"appointment_total": appt.total_amount,
			"cart_id": cart_id,
			"demo_token": demo_token,
		}
	)
	payment.insert(ignore_permissions=True)
	frappe.db.commit()

	return get_payment_session(payment.name, settings, channel="kiosk")


def create_booking_payment(appointment_name: str) -> dict:
	settings = get_booking_payment_settings()
	if not settings["require_payment_at_booking"]:
		frappe.throw(_("Online booking payment is not required"))

	appt = frappe.get_doc("Beauty Appointment", appointment_name)
	if appt.status not in ("Draft",):
		frappe.throw(_("Payment can only be initiated for draft appointments"))

	existing = frappe.db.get_value(
		"Beauty Booking Payment",
		{"beauty_appointment": appointment_name, "status": "Pending"},
		"name",
	)
	if existing:
		return get_payment_session(existing, settings)

	payment_type = settings["booking_payment_type"]
	amount = calculate_booking_payment_amount(
		appt.total_amount,
		payment_type,
		settings["booking_deposit_percent"],
	)
	if amount <= 0:
		frappe.throw(_("Payment amount must be greater than zero"))

	cart_id = f"{appointment_name}-{secrets.token_hex(4)}"
	demo_token = secrets.token_urlsafe(24) if settings["telr_demo_mode"] else None

	payment = frappe.get_doc(
		{
			"doctype": "Beauty Booking Payment",
			"company": appt.company,
			"beauty_appointment": appt.name,
			"customer": appt.customer,
			"status": "Pending",
			"payment_type": payment_type,
			"gateway": "Demo" if settings["telr_demo_mode"] else "Telr",
			"amount": amount,
			"currency": settings["currency"],
			"appointment_total": appt.total_amount,
			"cart_id": cart_id,
			"demo_token": demo_token,
		}
	)
	payment.insert(ignore_permissions=True)
	frappe.db.commit()

	return get_payment_session(payment.name, settings)


def get_payment_session(
	payment_name: str,
	settings: dict | None = None,
	channel: str = "booking",
) -> dict:
	settings = settings or get_booking_payment_settings()
	payment = frappe.get_doc("Beauty Booking Payment", payment_name)
	appt = frappe.get_doc("Beauty Appointment", payment.beauty_appointment)

	result = {
		"payment_required": True,
		"payment_name": payment.name,
		"appointment": appt.name,
		"amount": payment.amount,
		"currency": payment.currency,
		"payment_type": payment.payment_type,
		"appointment_total": payment.appointment_total,
		"status": payment.status,
		"demo_mode": settings["telr_demo_mode"],
		"gateway": payment.gateway,
	}

	if payment.status == "Paid":
		result["payment_url"] = None
		result["confirmed"] = True
		return result

	if settings["telr_demo_mode"]:
		result["demo_token"] = payment.demo_token
		result["payment_url"] = None
		result["demo_card"] = {
			"number": "4111 1111 1111 1111",
			"expiry": "Any future date",
			"cvv": "123",
		}
		if channel == "kiosk":
			result["payment_label"] = "Mada / Credit Card"
		return result

	if not settings["enable_telr"]:
		frappe.throw(_("Telr payment gateway is not enabled"))

	telr_settings = _get_telr_credentials()
	return_urls = (
		_build_kiosk_return_urls(payment.name)
		if channel == "kiosk"
		else _build_return_urls(payment.name)
	)
	telr_response = create_telr_order(
		store_id=telr_settings["store_id"],
		auth_key=telr_settings["auth_key"],
		cart_id=payment.cart_id,
		amount=payment.amount,
		currency=payment.currency,
		description=f"Beauty booking {appt.name}",
		return_urls=return_urls,
		test_mode=telr_settings["test_mode"],
	)

	order_ref = telr_response.get("order", {}).get("ref")
	payment_url = telr_response.get("order", {}).get("url")
	if not payment_url:
		frappe.log_error(title="Telr create order failed", message=json.dumps(telr_response))
		telr_error = (
			(telr_response.get("error") or {}).get("message")
			or telr_response.get("error")
			or _("Could not start Telr payment session")
		)
		if "Invalid store ID" in str(telr_error):
			frappe.throw(
				_(
					"Telr rejected the Store ID. Use your real Telr merchant Store ID, "
					"or turn Telr Demo Mode on until you have live credentials."
				)
			)
		frappe.throw(_(str(telr_error)))

	payment.db_set(
		{
			"telr_order_ref": order_ref,
			"gateway_response": json.dumps(telr_response, indent=2),
		}
	)
	frappe.db.commit()

	result["payment_url"] = payment_url
	result["telr_order_ref"] = order_ref
	if channel == "kiosk":
		result["payment_label"] = "Mada / Credit Card"
	return result


def complete_demo_payment(payment_name: str, demo_token: str) -> dict:
	settings = get_booking_payment_settings()
	if not settings["telr_demo_mode"]:
		frappe.throw(_("Demo payment is only available in Telr demo mode"))

	payment = frappe.get_doc("Beauty Booking Payment", payment_name)
	if payment.demo_token != demo_token:
		frappe.throw(_("Invalid demo payment token"))
	if payment.status != "Pending":
		return _payment_result(payment)

	payment.db_set(
		{
			"status": "Paid",
			"paid_at": now_datetime(),
			"telr_order_ref": f"DEMO-{payment.name}",
			"telr_status_code": str(TELR_AUTHORISED),
			"gateway_response": json.dumps({"demo": True, "status": "authorised"}),
		}
	)
	_confirm_appointment_after_payment(payment)
	frappe.db.commit()
	return _payment_result(payment)


def handle_telr_return(order_ref: str) -> dict:
	if not order_ref:
		frappe.throw(_("Missing Telr order reference"))

	payment_name = frappe.db.get_value("Beauty Booking Payment", {"telr_order_ref": order_ref}, "name")
	if not payment_name:
		frappe.throw(_("Payment record not found for this Telr order"))

	payment = frappe.get_doc("Beauty Booking Payment", payment_name)
	if payment.status == "Paid":
		return _payment_result(payment)

	telr_settings = _get_telr_credentials()
	verification = verify_telr_order(
		store_id=telr_settings["store_id"],
		auth_key=telr_settings["auth_key"],
		order_ref=order_ref,
	)
	status_code = cint(verification.get("order", {}).get("status", {}).get("code"))
	payment.db_set(
		{
			"telr_status_code": str(status_code),
			"gateway_response": json.dumps(verification, indent=2),
		}
	)

	if status_code == TELR_AUTHORISED:
		payment.db_set({"status": "Paid", "paid_at": now_datetime()})
		_confirm_appointment_after_payment(payment)
	elif status_code in (-1, -2):
		payment.db_set({"status": "Failed" if status_code == -1 else "Cancelled"})
	else:
		payment.db_set({"status": "Failed"})

	frappe.db.commit()
	return _payment_result(payment)


def get_payment_status(payment_name: str) -> dict:
	payment = frappe.get_doc("Beauty Booking Payment", payment_name)
	return _payment_result(payment)


def create_telr_order(
	store_id: str,
	auth_key: str,
	cart_id: str,
	amount: float,
	currency: str,
	description: str,
	return_urls: dict,
	test_mode: bool,
) -> dict:
	payload = {
		"method": "create",
		"store": int(store_id),
		"authkey": auth_key,
		"order": {
			"cartid": cart_id,
			"test": "1" if test_mode else "0",
			"amount": f"{flt(amount, 2):.2f}",
			"currency": currency,
			"description": description[:63],
		},
		"return": {
			"authorised": return_urls["success"],
			"declined": return_urls["failed"],
			"cancelled": return_urls["cancel"],
		},
	}
	response = requests.post(TELR_ORDER_URL, json=payload, timeout=30)
	response.raise_for_status()
	return response.json()


def verify_telr_order(store_id: str, auth_key: str, order_ref: str) -> dict:
	payload = {
		"method": "check",
		"store": int(store_id),
		"authkey": auth_key,
		"order": {"ref": order_ref},
	}
	response = requests.post(TELR_ORDER_URL, json=payload, timeout=30)
	response.raise_for_status()
	return response.json()


def _confirm_appointment_after_payment(payment):
	appt = frappe.get_doc("Beauty Appointment", payment.beauty_appointment)
	appt.status = "Booked"
	if payment.payment_type == "Deposit Only":
		appt.payment_status = "Deposit Paid"
		appt.paid_amount = payment.amount
	else:
		appt.payment_status = "Paid"
		appt.paid_amount = payment.amount
	appt.booking_payment = payment.name
	appt.save(ignore_permissions=True)

	from beauty_cloud.services.booking_notifications import send_booking_confirmation

	frappe.enqueue(
		send_booking_confirmation,
		appointment_name=appt.name,
		queue="short",
		now=True,
	)


def _payment_result(payment) -> dict:
	appt = frappe.get_doc("Beauty Appointment", payment.beauty_appointment)
	return {
		"payment_name": payment.name,
		"appointment": appt.name,
		"status": payment.status,
		"amount": payment.amount,
		"currency": payment.currency,
		"payment_status": appt.payment_status,
		"appointment_status": appt.status,
		"confirmed": payment.status == "Paid" and appt.status == "Booked",
	}


def _get_telr_credentials() -> dict:
	settings = frappe.get_single("Beauty Cloud Settings")
	store_id = (settings.telr_store_id or "").strip()
	auth_key = settings.get_password("telr_auth_key") if settings.telr_auth_key else ""
	if not store_id or not auth_key:
		frappe.throw(_("Telr store ID and auth key are required for live payments"))
	return {
		"store_id": store_id,
		"auth_key": auth_key,
		"test_mode": bool(settings.telr_demo_mode),
	}


def _build_return_urls(payment_name: str) -> dict:
	base = _public_booking_base_url().rstrip("/")
	return {
		"success": f"{base}/book/payment/return?payment={payment_name}",
		"failed": f"{base}/book/payment/return?payment={payment_name}&result=failed",
		"cancel": f"{base}/book/payment/return?payment={payment_name}&result=cancelled",
	}


def _build_kiosk_return_urls(payment_name: str) -> dict:
	base = _public_booking_base_url().rstrip("/")
	return {
		"success": f"{base}/kiosk/payment/return?payment={payment_name}",
		"failed": f"{base}/kiosk/payment/return?payment={payment_name}&result=failed",
		"cancel": f"{base}/kiosk/payment/return?payment={payment_name}&result=cancelled",
	}


def _public_booking_base_url() -> str:
	tenant = frappe.db.get_value(
		"Beauty Cloud Tenant",
		{"status": "Active"},
		"public_url",
	)
	if tenant:
		return tenant.rstrip("/")

	host = (frappe.local.conf.get("host_name") or "").strip().rstrip("/")
	if host:
		return host

	return frappe.utils.get_url().replace("/api", "").rstrip("/")


def _company_currency(company: str) -> str:
	return frappe.db.get_value("Company", company, "default_currency") or "SAR"
