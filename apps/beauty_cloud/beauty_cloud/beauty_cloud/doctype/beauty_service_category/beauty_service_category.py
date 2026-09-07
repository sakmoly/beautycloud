# Copyright (c) 2026, Beauty Cloud and contributors
# For license information, please see license.txt

from frappe.utils.nestedset import NestedSet


class BeautyServiceCategory(NestedSet):
	nsm_parent_field = "parent_beauty_service_category"
