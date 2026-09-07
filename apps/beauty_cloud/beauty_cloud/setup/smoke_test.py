# Copyright (c) 2026, Beauty Cloud and contributors

import frappe
from frappe.utils import now_datetime


def run_phase2_smoke_test():
	from beauty_cloud.services.booking import create_booking
	from beauty_cloud.services.commission import calculate_commission, preview_commission
	from beauty_cloud.services.consumption import submit_service_consumption
	from beauty_cloud.services.otp import request_otp, verify_otp

	frappe.local.conf["beauty_cloud_dev_otp"] = 1
	mobile = "+966500000088"

	r = request_otp(mobile)
	otp = r.get("dev_otp") or request_otp(mobile)["dev_otp"]
	v = verify_otp(mobile, otp, r["request_id"])
	appt = create_booking(
		{
			"beauty_branch": "BBY-MAIN",
			"appointment_date": "2026-09-08",
			"start_time": "2026-09-08 14:00:00",
			"employee": "HR-EMP-00001",
			"services": ["SRV-FACIAL"],
			"mobile": mobile,
			"customer_name": "Test Customer",
			"verification_token": v["verification_token"],
		}
	)

	doc = frappe.get_doc("Beauty Appointment", appt["name"])
	doc.services[0].status = "Completed"
	doc.status = "Completed"
	doc.save(ignore_permissions=True)

	consumption = submit_service_consumption(doc.name, doc.services[0].idx)
	preview = preview_commission(doc.name, doc.services[0].idx)[0]
	ledger = calculate_commission(doc.name, doc.services[0].idx)

	frappe.db.commit()
	return {
		"appointment": doc.name,
		"consumption": consumption["name"],
		"commission_preview": preview.get("commission_amount"),
		"commission_ledger": ledger["name"],
	}


def run_phase3_smoke_test():
	from beauty_cloud.services.reception import (
		check_in_appointment,
		complete_appointment,
		create_walk_in,
		get_reception_calendar,
		get_reception_dashboard,
		get_waiting_queue,
		start_appointment,
	)

	branch = "BBY-MAIN"
	today = str(now_datetime().date())

	waiting = create_walk_in(
		{
			"beauty_branch": branch,
			"services": ["SRV-MANICURE"],
			"customer_name": "Walk-In Guest",
			"mobile": "+966500000077",
		}
	)

	dashboard = get_reception_dashboard(branch, today)
	calendar = get_reception_calendar(branch, today, today)
	queue = get_waiting_queue(branch, today)

	confirmed = frappe.db.get_value(
		"Beauty Appointment",
		{"beauty_branch": branch, "status": "Confirmed"},
		"name",
	)
	if confirmed:
		check_in_appointment(confirmed)
		start_appointment(confirmed)
		complete_appointment(confirmed)

	frappe.db.commit()
	return {
		"walk_in": waiting["name"],
		"walk_in_status": waiting["status"],
		"dashboard": dashboard["summary"],
		"calendar_events": len(calendar["events"]),
		"queue_size": len(queue),
	}


def run_phase4_smoke_test():
	frappe.flags.beauty_cloud_test_employee = "HR-EMP-00001"
	employee = "HR-EMP-00001"
	branch = "BBY-MAIN"

	from beauty_cloud.services.beautician import (
		create_recommendation,
		get_my_appointment,
		get_my_schedule,
		get_product_catalogue,
		preview_my_consumption,
		save_consultation,
		send_recommendation_to_reception,
		start_my_service,
	)

	schedule = get_my_schedule(employee=employee)
	if not schedule["all"]:
		frappe.throw("No appointments found for beautician smoke test")

	row = schedule["today"][0] if schedule["today"] else schedule["all"][0]
	appt_name = row["appointment"]
	service_row = row["service_row"]

	detail = get_my_appointment(appt_name, employee=employee)
	start_my_service(appt_name, service_row, employee=employee)
	preview = preview_my_consumption(appt_name, service_row, employee=employee)
	catalogue = get_product_catalogue(branch, page_size=10)

	consultation = save_consultation(
		{
			"company": "Bahyea Bauty",
			"beauty_branch": branch,
			"customer": detail["customer"]["name"],
			"beauty_appointment": appt_name,
			"desired_style": "Natural glow facial",
			"items": [{"line_type": "Service", "beauty_service": "SRV-FACIAL", "qty": 1}],
		},
		employee=employee,
	)

	recommendation = create_recommendation(
		{
			"beauty_branch": branch,
			"customer": detail["customer"]["name"],
			"beauty_appointment": appt_name,
			"items": [{"item": "BC-SERUM", "qty": 1, "rate": 120}],
		},
		employee=employee,
	)
	send_recommendation_to_reception(recommendation["name"], employee=employee)

	frappe.db.commit()
	return {
		"schedule_count": len(schedule["all"]),
		"appointment": appt_name,
		"consumption_preview_items": len(preview.get("items", [])),
		"catalogue_items": len(catalogue.get("items", [])),
		"consultation": consultation["name"],
		"recommendation": recommendation["name"],
	}
