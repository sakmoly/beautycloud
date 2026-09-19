# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.utils.files import public_file_url


def get_public_service_catalog(
	parent_category: str | None = None,
	company: str | None = None,
	online_only: bool = True,
	kiosk_only: bool = False,
) -> dict:
	"""Tree-aware catalog for public web: groups → subcategories → services."""
	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	breadcrumb: list[dict] = []

	if parent_category:
		if not frappe.db.exists("Beauty Service Category", parent_category):
			frappe.throw(frappe._("Category not found"), frappe.DoesNotExistError)
		parent_doc = frappe.get_doc("Beauty Service Category", parent_category)
		if parent_doc.company != company:
			frappe.throw(frappe._("Category not found"), frappe.DoesNotExistError)
		breadcrumb = _build_breadcrumb(parent_category)

		if parent_doc.is_group:
			categories = _fetch_child_categories(company, parent_category, online_only, kiosk_only)
			return {
				"parent": _serialize_category(parent_doc, online_only, kiosk_only),
				"categories": categories,
				"services": [],
				"breadcrumb": breadcrumb,
				"level": "category",
			}

		services = _fetch_services(company, parent_category, online_only, kiosk_only)
		return {
			"parent": _serialize_category(parent_doc, online_only, kiosk_only),
			"categories": [],
			"services": services,
			"breadcrumb": breadcrumb,
			"level": "services",
		}

	categories = _fetch_root_categories(company, online_only, kiosk_only)
	return {
		"parent": None,
		"categories": categories,
		"services": [],
		"breadcrumb": [],
		"level": "root",
	}


def _fetch_root_categories(
	company: str,
	online_only: bool = True,
	kiosk_only: bool = False,
) -> list[dict]:
	rows = frappe.get_all(
		"Beauty Service Category",
		filters={
			"company": company,
			"is_active": 1,
			"parent_beauty_service_category": ("is", "not set"),
		},
		fields=[
			"name",
			"category_name",
			"category_name_ar",
			"is_group",
			"sort_order",
			"image",
		],
		order_by="sort_order asc, category_name asc",
	)
	if rows:
		return [_serialize_category_row(row, online_only, kiosk_only) for row in rows]

	# Legacy flat install: expose leaf categories at root.
	leaf_rows = frappe.get_all(
		"Beauty Service Category",
		filters={"company": company, "is_active": 1, "is_group": 0},
		fields=[
			"name",
			"category_name",
			"category_name_ar",
			"is_group",
			"sort_order",
			"image",
		],
		order_by="sort_order asc, category_name asc",
	)
	return [_serialize_category_row(row, online_only, kiosk_only) for row in leaf_rows]


def _fetch_child_categories(
	company: str,
	parent: str,
	online_only: bool = True,
	kiosk_only: bool = False,
) -> list[dict]:
	rows = frappe.get_all(
		"Beauty Service Category",
		filters={
			"company": company,
			"is_active": 1,
			"parent_beauty_service_category": parent,
		},
		fields=[
			"name",
			"category_name",
			"category_name_ar",
			"is_group",
			"sort_order",
			"image",
		],
		order_by="sort_order asc, category_name asc",
	)
	return [_serialize_category_row(row, online_only, kiosk_only) for row in rows]


def _fetch_services(
	company: str,
	category: str,
	online_only: bool,
	kiosk_only: bool = False,
) -> list[dict]:
	filters = {"company": company, "is_active": 1, "service_category": category}
	if kiosk_only:
		filters["kiosk_enabled"] = 1
	elif online_only:
		filters["online_booking_enabled"] = 1

	rows = frappe.get_all(
		"Beauty Service",
		filters=filters,
		fields=[
			"name",
			"service_code",
			"service_name",
			"service_name_ar",
			"service_category",
			"default_duration",
			"standard_selling_price",
			"description",
			"allow_salon",
			"allow_home",
			"allow_hotel",
			"image",
		],
		order_by="service_name asc",
	)
	return [_serialize_service_row(row) for row in rows]


def _serialize_service_row(row) -> dict:
	data = dict(row)
	data["image"] = public_file_url(data.get("image"))
	return data


def _serialize_category(
	doc,
	online_only: bool = True,
	kiosk_only: bool = False,
) -> dict:
	return _serialize_category_row(
		{
			"name": doc.name,
			"category_name": doc.category_name,
			"category_name_ar": doc.category_name_ar,
			"is_group": doc.is_group,
			"sort_order": doc.sort_order,
			"image": doc.image,
		},
		online_only,
		kiosk_only,
	)


def _category_value(row, field: str):
	if isinstance(row, dict):
		return row.get(field)
	return getattr(row, field, None)


def _serialize_category_row(
	row,
	online_only: bool = True,
	kiosk_only: bool = False,
) -> dict:
	name = _category_value(row, "name")
	is_group = bool(_category_value(row, "is_group"))
	child_count = frappe.db.count(
		"Beauty Service Category",
		{"parent_beauty_service_category": name, "is_active": 1},
	)
	service_count = 0
	if not is_group:
		service_filters = {"service_category": name, "is_active": 1}
		if kiosk_only:
			service_filters["kiosk_enabled"] = 1
		elif online_only:
			service_filters["online_booking_enabled"] = 1
		service_count = frappe.db.count("Beauty Service", service_filters)
	return {
		"name": name,
		"label": _category_value(row, "category_name"),
		"label_ar": _category_value(row, "category_name_ar"),
		"is_group": is_group,
		"sort_order": _category_value(row, "sort_order") or 0,
		"image": public_file_url(_category_value(row, "image")),
		"child_count": child_count,
		"service_count": service_count,
	}


def _build_breadcrumb(category: str) -> list[dict]:
	trail: list[dict] = []
	current = category
	while current:
		row = frappe.db.get_value(
			"Beauty Service Category",
			current,
			["name", "category_name", "parent_beauty_service_category"],
			as_dict=True,
		)
		if not row:
			break
		trail.append({"name": row.name, "label": row.category_name})
		current = row.parent_beauty_service_category
	trail.reverse()
	return trail
