# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe import _
from frappe.model.document import Document


class BeautyPOSRegister(Document):
	def validate(self):
		if self.beauty_branch:
			branch_company = frappe.db.get_value("Beauty Branch", self.beauty_branch, "company")
			if branch_company and self.company and branch_company != self.company:
				frappe.throw(_("Branch must belong to company {0}").format(self.company))

	def before_insert(self):
		if not self.get_password("api_key", raise_exception=False):
			self.api_key = _generate_api_key()


@frappe.whitelist()
def get_pairing_key(name: str) -> str:
	_assert_register_manager()
	doc = frappe.get_doc("Beauty POS Register", name)
	key = doc.get_password("api_key")
	if not key:
		frappe.throw(_("No API key on register {0}. Regenerate the key first.").format(name))
	return key


@frappe.whitelist()
def regenerate_pairing_key(name: str) -> str:
	_assert_register_manager()
	doc = frappe.get_doc("Beauty POS Register", name)
	doc.api_key = _generate_api_key()
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return doc.get_password("api_key")


def _generate_api_key() -> str:
	import secrets

	return secrets.token_urlsafe(32)


def _assert_register_manager():
	if frappe.session.user == "Administrator":
		return
	roles = set(frappe.get_roles())
	if not ({"System Manager", "Beauty Cloud Branch Manager"} & roles):
		frappe.throw(_("Only a branch manager can view register pairing keys"))
