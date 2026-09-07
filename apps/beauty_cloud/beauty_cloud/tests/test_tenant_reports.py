# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe.tests.utils import FrappeTestCase


class TestTenantService(FrappeTestCase):
	def test_tenant_context_has_features(self):
		from beauty_cloud.services.tenant import get_tenant_context

		context = get_tenant_context()
		self.assertIn("features", context)
		self.assertIn("online_booking", context["features"])

	def test_plan_exists_or_fallback(self):
		from beauty_cloud.services.tenant import ensure_default_plan, get_plan

		ensure_default_plan()
		plan = get_plan("PLAN-PRO")
		self.assertEqual(plan["plan_code"], "PLAN-PRO")


class TestReportsService(FrappeTestCase):
	def test_management_dashboard(self):
		from beauty_cloud.services.reports import get_management_dashboard

		result = get_management_dashboard(beauty_branch="BBY-MAIN")
		self.assertIn("summary", result)
		self.assertIn("revenue", result["summary"])

	def test_beautician_performance(self):
		from beauty_cloud.services.reports import get_beautician_performance

		result = get_beautician_performance(beauty_branch="BBY-MAIN")
		self.assertIn("rows", result)
		self.assertIn("totals", result)


class TestApiGuard(FrappeTestCase):
	def test_rate_limit_audit(self):
		from beauty_cloud.utils.api_guard import get_rate_limit_audit

		audit = get_rate_limit_audit()
		self.assertIn("rate_limited_methods", audit)
		self.assertIn("beauty_cloud.api.pos.checkout_cart", audit["rate_limited_methods"])
