app_name = "beauty_cloud"
app_title = "Beauty Cloud"
app_publisher = "Beauty Cloud"
app_description = "Multi-tenant salon SaaS on ERPNext"
app_email = "admin@beautycloud.local"
app_license = "mit"

app_logo_url = "/assets/beauty_cloud/images/beauty-cloud-logo.png"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
	{
		"name": "beauty_cloud",
		"logo": "/assets/beauty_cloud/images/beauty-cloud-logo.png",
		"title": "Beauty Cloud",
		"route": "/app/beauty-cloud",
	}
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/beauty_cloud/css/beauty_cloud.css"
# app_include_js = "/assets/beauty_cloud/js/beauty_cloud.js"

# include js, css files in header of web template
# web_include_css = "/assets/beauty_cloud/css/beauty_cloud.css"
# web_include_js = "/assets/beauty_cloud/js/beauty_cloud.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "beauty_cloud/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "beauty_cloud/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "beauty_cloud.utils.jinja_methods",
# 	"filters": "beauty_cloud.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "beauty_cloud.install.before_install"
# after_install = "beauty_cloud.install.after_install"
after_install = "beauty_cloud.install.after_install"
after_migrate = ["beauty_cloud.setup.sync.sync_child_doctypes"]

before_request = ["beauty_cloud.utils.api_guard.before_api_request"]

# Uninstallation
# ------------

# before_uninstall = "beauty_cloud.uninstall.before_uninstall"
# after_uninstall = "beauty_cloud.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "beauty_cloud.utils.before_app_install"
# after_app_install = "beauty_cloud.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "beauty_cloud.utils.before_app_uninstall"
# after_app_uninstall = "beauty_cloud.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "beauty_cloud.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
permission_query_conditions = {
	"Beauty Appointment": "beauty_cloud.permissions.get_appointment_permission_query_conditions",
}

has_permission = {
	"Beauty Appointment": "beauty_cloud.permissions.has_appointment_permission",
}

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Employee": {
		"on_update": "beauty_cloud.services.hr_schedule.on_employee_update",
	},
	"Beauty Employee Schedule": {
		"after_insert": "beauty_cloud.services.hr_schedule.on_beauty_employee_schedule_change",
		"on_update": "beauty_cloud.services.hr_schedule.on_beauty_employee_schedule_change",
	},
}

# Scheduled Tasks
# ---------------

scheduler_events = {
	"cron": {
		"*/5 * * * *": [
			"beauty_cloud.services.draft_booking_cleanup.release_expired_unpaid_draft_bookings",
		],
		"0 2 * * *": [
			"beauty_cloud.services.hr_schedule.maintain_hr_shift_horizon",
		],
	},
}

# Testing
# -------

# before_tests = "beauty_cloud.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "beauty_cloud.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "beauty_cloud.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["beauty_cloud.utils.before_request"]
# after_request = ["beauty_cloud.utils.after_request"]

# Job Events
# ----------
# before_job = ["beauty_cloud.utils.before_job"]
# after_job = ["beauty_cloud.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"beauty_cloud.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

