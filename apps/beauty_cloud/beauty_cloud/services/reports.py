# Copyright (c) 2026, Beauty Cloud and contributors

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, getdate


def get_management_dashboard(
	company: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	beauty_branch: str | None = None,
) -> dict:
	from frappe.utils import today

	from beauty_cloud.services.tenant import require_feature

	require_feature("management_reports")

	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	from_date = getdate(from_date or today())
	to_date = getdate(to_date or today())

	appt_filters = {
		"company": company,
		"appointment_date": ("between", [from_date, to_date]),
	}
	pos_filters = {
		"company": company,
		"posting_date": ("between", [from_date, to_date]),
		"status": ("in", ["Paid", "Partially Paid"]),
	}
	if beauty_branch:
		appt_filters["beauty_branch"] = beauty_branch
		pos_filters["beauty_branch"] = beauty_branch

	appointments = frappe.get_all(
		"Beauty Appointment",
		filters=appt_filters,
		fields=["name", "status", "source", "total_amount", "payment_status"],
	)
	pos_rows = frappe.get_all(
		"Beauty POS Transaction",
		filters=pos_filters,
		fields=["name", "grand_total", "paid_amount", "source"],
	)

	revenue = sum(flt(row.grand_total) for row in pos_rows)
	appointment_counts = {}
	for row in appointments:
		appointment_counts[row.status] = appointment_counts.get(row.status, 0) + 1

	completed = appointment_counts.get("Completed", 0)
	cancelled = appointment_counts.get("Cancelled", 0) + appointment_counts.get("No Show", 0)
	booked = sum(
		appointment_counts.get(status, 0)
		for status in ("Booked", "Confirmed", "Checked In", "Waiting", "In Service", "Partially Completed", "Completed")
	)

	top_services = _top_services(company, from_date, to_date, beauty_branch)
	utilization = _utilization_summary(company, from_date, to_date, beauty_branch)

	return {
		"company": company,
		"beauty_branch": beauty_branch,
		"from_date": str(from_date),
		"to_date": str(to_date),
		"summary": {
			"revenue": revenue,
			"pos_transactions": len(pos_rows),
			"appointments_total": len(appointments),
			"appointments_completed": completed,
			"appointments_cancelled": cancelled,
			"appointments_booked": booked,
			"completion_rate": round(completed / booked, 4) if booked else 0,
		},
		"top_services": top_services,
		"utilization": utilization,
	}


def get_beautician_performance(
	company: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	beauty_branch: str | None = None,
) -> dict:
	from frappe.utils import today

	from beauty_cloud.services.tenant import require_feature

	require_feature("management_reports")

	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	from_date = getdate(from_date or today())
	to_date = getdate(to_date or today())

	conditions = [
		"ba.company = %(company)s",
		"ba.appointment_date between %(from_date)s and %(to_date)s",
		"bas.status = 'Completed'",
	]
	params = {"company": company, "from_date": from_date, "to_date": to_date}
	if beauty_branch:
		conditions.append("ba.beauty_branch = %(beauty_branch)s")
		params["beauty_branch"] = beauty_branch

	rows = frappe.db.sql(
		f"""
		select
			bas.employee as employee,
			e.employee_name as employee_name,
			count(*) as services_completed,
			sum(bas.rate) as service_revenue,
			sum(bas.duration) as service_minutes
		from `tabBeauty Appointment Service` bas
		inner join `tabBeauty Appointment` ba on ba.name = bas.parent
		left join `tabEmployee` e on e.name = bas.employee
		where {" and ".join(conditions)}
		group by bas.employee, e.employee_name
		order by service_revenue desc
		""",
		params,
		as_dict=True,
	)

	commission_rows = frappe.db.sql(
		"""
		select employee, sum(commission_amount) as commission_total
		from `tabCommission Ledger`
		where company = %(company)s
			and status = 'Posted'
			and date(creation) between %(from_date)s and %(to_date)s
		group by employee
		""",
		{"company": company, "from_date": from_date, "to_date": to_date},
		as_dict=True,
	)
	commission_map = {row.employee: flt(row.commission_total) for row in commission_rows}

	for row in rows:
		row["service_revenue"] = flt(row.service_revenue)
		row["service_minutes"] = flt(row.service_minutes)
		row["commission_total"] = commission_map.get(row.employee, 0)

	return {
		"company": company,
		"beauty_branch": beauty_branch,
		"from_date": str(from_date),
		"to_date": str(to_date),
		"rows": rows,
		"totals": {
			"services_completed": sum(int(row.services_completed) for row in rows),
			"service_revenue": sum(flt(row.service_revenue) for row in rows),
			"commission_total": sum(flt(row.commission_total) for row in rows),
		},
	}


def get_inventory_variance_report(
	company: str | None = None,
	from_date: str | None = None,
	to_date: str | None = None,
	beauty_branch: str | None = None,
) -> dict:
	from frappe.utils import today

	from beauty_cloud.services.tenant import require_feature

	require_feature("management_reports")

	settings = frappe.get_single("Beauty Cloud Settings")
	company = company or settings.company
	from_date = getdate(from_date or today())
	to_date = getdate(to_date or today())

	filters = {
		"company": company,
		"status": "Submitted",
		"count_date": ("between", [from_date, to_date]),
	}
	if beauty_branch:
		filters["beauty_branch"] = beauty_branch

	counts = frappe.get_all(
		"Beauty Inventory Count",
		filters=filters,
		fields=["name", "beauty_branch", "warehouse", "count_date"],
		order_by="count_date desc",
	)

	lines = []
	for count in counts:
		items = frappe.get_all(
			"Beauty Inventory Count Item",
			filters={"parent": count.name},
			fields=[
				"item",
				"item_name",
				"system_qty",
				"physical_qty",
				"variance_qty",
				"variance_amount",
			],
		)
		for item in items:
			if flt(item.variance_qty) == 0:
				continue
			lines.append(
				{
					"inventory_count": count.name,
					"beauty_branch": count.beauty_branch,
					"warehouse": count.warehouse,
					"count_date": str(count.count_date),
					**item,
				}
			)

	return {
		"company": company,
		"beauty_branch": beauty_branch,
		"from_date": str(from_date),
		"to_date": str(to_date),
		"counts_reviewed": len(counts),
		"variance_lines": lines,
		"total_variance_amount": sum(flt(row.variance_amount) for row in lines),
	}


def _top_services(company: str, from_date, to_date, beauty_branch: str | None) -> list[dict]:
	conditions = [
		"ba.company = %(company)s",
		"ba.appointment_date between %(from_date)s and %(to_date)s",
		"ba.status not in ('Cancelled', 'No Show')",
	]
	params = {"company": company, "from_date": from_date, "to_date": to_date}
	if beauty_branch:
		conditions.append("ba.beauty_branch = %(beauty_branch)s")
		params["beauty_branch"] = beauty_branch

	return frappe.db.sql(
		f"""
		select
			bas.beauty_service as beauty_service,
			bs.service_name as service_name,
			count(*) as bookings,
			sum(bas.rate) as revenue
		from `tabBeauty Appointment Service` bas
		inner join `tabBeauty Appointment` ba on ba.name = bas.parent
		left join `tabBeauty Service` bs on bs.name = bas.beauty_service
		where {" and ".join(conditions)}
		group by bas.beauty_service, bs.service_name
		order by bookings desc
		limit 10
		""",
		params,
		as_dict=True,
	)


def _utilization_summary(company: str, from_date, to_date, beauty_branch: str | None) -> dict:
	conditions = [
		"ba.company = %(company)s",
		"ba.appointment_date between %(from_date)s and %(to_date)s",
		"ba.status in ('Completed', 'In Service', 'Partially Completed', 'Checked In', 'Waiting', 'Confirmed', 'Booked')",
	]
	params = {"company": company, "from_date": from_date, "to_date": to_date}
	if beauty_branch:
		conditions.append("ba.beauty_branch = %(beauty_branch)s")
		params["beauty_branch"] = beauty_branch

	booked_minutes = flt(
		frappe.db.sql(
			f"""
			select coalesce(sum(bas.duration), 0)
			from `tabBeauty Appointment Service` bas
			inner join `tabBeauty Appointment` ba on ba.name = bas.parent
			where {" and ".join(conditions)}
			""",
			params,
		)[0][0]
	)

	employee_count = frappe.db.count(
		"Employee",
		{"company": company, "status": "Active"},
	)
	days = (getdate(to_date) - getdate(from_date)).days + 1
	available_minutes = employee_count * days * 8 * 60

	return {
		"booked_minutes": booked_minutes,
		"available_minutes_estimate": available_minutes,
		"utilization_rate": round(booked_minutes / available_minutes, 4) if available_minutes else 0,
	}
