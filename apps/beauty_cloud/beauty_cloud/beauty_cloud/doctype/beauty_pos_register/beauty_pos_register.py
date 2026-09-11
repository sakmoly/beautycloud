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
	name = (name or "").strip()
	if not name:
		frappe.throw(_("Register code is required"))
	if len(name) >= 40 and not frappe.db.exists("Beauty POS Register", name):
		frappe.throw(
			_(
				"That looks like an API key, not a register code. "
				"Select the register (e.g. REG-02) first, then tap Fetch key."
			),
			title=_("Wrong Field"),
		)
	if not frappe.db.exists("Beauty POS Register", name):
		frappe.throw(_("Register {0} was not found for this branch").format(name))
	doc = frappe.get_doc("Beauty POS Register", name)
	_assert_can_fetch_pairing_key(doc)
	key = doc.get_password("api_key")
	if not key:
		frappe.throw(_("No API key on register {0}. Regenerate the key first.").format(name))
	return key


@frappe.whitelist()
def regenerate_pairing_key(name: str) -> str:
	doc = frappe.get_doc("Beauty POS Register", name)
	_assert_register_manager()
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
		frappe.throw(_("Only a branch manager can regenerate register pairing keys"))


def _assert_can_fetch_pairing_key(register_doc):
	from beauty_cloud.services.user_branch import assert_register_access, can_fetch_register_pairing_key

	if not can_fetch_register_pairing_key():
		frappe.throw(
			_("You do not have permission to fetch register pairing keys"),
			exc=frappe.PermissionError,
		)
	assert_register_access(register_doc)
	register_doc.check_permission("read")
