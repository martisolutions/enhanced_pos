import unittest
import frappe
from frappe.tests.utils import FrappeTestCase
from enhanced_pos.api.pos import get_session_state, get_sales_invoice_details


class TestEnhancedPOSApi(FrappeTestCase):
	def setUp(self):
		super().setUp()
		# Clear any active test states if necessary

	def test_get_session_state_contains_plugins(self):
		"""Test that get_session_state returns plugins_js and plugins_css lists"""
		session_state = get_session_state()
		self.assertIn("plugins_js", session_state)
		self.assertIn("plugins_css", session_state)
		self.assertIsInstance(session_state["plugins_js"], list)
		self.assertIsInstance(session_state["plugins_css"], list)

	def test_get_session_state_mocked_hooks(self):
		"""Test that get_session_state correctly includes hooks registered by third-party apps"""
		original_get_hooks = frappe.get_hooks

		# Mock get_hooks to return custom assets
		def mock_get_hooks(hook_name, default=None, app_name=None):
			if hook_name == "enhanced_pos_js":
				return ["/assets/custom_app/js/plugin.js"]
			if hook_name == "enhanced_pos_css":
				return ["/assets/custom_app/css/plugin.css"]
			return original_get_hooks(hook_name, default, app_name)

		frappe.get_hooks = mock_get_hooks

		try:
			session_state = get_session_state()
			self.assertEqual(session_state["plugins_js"], ["/assets/custom_app/js/plugin.js"])
			self.assertEqual(session_state["plugins_css"], ["/assets/custom_app/css/plugin.css"])
		finally:
			# Restore original function
			frappe.get_hooks = original_get_hooks

	def test_get_sales_invoice_details_not_submitted(self):
		"""Test that get_sales_invoice_details throws an error for unsubmitted invoices"""
		from unittest.mock import MagicMock
		mock_invoice = MagicMock()
		mock_invoice.name = "ACC-SINV-2026-00001"
		mock_invoice.docstatus = 0
		mock_invoice.outstanding_amount = 100.0
		mock_invoice.grand_total = 100.0
		mock_invoice.currency = "USD"
		mock_invoice.items = []

		original_get_doc = frappe.get_doc
		frappe.get_doc = lambda doctype, name: mock_invoice if doctype == "Sales Invoice" else original_get_doc(doctype, name)
		try:
			self.assertRaises(frappe.ValidationError, get_sales_invoice_details, "ACC-SINV-2026-00001")
		finally:
			frappe.get_doc = original_get_doc

	def test_get_sales_invoice_details_no_outstanding(self):
		"""Test that get_sales_invoice_details throws an error for invoices with no outstanding amount"""
		from unittest.mock import MagicMock
		mock_invoice = MagicMock()
		mock_invoice.name = "ACC-SINV-2026-00002"
		mock_invoice.docstatus = 1
		mock_invoice.outstanding_amount = 0.0
		mock_invoice.grand_total = 100.0
		mock_invoice.currency = "USD"
		mock_invoice.items = []

		original_get_doc = frappe.get_doc
		frappe.get_doc = lambda doctype, name: mock_invoice if doctype == "Sales Invoice" else original_get_doc(doctype, name)
		try:
			self.assertRaises(frappe.ValidationError, get_sales_invoice_details, "ACC-SINV-2026-00002")
		finally:
			frappe.get_doc = original_get_doc

	def test_get_sales_invoice_details_valid(self):
		"""Test that get_sales_invoice_details returns the expected structure for a valid invoice"""
		from unittest.mock import MagicMock
		mock_item = MagicMock()
		mock_item.item_code = "ITEM-001"
		mock_item.item_name = "Test Product"
		mock_item.description = "Test Product Description"
		mock_item.rate = 20.0
		mock_item.qty = 2.0
		mock_item.amount = 40.0
		mock_item.delivery_note = "DN-001"

		mock_invoice = MagicMock()
		mock_invoice.name = "ACC-SINV-2026-00003"
		mock_invoice.docstatus = 1
		mock_invoice.outstanding_amount = 40.0
		mock_invoice.grand_total = 40.0
		mock_invoice.currency = "EUR"
		mock_invoice.items = [mock_item]

		original_get_doc = frappe.get_doc
		frappe.get_doc = lambda doctype, name: mock_invoice if doctype == "Sales Invoice" else original_get_doc(doctype, name)
		try:
			res = get_sales_invoice_details("ACC-SINV-2026-00003")
			self.assertEqual(res["name"], "ACC-SINV-2026-00003")
			self.assertEqual(res["outstanding_amount"], 40.0)
			self.assertEqual(res["currency"], "EUR")
			self.assertEqual(len(res["items"]), 1)
			self.assertEqual(res["items"][0]["item_code"], "ITEM-001")
			self.assertEqual(res["delivery_notes"], ["DN-001"])
		finally:
			frappe.get_doc = original_get_doc
