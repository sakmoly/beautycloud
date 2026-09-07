# Copyright (c) 2026, Beauty Cloud and contributors

import frappe


def after_install():
	from beauty_cloud.setup.demo_data import load_demo_data
	from beauty_cloud.setup.install import ensure_defaults

	ensure_defaults()
	load_demo_data()
	frappe.db.commit()
