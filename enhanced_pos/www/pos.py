import os
import csv
import json
import frappe
from frappe.utils import get_system_timezone

no_cache = 1


def get_context():
	csrf_token = frappe.sessions.get_csrf_token()
	context = frappe._dict()
	context.csrf_token = csrf_token
	context.boot = get_boot()
	context.boot.csrf_token = csrf_token

	# Get user language based on the logged-in user
	user_lang = "en"
	if frappe.session.user:
		user_lang = frappe.db.get_value("User", frappe.session.user, "language") or "en"

	# Load translations from CSV
	translations = {}
	try:
		app_path = frappe.get_app_path("enhanced_pos")
		
		# 1. Load English translations first as fallback
		en_csv_path = os.path.join(app_path, "translations", "en.csv")
		if os.path.exists(en_csv_path):
			with open(en_csv_path, mode="r", encoding="utf-8") as f:
				reader = csv.reader(f)
				for row in reader:
					if len(row) >= 2:
						translations[row[0]] = row[1]

		# 2. Overlay user language if it's not English
		if user_lang != "en":
			user_csv_path = os.path.join(app_path, "translations", f"{user_lang}.csv")
			if os.path.exists(user_csv_path):
				with open(user_csv_path, mode="r", encoding="utf-8") as f:
					reader = csv.reader(f)
					for row in reader:
						if len(row) >= 2:
							translations[row[0]] = row[1]
	except Exception as e:
		# Log warning but do not break page load
		frappe.logger().warning(f"Error loading POS translations: {str(e)}")

	context.user_lang = user_lang
	context.translations = json.dumps(translations)

	return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
	if not frappe.conf.developer_mode:
		frappe.throw("This method is only meant for developer mode")
	return get_boot()


def get_boot():
	return frappe._dict(
		{
			"frappe_version": frappe.__version__,
			"site_name": frappe.local.site,
			"read_only_mode": frappe.flags.read_only,
			"system_timezone": get_system_timezone(),
		}
	)
