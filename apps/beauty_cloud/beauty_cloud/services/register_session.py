# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, flt, getdate, now_datetime, today


def get_pos_session_context(beauty_branch: str, register_code: str | None = None, api_key: str | None = None) -> dict:
	return get_session_dashboard(beauty_branch, register_code, api_key)


def get_session_dashboard(
	beauty_branch: str,
	register_code: str | None = None,
	api_key: str | None = None,
) -> dict:
	from beauty_cloud.services.user_branch import assert_branch_access, can_fetch_register_pairing_key

	assert_branch_access(beauty_branch)
	branch = frappe.get_doc("Beauty Branch", beauty_branch)
	business_day = get_open_business_day(beauty_branch)
	register = None
	register_session = None
	register_pairing_error = None

	if register_code:
		if not api_key:
			register_pairing_error = _("Register is paired but missing credentials — re-pair in Register & Day")
		else:
			try:
				register = _authenticate_register(register_code, api_key, beauty_branch)
				register_session = get_open_register_session(register.name)
			except frappe.AuthenticationError as exc:
				register_pairing_error = str(exc)
			except frappe.ValidationError as exc:
				register_pairing_error = str(exc)

	open_day_name = business_day.name if business_day else None
	my_session_summary = None
	if register_session:
		my_session_summary = _register_session_summary(register_session, include_live_totals=True)

	return {
		"beauty_branch": beauty_branch,
		"branch_name": branch.branch_name,
		"can_manage_business_day": _can_close_business_day(),
		"can_open_business_day": _can_open_business_day(),
		"can_close_business_day": _can_close_business_day(),
		"can_unpair_register": _can_unpair_register(),
		"enforce_business_day": bool(branch.get("require_business_day_for_pos")),
		"enforce_register_session": bool(branch.get("require_register_session_for_pos")),
		"require_all_registers_closed": bool(branch.get("require_all_registers_closed_for_day_close")),
		"business_day_cutoff_time": str(branch.get("business_day_cutoff_time") or ""),
		"business_day": _business_day_summary(business_day, full=True),
		"suggested_business_date": suggest_business_date(beauty_branch),
		"register": _register_summary(register) if register else None,
		"register_pairing_error": register_pairing_error,
		"register_session": my_session_summary,
		"open_registers": _register_sessions_for_day(beauty_branch, open_day_name, status="Open"),
		"closed_registers": _register_sessions_for_day(beauty_branch, open_day_name, status="Closed"),
		"recent_business_days": _recent_business_days(beauty_branch),
		"available_registers": list_registers(beauty_branch),
		"can_fetch_pairing_key": can_fetch_register_pairing_key(),
	}


def suggest_business_date(beauty_branch: str) -> str:
	last = frappe.db.get_value(
		"Beauty Business Day",
		{"beauty_branch": beauty_branch},
		"business_date",
		order_by="business_date desc",
	)
	if not last:
		return str(getdate(today()))
	return str(add_days(getdate(last), 1))


def get_open_business_day(beauty_branch: str):
	name = frappe.db.get_value(
		"Beauty Business Day",
		{"beauty_branch": beauty_branch, "status": "Open"},
		"name",
	)
	return frappe.get_doc("Beauty Business Day", name) if name else None


def open_business_day(beauty_branch: str, business_date: str | None = None, notes: str | None = None) -> dict:
	from beauty_cloud.services.user_branch import assert_branch_access

	assert_branch_access(beauty_branch)
	_assert_can_open_business_day()
	branch = frappe.get_doc("Beauty Branch", beauty_branch)

	open_day = get_open_business_day(beauty_branch)
	if open_day:
		frappe.throw(
			_("Business day {0} is still open ({1}). Close it before opening a new day.").format(
				open_day.business_date, open_day.name
			)
		)

	business_date = getdate(business_date or suggest_business_date(beauty_branch))

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Business Day",
			"naming_series": "BBD-.YYYY.-",
			"company": branch.company,
			"beauty_branch": beauty_branch,
			"business_date": business_date,
			"status": "Open",
			"opened_at": now_datetime(),
			"opened_by": frappe.session.user,
			"notes": notes,
		}
	)
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	doc.reload()
	return _business_day_summary(doc, full=True)


def close_business_day(beauty_branch: str | None = None, name: str | None = None, notes: str | None = None) -> dict:
	_assert_can_close_business_day()
	doc = _resolve_business_day(beauty_branch, name)
	if doc.status != "Open":
		frappe.throw(_("Business day {0} is not open").format(doc.name))

	branch = frappe.get_doc("Beauty Branch", doc.beauty_branch)
	if branch.get("require_all_registers_closed_for_day_close"):
		open_sessions = frappe.get_all(
			"Beauty Register Session",
			filters={"beauty_business_day": doc.name, "status": "Open"},
			pluck="name",
		)
		if open_sessions:
			frappe.throw(
				_("Close all register sessions before closing the business day: {0}").format(
					", ".join(open_sessions)
				)
			)

	totals = frappe.db.sql(
		"""
		select count(*) as transaction_count, coalesce(sum(grand_total), 0) as total_sales
		from `tabBeauty POS Transaction`
		where beauty_business_day = %(day)s and status != 'Cancelled'
		""",
		{"day": doc.name},
		as_dict=True,
	)[0]

	doc.db_set(
		{
			"status": "Closed",
			"closed_at": now_datetime(),
			"closed_by": frappe.session.user,
			"transaction_count": int(totals.transaction_count or 0),
			"total_sales": flt(totals.total_sales),
			"notes": notes or doc.notes,
		}
	)
	frappe.db.commit()
	doc.reload()
	return _business_day_summary(doc, full=True)


def mark_business_day_posted(name: str) -> dict:
	_assert_can_close_business_day()
	doc = frappe.get_doc("Beauty Business Day", name)
	if doc.status != "Closed":
		frappe.throw(_("Only closed business days can be marked posted"))
	doc.db_set(
		{
			"status": "Posted",
			"posted_at": now_datetime(),
			"posted_by": frappe.session.user,
		}
	)
	frappe.db.commit()
	return _business_day_summary(doc, full=True)


def list_registers(beauty_branch: str) -> list[dict]:
	return frappe.get_all(
		"Beauty POS Register",
		filters={"beauty_branch": beauty_branch, "is_active": 1},
		fields=["name", "register_code", "register_name", "pos_profile", "last_seen_at"],
		order_by="register_name asc",
	)


def authenticate_register(register_code: str, api_key: str, beauty_branch: str | None = None) -> dict:
	register = _authenticate_register(register_code, api_key, beauty_branch)
	return _register_summary(register)


def unpair_register(register_code: str, api_key: str) -> dict:
	_assert_can_unpair_register()
	register = _authenticate_register(register_code, api_key)
	session = get_open_register_session(register.name)
	if session:
		frappe.throw(
			_("Close register session {0} before unpairing this device").format(session.name)
		)
	return {
		"register_code": register.register_code,
		"register_name": register.register_name,
		"unpaired_by": frappe.session.user,
	}


def open_register_session(
	register_code: str,
	api_key: str,
	opening_float: float = 0,
) -> dict:
	register = _authenticate_register(register_code, api_key)
	business_day = get_open_business_day(register.beauty_branch)
	if not business_day:
		frappe.throw(_("Open a business day for branch {0} before opening a register").format(register.beauty_branch))

	existing = get_open_register_session(register.name)
	if existing:
		if _can_use_register_session(register, existing):
			return _register_session_summary(existing, include_live_totals=True)
		frappe.throw(
			_("Register {0} is already open in session {1} by {2}").format(
				register.register_code, existing.name, existing.cashier
			)
		)

	doc = frappe.get_doc(
		{
			"doctype": "Beauty Register Session",
			"naming_series": "BRGS-.YYYY.-",
			"company": register.company,
			"beauty_branch": register.beauty_branch,
			"beauty_business_day": business_day.name,
			"beauty_pos_register": register.name,
			"cashier": frappe.session.user,
			"status": "Open",
			"opened_at": now_datetime(),
			"opening_float": flt(opening_float),
		}
	)
	doc.insert(ignore_permissions=True)
	register.db_set("last_seen_at", now_datetime())
	frappe.db.commit()
	return _register_session_summary(doc, include_live_totals=True)


def close_register_session(
	session_name: str,
	closing_cash: float,
	notes: str | None = None,
) -> dict:
	doc = frappe.get_doc("Beauty Register Session", session_name)
	if doc.status != "Open":
		frappe.throw(_("Register session {0} is not open").format(doc.name))
	if doc.cashier != frappe.session.user and not _can_close_business_day():
		frappe.throw(_("Only the opening cashier or a manager can close this register session"))

	expected_cash, total_sales, tx_count = _register_session_totals(doc.name, doc.opening_float)
	variance = flt(closing_cash) - flt(expected_cash)

	doc.db_set(
		{
			"status": "Closed",
			"closed_at": now_datetime(),
			"closing_cash": flt(closing_cash),
			"expected_cash": expected_cash,
			"cash_variance": variance,
			"total_sales": total_sales,
			"transaction_count": tx_count,
			"notes": notes or doc.notes,
		}
	)
	frappe.db.commit()
	doc.reload()
	return _register_session_summary(doc, include_live_totals=False)


def get_open_register_session(register_name: str):
	name = frappe.db.get_value(
		"Beauty Register Session",
		{"beauty_pos_register": register_name, "status": "Open"},
		"name",
		order_by="creation desc",
	)
	return frappe.get_doc("Beauty Register Session", name) if name else None


def resolve_checkout_session(cart: dict) -> dict:
	branch = frappe.get_doc("Beauty Branch", cart.get("beauty_branch"))
	enforce_day = bool(branch.get("require_business_day_for_pos"))
	enforce_register = bool(branch.get("require_register_session_for_pos"))

	business_day = None
	register_session = None
	register = None
	posting_date = getdate(today())

	# Kiosk self-service: business day when required, but no open register session.
	if cart.get("source") == "Kiosk":
		if enforce_day:
			business_day = get_open_business_day(branch.name)
			if not business_day:
				frappe.throw(_("Open a business day before kiosk checkout"))
			posting_date = getdate(business_day.business_date)
		return {
			"beauty_business_day": business_day.name if business_day else None,
			"business_date": posting_date,
			"beauty_register_session": None,
			"beauty_pos_register": None,
			"register_code": None,
			"cashier": cart.get("cashier") or "Administrator",
		}

	if enforce_day or enforce_register or cart.get("register_code"):
		business_day = get_open_business_day(branch.name)
		if enforce_day and not business_day:
			frappe.throw(_("Open a business day before POS checkout"))

	if enforce_register or cart.get("register_code"):
		register_code = cart.get("register_code")
		api_key = cart.get("register_api_key")
		if not register_code or not api_key:
			frappe.throw(_("Register ID and device key are required for POS checkout"))
		register = _authenticate_register(register_code, api_key, branch.name)
		register_session = get_open_register_session(register.name)
		if not register_session:
			frappe.throw(_("Open register session for {0} before checkout").format(register.register_code))
		if not _can_use_register_session(register, register_session):
			frappe.throw(
				_(
					"Register {0} is open under {1}. Only that cashier or another staff member at this branch can checkout."
				).format(register.register_code, register_session.cashier)
			)

	if business_day:
		posting_date = getdate(business_day.business_date)

	return {
		"beauty_business_day": business_day.name if business_day else None,
		"business_date": posting_date,
		"beauty_register_session": register_session.name if register_session else None,
		"beauty_pos_register": register.name if register else None,
		"register_code": register.register_code if register else None,
		"cashier": frappe.session.user,
	}


def _authenticate_register(register_code: str, api_key: str | None, beauty_branch: str | None = None):
	if not register_code:
		frappe.throw(_("Register code is required"))
	if not frappe.db.exists("Beauty POS Register", register_code):
		frappe.throw(_("Unknown register {0}").format(register_code), frappe.AuthenticationError)

	register = frappe.get_doc("Beauty POS Register", register_code)
	if not register.is_active:
		frappe.throw(_("Register {0} is inactive").format(register_code), frappe.AuthenticationError)
	if beauty_branch and register.beauty_branch != beauty_branch:
		frappe.throw(_("Register {0} does not belong to branch {1}").format(register_code, beauty_branch))
	if api_key:
		stored = register.get_password("api_key")
		if not stored or stored != api_key:
			frappe.throw(_("Invalid register credentials"), frappe.AuthenticationError)
		register.db_set("last_seen_at", now_datetime())
	return register


def _register_session_totals(session_name: str, opening_float: float) -> tuple[float, float, int]:
	rows = frappe.db.sql(
		"""
		select t.name, t.grand_total
		from `tabBeauty POS Transaction` t
		where t.beauty_register_session = %(session)s and t.status != 'Cancelled'
		""",
		{"session": session_name},
		as_dict=True,
	)
	total_sales = sum(flt(row.grand_total) for row in rows)
	cash_paid = frappe.db.sql(
		"""
		select coalesce(sum(p.amount), 0)
		from `tabBeauty POS Transaction Payment` p
		inner join `tabBeauty POS Transaction` t on t.name = p.parent
		where t.beauty_register_session = %(session)s
		  and t.status != 'Cancelled'
		  and lower(p.mode_of_payment) = 'cash'
		""",
		{"session": session_name},
	)[0][0]
	expected_cash = flt(opening_float) + flt(cash_paid)
	return expected_cash, total_sales, len(rows)


def _resolve_business_day(beauty_branch: str | None, name: str | None):
	if name:
		return frappe.get_doc("Beauty Business Day", name)
	if not beauty_branch:
		frappe.throw(_("Branch or business day is required"))
	doc = get_open_business_day(beauty_branch)
	if not doc:
		frappe.throw(_("No open business day for branch {0}").format(beauty_branch))
	return doc


def _can_checkout_on_branch_register(beauty_branch: str) -> bool:
	"""Branch POS staff may issue sales on an already-open store register."""
	if frappe.session.user == "Administrator":
		return True

	from beauty_cloud.services.user_branch import assert_branch_access

	try:
		assert_branch_access(beauty_branch)
	except frappe.PermissionError:
		return False

	roles = set(frappe.get_roles())
	return bool(
		roles.intersection(
			{
				"System Manager",
				"Beauty Cloud Branch Manager",
				"Beauty Cloud Cashier",
				"Beauty Cloud Receptionist",
			}
		)
	)


def _can_use_register_session(register, register_session) -> bool:
	if register_session.cashier == frappe.session.user:
		return True
	return _can_checkout_on_branch_register(register.beauty_branch)


def _can_open_business_day() -> bool:
	if frappe.session.user == "Administrator":
		return True
	roles = set(frappe.get_roles())
	return bool(
		roles.intersection(
			{
				"System Manager",
				"Beauty Cloud Branch Manager",
				"Beauty Cloud Cashier",
				"Beauty Cloud Receptionist",
			}
		)
	)


def _can_close_business_day() -> bool:
	return _has_register_manager_role()


def _can_unpair_register() -> bool:
	return _has_register_manager_role()


def _has_register_manager_role() -> bool:
	if frappe.session.user == "Administrator":
		return True
	roles = set(frappe.get_roles())
	return bool({"System Manager", "Beauty Cloud Branch Manager"} & roles)


def _assert_can_open_business_day():
	if not _can_open_business_day():
		frappe.throw(_("You do not have permission to open a business day"))


def _assert_can_close_business_day():
	if not _can_close_business_day():
		frappe.throw(_("Only a branch manager can close business days"))


def _assert_can_unpair_register():
	if not _can_unpair_register():
		frappe.throw(_("Only a branch manager can unpair a POS register from this device"))


def _business_day_summary(doc, full: bool = False) -> dict | None:
	if not doc:
		return None
	summary = {
		"name": doc.name,
		"business_date": str(getdate(doc.business_date)),
		"status": doc.status,
		"opened_at": doc.opened_at,
		"opened_by": doc.opened_by,
	}
	if not full:
		return summary

	if doc.status in ("Closed", "Posted"):
		summary.update(
			{
				"closed_at": doc.closed_at,
				"closed_by": doc.closed_by,
				"transaction_count": int(doc.transaction_count or 0),
				"total_sales": flt(doc.total_sales),
				"notes": doc.notes,
			}
		)
	if doc.status == "Posted":
		summary.update({"posted_at": doc.posted_at, "posted_by": doc.posted_by})

	if doc.status == "Open":
		totals = frappe.db.sql(
			"""
			select count(*) as transaction_count, coalesce(sum(grand_total), 0) as total_sales
			from `tabBeauty POS Transaction`
			where beauty_business_day = %(day)s and status != 'Cancelled'
			""",
			{"day": doc.name},
			as_dict=True,
		)[0]
		summary.update(
			{
				"transaction_count": int(totals.transaction_count or 0),
				"total_sales": flt(totals.total_sales),
				"notes": doc.notes,
			}
		)
	return summary


def _register_summary(register) -> dict:
	return {
		"name": register.name,
		"register_code": register.register_code,
		"register_name": register.register_name,
		"beauty_branch": register.beauty_branch,
	}


def _register_session_summary(session, include_live_totals: bool = False) -> dict | None:
	if not session:
		return None
	summary = {
		"name": session.name,
		"status": session.status,
		"register_code": session.register_code,
		"cashier": session.cashier,
		"business_date": str(getdate(session.business_date)) if session.business_date else None,
		"beauty_business_day": session.beauty_business_day,
		"opened_at": session.opened_at,
		"opening_float": flt(session.opening_float),
		"total_sales": flt(session.total_sales),
		"transaction_count": int(session.transaction_count or 0),
	}
	if session.status == "Closed":
		summary.update(
			{
				"closed_at": session.closed_at,
				"closing_cash": flt(session.closing_cash),
				"expected_cash": flt(session.expected_cash),
				"cash_variance": flt(session.cash_variance),
				"notes": session.notes,
			}
		)
	elif include_live_totals:
		expected_cash, total_sales, tx_count = _register_session_totals(session.name, session.opening_float)
		summary.update(
			{
				"expected_cash": expected_cash,
				"total_sales": total_sales,
				"transaction_count": tx_count,
			}
		)
	return summary


def _register_sessions_for_day(
	beauty_branch: str,
	business_day_name: str | None,
	status: str | None = None,
) -> list[dict]:
	if not business_day_name:
		return []
	filters = {"beauty_branch": beauty_branch, "beauty_business_day": business_day_name}
	if status:
		filters["status"] = status
	rows = frappe.get_all(
		"Beauty Register Session",
		filters=filters,
		fields=[
			"name",
			"register_code",
			"cashier",
			"status",
			"opened_at",
			"closed_at",
			"opening_float",
			"closing_cash",
			"expected_cash",
			"cash_variance",
			"total_sales",
			"transaction_count",
		],
		order_by="opened_at asc",
	)
	for row in rows:
		row["opening_float"] = flt(row.get("opening_float"))
		row["closing_cash"] = flt(row.get("closing_cash"))
		row["expected_cash"] = flt(row.get("expected_cash"))
		row["cash_variance"] = flt(row.get("cash_variance"))
		row["total_sales"] = flt(row.get("total_sales"))
	return rows


def _recent_business_days(beauty_branch: str, limit: int = 7) -> list[dict]:
	rows = frappe.get_all(
		"Beauty Business Day",
		filters={"beauty_branch": beauty_branch},
		fields=[
			"name",
			"business_date",
			"status",
			"opened_at",
			"closed_at",
			"transaction_count",
			"total_sales",
		],
		order_by="business_date desc",
		limit=limit,
	)
	for row in rows:
		row["business_date"] = str(getdate(row.business_date))
		row["total_sales"] = flt(row.get("total_sales"))
	return rows


def _open_register_sessions(beauty_branch: str, business_day_name: str | None) -> list[dict]:
	return _register_sessions_for_day(beauty_branch, business_day_name, status="Open")
