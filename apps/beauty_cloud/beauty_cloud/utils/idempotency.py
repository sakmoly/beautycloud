# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import functools

import frappe


def idempotent(action: str):
	def decorator(fn):
		@functools.wraps(fn)
		def wrapper(*args, **kwargs):
			key = frappe.get_request_header("X-Idempotency-Key") or frappe.form_dict.get("idempotency_key")
			if key:
				from beauty_cloud.services.audit import get_idempotent_response, store_idempotent_response

				cached = get_idempotent_response(key)
				if cached is not None:
					return cached
				result = fn(*args, **kwargs)
				store_idempotent_response(key, result, action=action, api_method=frappe.form_dict.get("cmd"))
				return result
			return fn(*args, **kwargs)

		return wrapper

	return decorator
