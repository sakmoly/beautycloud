# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import json


def parse_payload(data=None, **kwargs) -> dict:
	"""Normalize Frappe form/json payloads for whitelisted `data` endpoints."""
	if data is None:
		payload = dict(kwargs)
	elif isinstance(data, str):
		try:
			parsed = json.loads(data)
			payload = parsed if isinstance(parsed, dict) else {"data": parsed}
		except json.JSONDecodeError:
			payload = {"data": data}
	elif isinstance(data, dict):
		payload = data
	else:
		payload = dict(kwargs)

	return _coerce_json_fields(payload)


def _coerce_json_fields(payload: dict) -> dict:
	"""Parse JSON object/array strings sent via form-urlencoded bodies."""
	result = dict(payload)
	for key, value in list(result.items()):
		if not isinstance(value, str):
			continue
		trimmed = value.strip()
		if not trimmed or trimmed[0] not in "[{":
			continue
		try:
			result[key] = json.loads(trimmed)
		except json.JSONDecodeError:
			continue
	return result
