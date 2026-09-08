# Copyright (c) 2026, Beauty Cloud and contributors

import frappe

from beauty_cloud.services.public_catalog import get_public_service_catalog
from beauty_cloud.services.web_content import (
	get_home_page as fetch_home_page,
	get_published_web_page,
	list_published_web_pages,
	get_public_navigation,
)


@frappe.whitelist(allow_guest=True)
def get_service_catalog(parent_category: str | None = None, company: str | None = None, online_only: int = 1):
	return get_public_service_catalog(parent_category, company, bool(online_only))


@frappe.whitelist(allow_guest=True)
def get_web_page(page_slug: str, company: str | None = None, branch: str | None = None):
	page = get_published_web_page(page_slug, company, branch)
	if not page:
		frappe.throw(frappe._("Page not found"), frappe.DoesNotExistError)
	return page


@frappe.whitelist(allow_guest=True)
def get_web_pages(company: str | None = None, menu_only: int = 0):
	return list_published_web_pages(company, menu_only=bool(menu_only))


@frappe.whitelist(allow_guest=True)
def get_home_page(company: str | None = None, branch: str | None = None):
	return fetch_home_page(company, branch)


@frappe.whitelist(allow_guest=True)
def get_navigation(company: str | None = None, branch: str | None = None):
	return get_public_navigation(company, branch)
