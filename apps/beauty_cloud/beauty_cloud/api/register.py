# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.api.utils import parse_payload
from beauty_cloud.services.register_session import (
	authenticate_register,
	close_business_day,
	close_register_session,
	get_pos_session_context,
	list_registers,
	mark_business_day_posted,
	open_business_day,
	open_register_session,
	suggest_business_date,
)


@frappe.whitelist()
def get_context(beauty_branch: str, register_code: str | None = None, register_api_key: str | None = None):
	return get_pos_session_context(beauty_branch, register_code, register_api_key)


@frappe.whitelist()
def suggest_date(beauty_branch: str):
	return {"business_date": suggest_business_date(beauty_branch)}


@frappe.whitelist()
def open_day(beauty_branch: str, business_date: str | None = None, notes: str | None = None):
	return open_business_day(beauty_branch, business_date, notes)


@frappe.whitelist()
def close_day(beauty_branch: str | None = None, name: str | None = None, notes: str | None = None):
	return close_business_day(beauty_branch, name, notes)


@frappe.whitelist()
def mark_posted(name: str):
	return mark_business_day_posted(name)


@frappe.whitelist()
def get_registers(beauty_branch: str):
	return list_registers(beauty_branch)


@frappe.whitelist()
def pair_register(register_code: str, register_api_key: str, beauty_branch: str | None = None):
	return authenticate_register(register_code, register_api_key, beauty_branch)


@frappe.whitelist()
def unpair_register_device(register_code: str, register_api_key: str):
	from beauty_cloud.services.register_session import unpair_register

	return unpair_register(register_code, register_api_key)


@frappe.whitelist()
def open_register(register_code: str, register_api_key: str, opening_float: float = 0):
	return open_register_session(register_code, register_api_key, float(opening_float or 0))


@frappe.whitelist()
def close_register(session: str, closing_cash: float, notes: str | None = None):
	return close_register_session(session, float(closing_cash or 0), notes)


@frappe.whitelist()
def get_pairing_key(name: str):
	from beauty_cloud.beauty_cloud.doctype.beauty_pos_register.beauty_pos_register import get_pairing_key as _get

	return _get(name)


@frappe.whitelist()
def regenerate_pairing_key(name: str):
	from beauty_cloud.beauty_cloud.doctype.beauty_pos_register.beauty_pos_register import (
		regenerate_pairing_key as _regenerate,
	)

	return _regenerate(name)
