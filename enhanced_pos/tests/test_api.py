import unittest
import frappe
from frappe.tests.utils import FrappeTestCase
from enhanced_pos.api.pos import get_session_state, get_sales_invoice_details, create_quick_item, ensure_generic_item, get_sellable_items, get_enhanced_pos_settings, create_unpaid_invoice, create_invoice_payment_entry, create_invoice_with_payment


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

	def test_create_quick_item_already_exists(self):
		"""Test that create_quick_item throws error if item_code already exists"""
		original_exists = frappe.db.exists
		frappe.db.exists = lambda doctype, name: True if doctype == "Item" else original_exists(doctype, name)
		original_has_permission = frappe.has_permission
		frappe.has_permission = lambda *args, **kwargs: True
		try:
			self.assertRaises(frappe.ValidationError, create_quick_item, "ITEM-001", "Product", "All Item Groups", 10.0)
		finally:
			frappe.db.exists = original_exists
	def test_create_quick_item_success(self):
		"""Test that create_quick_item runs successfully and handles Item Price exists/not exists"""
		from unittest.mock import MagicMock
		original_exists = frappe.db.exists
		original_db_get_value = frappe.db.get_value
		original_has_permission = frappe.has_permission
		original_get_doc = frappe.get_doc

		# Setup mocks
		frappe.db.exists = lambda doctype, name: False
		frappe.has_permission = lambda *args, **kwargs: True

		inserted_docs = []
		mock_doc = MagicMock()
		mock_doc.name = "NEW-ITEM-CODE"
		mock_doc.item_code = "NEW-ITEM-CODE"
		mock_doc.item_name = "New Item Name"
		mock_doc.insert = lambda *args, **kwargs: inserted_docs.append(mock_doc)

		def mock_get_doc(data, *args, **kwargs):
			if isinstance(data, dict):
				if data.get("doctype") in ["Item", "Item Price"]:
					return mock_doc
			return original_get_doc(data, *args, **kwargs)

		frappe.get_doc = mock_get_doc

		# 1. Price doesn't exist
		def mock_db_get_value(doctype, filters=None, fieldname=None, *args, **kwargs):
			if doctype == "Item Price":
				return None
			return original_db_get_value(doctype, filters, fieldname, *args, **kwargs)
		frappe.db.get_value = mock_db_get_value
		try:
			res = create_quick_item("NEW-ITEM-CODE", "New Item Name", "All Item Groups", 50.0, valuation_rate=30.0)
			self.assertEqual(res["item_code"], "NEW-ITEM-CODE")
			self.assertEqual(res["rate"], 50.0)
		finally:
			frappe.db.exists = original_exists
			frappe.db.get_value = original_db_get_value
			frappe.has_permission = original_has_permission
			frappe.get_doc = original_get_doc

	def test_ensure_generic_item_creates_if_not_exists(self):
		"""Test that ensure_generic_item inserts a new item if it does not exist"""
		from unittest.mock import MagicMock
		original_exists = frappe.db.exists
		frappe.db.exists = lambda doctype, name: False if doctype == "Item" else original_exists(doctype, name)

		# Mock Doc Insert
		mock_doc = MagicMock()
		original_get_doc = frappe.get_doc

		inserted = []
		def mock_get_doc(data):
			if isinstance(data, dict) and data.get("doctype") == "Item":
				mock_doc.insert = lambda *args, **kwargs: inserted.append(data)
				return mock_doc
			return original_get_doc(data)

		frappe.get_doc = mock_get_doc
		try:
			ensure_generic_item("Otros")
			self.assertEqual(len(inserted), 1)
			self.assertEqual(inserted[0]["item_code"], "Otros")
		finally:
			frappe.db.exists = original_exists
			frappe.get_doc = original_get_doc

	def test_get_sellable_items_item_group(self):
		"""Test that get_sellable_items correctly filters items by item group and handles descendants"""
		original_get_all = frappe.get_all
		original_get_descendants = frappe.db.get_descendants

		frappe.db.get_descendants = lambda doctype, parent: ["Subcategory"]
		filters_passed = []
		def mock_get_all(doctype, *args, **kwargs):
			if doctype == "Item":
				filters = kwargs.get("filters") or (args[0] if args else None)
				filters_passed.append(filters)
				return [{"item_code": "TEST-ITEM", "standard_rate": 10.0}]
			return original_get_all(doctype, *args, **kwargs)

		frappe.get_all = mock_get_all
		try:
			get_sellable_items(item_group="Root Category")
			self.assertEqual(len(filters_passed), 1)
			self.assertIn("Root Category", filters_passed[0]["item_group"][1])
			self.assertIn("Subcategory", filters_passed[0]["item_group"][1])
		finally:
			frappe.get_all = original_get_all
			frappe.db.get_descendants = original_get_descendants

	def test_get_enhanced_pos_settings_keys(self):
		"""Test that get_enhanced_pos_settings returns all settings including customer display config"""
		from unittest.mock import MagicMock
		mock_settings = MagicMock()
		mock_settings.name = "Test Settings"
		mock_settings.settings_title = "Test Settings Title"
		mock_settings.show_invoice_picker = 1
		mock_settings.auto_create_delivery_note = 1
		mock_settings.enable_quick_item_creation = 1
		mock_settings.enable_generic_item = 1
		mock_settings.generic_item_code = "Otros"
		mock_settings.show_images = 1
		mock_settings.enable_customer_display = 1
		mock_settings.customer_display_media = "http://example.com/promo.mp4"
		mock_settings.media_rotation_interval = 15
		mock_settings.primary_color = "#ff0000"
		mock_settings.get = lambda key, default=None: getattr(mock_settings, key, default)

		original_get_doc = frappe.get_doc
		frappe.get_doc = lambda doctype, name: mock_settings if doctype == "Enhanced POS Settings" else original_get_doc(doctype, name)
		try:
			res = get_enhanced_pos_settings("Test Settings")
			self.assertEqual(res["name"], "Test Settings")
			self.assertEqual(res["enable_customer_display"], 1)
			self.assertEqual(res["customer_display_media"], "http://example.com/promo.mp4")
			self.assertEqual(res["media_rotation_interval"], 15)
			self.assertEqual(res["primary_color"], "#ff0000")
		finally:
			frappe.get_doc = original_get_doc

	def test_create_unpaid_invoice_success(self):
		"""Test that create_unpaid_invoice inserts and submits a Sales Invoice with correct data"""
		from unittest.mock import MagicMock
		mock_invoice = MagicMock()
		mock_invoice.name = "ACC-SINV-2026-99999"
		mock_invoice.outstanding_amount = 50.0
		mock_invoice.grand_total = 50.0
		mock_invoice.currency = "EUR"
		mock_invoice.items = []

		original_get_doc = frappe.get_doc
		original_db_get_value = frappe.db.get_value

		def mock_get_doc(data):
			if isinstance(data, dict) and data.get("doctype") == "Sales Invoice":
				return mock_invoice
			return original_get_doc(data)

		frappe.get_doc = mock_get_doc
		frappe.db.get_value = lambda doctype, filters, fieldname=None, *args, **kwargs: "Generico" if doctype == "POS Profile" else "Nos"

		try:
			res = create_unpaid_invoice(
				company="Test Company",
				pos_profile="Caja 1",
				items=[{"item_code": "ITEM-001", "qty": 2, "rate": 25.0}]
			)
			self.assertEqual(res["name"], "ACC-SINV-2026-99999")
			self.assertEqual(res["outstanding_amount"], 50.0)
			self.assertEqual(res["grand_total"], 50.0)
			self.assertTrue(mock_invoice.insert.called)
			self.assertTrue(mock_invoice.submit.called)
		finally:
			frappe.get_doc = original_get_doc
			frappe.db.get_value = original_db_get_value

	def test_create_invoice_payment_entry_with_metadata(self):
		"""Test that create_invoice_payment_entry applies payment_entry_data metadata to the Payment Entry"""
		from unittest.mock import MagicMock
		
		mock_invoice = MagicMock()
		mock_invoice.name = "ACC-SINV-2026-99999"
		mock_invoice.docstatus = 1
		mock_invoice.outstanding_amount = 100.0
		mock_invoice.grand_total = 100.0
		mock_invoice.currency = "USD"
		mock_invoice.company = "Test Company"
		mock_invoice.items = []

		mock_pe = MagicMock()
		mock_pe.references = [MagicMock()]

		original_get_doc = frappe.get_doc
		original_db_get_value = frappe.db.get_value
		
		import enhanced_pos.api.pos
		original_gpe = enhanced_pos.api.pos.get_payment_entry
		enhanced_pos.api.pos.get_payment_entry = lambda *args, **kwargs: mock_pe

		frappe.get_doc = lambda doctype, name: mock_invoice if doctype == "Sales Invoice" else original_get_doc(doctype, name)

		def mock_db_get_value(doctype, filters=None, fieldname=None, *args, **kwargs):
			if doctype == "Mode of Payment Account":
				return "Bank Account"
			return original_db_get_value(doctype, filters, fieldname, *args, **kwargs)
		frappe.db.get_value = mock_db_get_value
		
		try:
			res = create_invoice_payment_entry(
				invoice_name="ACC-SINV-2026-99999",
				mode_of_payment="Cash",
				paid_amount=100.0,
				payment_entry_data={"reference_no": "REF-9999", "remarks": "TPV Cash"}
			)
			self.assertEqual(res["invoice"], "ACC-SINV-2026-99999")
			mock_pe.set.assert_any_call("reference_no", "REF-9999")
			mock_pe.set.assert_any_call("remarks", "TPV Cash")
			self.assertTrue(mock_pe.insert.called)
			self.assertTrue(mock_pe.submit.called)
		finally:
			frappe.get_doc = original_get_doc
			frappe.db.get_value = original_db_get_value
			enhanced_pos.api.pos.get_payment_entry = original_gpe

	def test_create_invoice_with_payment(self):
		"""Test that create_invoice_with_payment creates an invoice and registers payment successfully"""
		from unittest.mock import MagicMock
		
		mock_invoice = MagicMock()
		mock_invoice.name = "ACC-SINV-2026-99999"
		mock_invoice.docstatus = 1
		mock_invoice.outstanding_amount = 100.0
		mock_invoice.grand_total = 100.0
		mock_invoice.currency = "USD"
		mock_invoice.company = "Test Company"
		mock_invoice.items = []

		mock_pe = MagicMock()
		mock_pe.references = [MagicMock()]
		mock_pe.name = "PE-2026-00001"

		original_get_doc = frappe.get_doc
		original_db_get_value = frappe.db.get_value
		
		import enhanced_pos.api.pos
		original_gpe = enhanced_pos.api.pos.get_payment_entry
		enhanced_pos.api.pos.get_payment_entry = lambda *args, **kwargs: mock_pe

		def mock_get_doc(data, *args, **kwargs):
			if isinstance(data, dict) and data.get("doctype") == "Sales Invoice":
				return mock_invoice
			if isinstance(data, str) and data == "Sales Invoice":
				return mock_invoice
			return original_get_doc(data, *args, **kwargs)
		frappe.get_doc = mock_get_doc


		def mock_db_get_value(doctype, filters=None, fieldname=None, *args, **kwargs):
			if doctype == "Mode of Payment Account":
				return "Bank Account"
			if doctype == "POS Profile":
				return "Generico"
			return original_db_get_value(doctype, filters, fieldname, *args, **kwargs)
		frappe.db.get_value = mock_db_get_value
		
		try:
			res = create_invoice_with_payment(
				company="Test Company",
				pos_profile="Caja 1",
				items=[{"item_code": "ITEM-001", "qty": 2, "rate": 50.0}],
				mode_of_payment="Cash",
				paid_amount=100.0,
			)
			self.assertEqual(res["invoice"], "ACC-SINV-2026-99999")
			self.assertEqual(res["payment_entry"], "PE-2026-00001")
			self.assertEqual(res["allocated_amount"], 100.0)
			self.assertTrue(mock_invoice.insert.called)
			self.assertTrue(mock_invoice.submit.called)
			self.assertTrue(mock_pe.insert.called)
			self.assertTrue(mock_pe.submit.called)
		finally:
			frappe.get_doc = original_get_doc
			frappe.db.get_value = original_db_get_value
			enhanced_pos.api.pos.get_payment_entry = original_gpe



