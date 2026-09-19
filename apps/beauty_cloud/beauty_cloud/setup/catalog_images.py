# Copyright (c) 2026, Beauty Cloud and contributors

"""Default salon photos for categories and services (kiosk, booking, POS)."""

from __future__ import annotations

import frappe

from beauty_cloud.utils.files import public_file_url

U = "https://images.unsplash.com"

CATEGORY_IMAGES = {
	"Hair": f"{U}/photo-1562322140-8baeececf3df?w=800&h=800&fit=crop&q=80",
	"Hair Styling": f"{U}/photo-1562322140-8baeececf3df?w=800&h=800&fit=crop&q=80",
	"Hair Coloring": f"{U}/photo-1522337360788-8b13dee7a37e?w=800&h=800&fit=crop&q=80",
	"Hair Treatments": f"{U}/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&q=80",
	"Skin & Facial": f"{U}/photo-1570172619644-dfd03ed5d881?w=800&h=800&fit=crop&q=80",
	"Facials": f"{U}/photo-1570172619644-dfd03ed5d881?w=800&h=800&fit=crop&q=80",
	"Skin Treatments": f"{U}/photo-1616394584738-fc6e612e71b9?w=800&h=800&fit=crop&q=80",
	"Threading & Waxing": f"{U}/photo-1515377905703-c4788e51af15?w=800&h=800&fit=crop&q=80",
	"Nails": f"{U}/photo-1604654894610-df63bc536371?w=800&h=800&fit=crop&q=80",
	"Manicure & Pedicure": f"{U}/photo-1604654894610-df63bc536371?w=800&h=800&fit=crop&q=80",
	"Nail Art": f"{U}/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&q=80",
	"Gel & Extensions": f"{U}/photo-1632345031435-8727f6897d53?w=800&h=800&fit=crop&q=80",
}

SERVICE_IMAGES = {
	"SRV-HAIR-CUT": f"{U}/photo-1723879371709-17908244d70a?w=800&h=800&fit=crop&q=80",
	"SRV-BLOW-DRY": f"{U}/photo-1733685317342-da25a1cdbc0a?w=800&h=800&fit=crop&q=80",
	"SRV-UPDO": f"{U}/photo-1519699047748-de8e457a634e?w=800&h=800&fit=crop&q=80",
	"SRV-ROOT-TOUCH": f"{U}/photo-1560066984-138dadb4c035?w=800&h=800&fit=crop&q=80",
	"SRV-FULL-COLOR": f"{U}/photo-1522337360788-8b13dee7a37e?w=800&h=800&fit=crop&q=80",
	"SRV-HIGHLIGHTS": f"{U}/photo-1492106087820-71f1a00d2b11?w=800&h=800&fit=crop&q=80",
	"SRV-KERATIN": f"{U}/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&q=80",
	"SRV-HAIR-MASK": f"{U}/photo-1562322140-8baeececf3df?w=800&h=800&fit=crop&q=80",
	"SRV-FACIAL": f"{U}/photo-1570172619644-dfd03ed5d881?w=800&h=800&fit=crop&q=80",
	"SRV-ANTI-AGE": f"{U}/photo-1512290923902-8a9f81dc236c?w=800&h=800&fit=crop&q=80",
	"SRV-HYDRA": f"{U}/photo-1487412947147-5cebf100ffc2?w=800&h=800&fit=crop&q=80",
	"SRV-CHEM-PEEL": f"{U}/photo-1616394584738-fc6e612e71b9?w=800&h=800&fit=crop&q=80",
	"SRV-MICRO": f"{U}/photo-1540555700478-4be289fbecef?w=800&h=800&fit=crop&q=80",
	"SRV-THREAD": f"{U}/photo-1517841905240-472988babdf9?w=800&h=800&fit=crop&q=80",
	"SRV-WAX-FULL": f"{U}/photo-1515377905703-c4788e51af15?w=800&h=800&fit=crop&q=80",
	"SRV-WAX-BODY": f"{U}/photo-1519823551278-64ac92734fb1?w=800&h=800&fit=crop&q=80",
	"SRV-MANICURE": f"{U}/photo-1604654894610-df63bc536371?w=800&h=800&fit=crop&q=80",
	"SRV-PEDICURE": f"{U}/photo-1571875257727-256c39da42af?w=800&h=800&fit=crop&q=80",
	"SRV-MANI-PEDI": f"{U}/photo-1632345031435-8727f6897d53?w=800&h=800&fit=crop&q=80",
	"SRV-NAIL-ART": f"{U}/photo-1596462502278-27bfdc403348?w=800&h=800&fit=crop&q=80",
	"SRV-FRENCH": f"{U}/photo-1596464716127-f2a82984de30?w=800&h=800&fit=crop&q=80",
	"SRV-GEL-MANI": f"{U}/photo-1632345031435-8727f6897d53?w=800&h=700&fit=crop&q=80",
	"SRV-GEL-PEDI": f"{U}/photo-1571875257727-256c39da42af?w=700&h=800&fit=crop&q=80",
	"SRV-EXTENSIONS": f"{U}/photo-1596462502278-27bfdc403348?w=700&h=800&fit=crop&q=80",
}


def apply_catalog_images(overwrite: bool = False) -> dict:
	"""Fill empty category/service images so kiosk, booking, and POS show photos."""
	updated_categories = 0
	updated_services = 0

	if not frappe.db.exists("DocType", "Beauty Service Category") or not frappe.db.table_exists(
		"Beauty Service Category"
	):
		return {"categories": 0, "services": 0}

	for name, url in CATEGORY_IMAGES.items():
		if not frappe.db.exists("Beauty Service Category", name):
			continue
		current = frappe.db.get_value("Beauty Service Category", name, "image")
		if current and not overwrite:
			continue
		frappe.db.set_value("Beauty Service Category", name, "image", url, update_modified=False)
		updated_categories += 1

	if frappe.db.has_column("Beauty Service", "image"):
		for name, url in SERVICE_IMAGES.items():
			if not frappe.db.exists("Beauty Service", name):
				continue
			current = frappe.db.get_value("Beauty Service", name, "image")
			if current and not overwrite:
				continue
			frappe.db.set_value("Beauty Service", name, "image", url, update_modified=False)
			updated_services += 1

	products = ensure_demo_retail_products(overwrite=overwrite)
	frappe.db.commit()
	return {"categories": updated_categories, "services": updated_services, "products": products}


RETAIL_PRODUCTS = [
	("BC-SHAMPOO", "Salon Shampoo", "Hair Care", 45, f"{U}/photo-1560066984-138dadb4c035?w=800&h=800&fit=crop&q=80"),
	("BC-CONDITIONER", "Hair Conditioner", "Hair Care", 48, f"{U}/photo-1522337360788-8b13dee7a37e?w=800&h=800&fit=crop&q=80"),
	("BC-HAIR-OIL", "Argan Hair Oil", "Hair Care", 85, f"{U}/photo-1515377905703-c4788e51af15?w=800&h=800&fit=crop&q=80"),
	("BC-HAIR-MASK", "Repair Hair Mask", "Hair Care", 95, f"{U}/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&q=80"),
	("BC-SERUM", "Vitamin C Serum", "Skin Care", 120, f"{U}/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&q=80"),
	("BC-MOISTURIZER", "Daily Moisturizer", "Skin Care", 90, f"{U}/photo-1570172619644-dfd03ed5d881?w=800&h=800&fit=crop&q=80"),
	("BC-SUNSCREEN", "SPF 50 Sunscreen", "Skin Care", 75, f"{U}/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=80"),
	("BC-NAIL-POLISH", "Nail Polish", "Nail Care", 35, f"{U}/photo-1604654894610-df63bc536371?w=800&h=800&fit=crop&q=80"),
	("BC-HAND-CREAM", "Hand Cream", "Nail Care", 40, f"{U}/photo-1632345031435-8727f6897d53?w=800&h=800&fit=crop&q=80"),
	("BC-LIP-BALM", "Tinted Lip Balm", "Skin Care", 28, f"{U}/photo-1586495777744-4413f21062fa?w=800&h=800&fit=crop&q=80"),
]


def ensure_demo_retail_products(overwrite: bool = False) -> int:
	"""Create stocked retail products with photos so POS can be checked."""
	if not frappe.db.exists("DocType", "Item") or not frappe.db.table_exists("Item"):
		return 0

	warehouse = frappe.db.get_value("Beauty Branch", {"is_active": 1}, "retail_warehouse")
	if not warehouse:
		return 0

	created = 0
	for code, name, group, rate, image in RETAIL_PRODUCTS:
		_ensure_item_group(group)
		if frappe.db.exists("Item", code):
			current = frappe.db.get_value("Item", code, "image")
			if overwrite or not current:
				frappe.db.set_value("Item", code, "image", image, update_modified=False)
		else:
			frappe.get_doc(
				{
					"doctype": "Item",
					"item_code": code,
					"item_name": name,
					"item_group": group if frappe.db.exists("Item Group", group) else "Products",
					"stock_uom": "Nos",
					"is_stock_item": 1,
					"include_item_in_manufacturing": 0,
					"standard_rate": rate,
					"image": image,
				}
			).insert(ignore_permissions=True)
			created += 1
		_ensure_item_stock(code, warehouse, rate)
	return created


def _ensure_item_group(name: str):
	if frappe.db.exists("Item Group", name):
		return
	parent = "Products" if frappe.db.exists("Item Group", "Products") else "All Item Groups"
	frappe.get_doc(
		{
			"doctype": "Item Group",
			"item_group_name": name,
			"parent_item_group": parent,
			"is_group": 0,
		}
	).insert(ignore_permissions=True)


def _ensure_item_stock(item_code: str, warehouse: str, rate: float):
	qty = frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": warehouse}, "actual_qty")
	if qty and float(qty) > 0:
		return
	try:
		from erpnext.stock.utils import get_bin

		bin_doc = get_bin(item_code, warehouse)
		bin_doc.actual_qty = 25
		bin_doc.projected_qty = 25
		bin_doc.valuation_rate = rate
		bin_doc.save(ignore_permissions=True)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Beauty Cloud retail stock seed")


def service_image(code: str | None, category: str | None = None) -> str | None:
	if code and code in SERVICE_IMAGES:
		return SERVICE_IMAGES[code]
	if category and category in CATEGORY_IMAGES:
		return CATEGORY_IMAGES[category]
	return None


def category_image(name: str | None) -> str | None:
	if not name:
		return None
	return CATEGORY_IMAGES.get(name)


def public_image(path: str | None) -> str | None:
	return public_file_url(path)
