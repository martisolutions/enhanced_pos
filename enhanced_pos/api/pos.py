import json

import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate

from erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry import make_closing_entry_from_opening
from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
from erpnext.accounts.doctype.sales_invoice.sales_invoice import make_delivery_note
from erpnext.selling.page.point_of_sale.point_of_sale import (
	check_opening_entry,
	create_opening_voucher,
	get_past_order_list,
	get_pos_profile_data,
)
from erpnext.stock.get_item_details import get_conversion_factor


def _as_list(value):
	if isinstance(value, str):
		return json.loads(value)
	if isinstance(value, list):
		return value
	return []


def _get_mode_of_payment_account(mode_of_payment, company):
	return frappe.db.get_value(
		"Mode of Payment Account",
		{
			"parenttype": "Mode of Payment",
			"parent": mode_of_payment,
			"company": company,
		},
		"default_account",
	)


@frappe.whitelist()
def get_session_state():
	user = frappe.session.user
	opening_entries = check_opening_entry(user)
	invoice_type = frappe.db.get_single_value("POS Settings", "invoice_type")

	pos_plugins_js = frappe.get_hooks("enhanced_pos_js") or []
	pos_plugins_css = frappe.get_hooks("enhanced_pos_css") or []

	return {
		"opening_entries": opening_entries,
		"invoice_type": invoice_type,
		"visual_settings_defaults": {
			"theme": "forest",
			"compact_mode": 0,
			"show_images": 1,
			"show_stock": 1,
		},
		"show_invoice_picker": 0,
		"user": user,
		"plugins_js": pos_plugins_js,
		"plugins_css": pos_plugins_css,
	}


@frappe.whitelist()
def create_opening_entry(pos_profile, company, balance_details):
	rows = _as_list(balance_details)
	if not rows:
		frappe.throw(_("Opening balance details are required."))

	# Reuse ERPNext's core opening voucher flow to preserve validations.
	return create_opening_voucher(pos_profile, company, json.dumps(rows))


@frappe.whitelist()
def get_profile_data(pos_profile):
	return get_pos_profile_data(pos_profile)


@frappe.whitelist()
def get_enhanced_pos_settings(settings_name):
	settings = frappe.get_doc("Enhanced POS Settings", settings_name)
	return {
		"name": settings.name,
		"settings_title": settings.settings_title,
		"show_invoice_picker": settings.show_invoice_picker,
		"auto_create_delivery_note": settings.auto_create_delivery_note,
		"enable_quick_item_creation": settings.get("enable_quick_item_creation") or 0,
		"enable_generic_item": settings.get("enable_generic_item") or 0,
		"generic_item_code": settings.get("generic_item_code"),
		"show_images": settings.get("show_images") if settings.get("show_images") is not None else 1,
		"enable_customer_display": settings.get("enable_customer_display") or 0,
		"customer_display_media": settings.get("customer_display_media") or "",
		"media_rotation_interval": settings.get("media_rotation_interval") if settings.get("media_rotation_interval") is not None else 10,
		"primary_color": settings.get("primary_color") or "#4f46e5",
	}


@frappe.whitelist()
def get_default_enhanced_pos_settings():
	settings_name = frappe.db.get_value("Enhanced POS Settings", {}, "name", order_by="modified desc")
	if not settings_name:
		return {}
	return get_enhanced_pos_settings(settings_name)


@frappe.whitelist()
def create_quick_item(item_code, item_name, item_group, standard_rate, valuation_rate=None, pos_profile=None):
	if not frappe.has_permission("Item", "create"):
		frappe.throw(_("No tienes permisos para crear artículos."))

	if frappe.db.exists("Item", item_code):
		frappe.throw(_("El código de artículo {0} ya existe.").format(item_code))

	# Default stock uom
	stock_uom = frappe.db.get_value("UOM", {"name": ["in", ["Nos", "Unidad", "Unit"]]}, "name") or "Nos"

	item = frappe.get_doc({
		"doctype": "Item",
		"item_code": item_code,
		"item_name": item_name,
		"item_group": item_group,
		"stock_uom": stock_uom,
		"is_sales_item": 1,
		"is_stock_item": 0,
		"standard_rate": flt(standard_rate),
		"valuation_rate": flt(valuation_rate) if valuation_rate else 0.0,
	})
	item.insert()

	# Create Item Price in Selling Price List
	price_list = None
	if pos_profile:
		price_list = frappe.db.get_value("POS Profile", pos_profile, "selling_price_list")
	if not price_list:
		price_list = frappe.get_single_value("Selling Settings", "selling_price_list")

	if price_list:
		existing_price_name = frappe.db.get_value("Item Price", {
			"price_list": price_list,
			"item_code": item_code
		})
		if existing_price_name:
			frappe.db.set_value("Item Price", existing_price_name, "price_list_rate", flt(standard_rate))
		else:
			item_price = frappe.get_doc({
				"doctype": "Item Price",
				"price_list": price_list,
				"item_code": item_code,
				"price_list_rate": flt(standard_rate),
				"selling": 1,
			})
			item_price.insert()

	# Create/Update Item Price in Buying Price List
	if valuation_rate and flt(valuation_rate) > 0:
		buying_price_list = frappe.get_single_value("Buying Settings", "buying_price_list") or "Standard Buying"
		existing_buying_price = frappe.db.get_value("Item Price", {
			"price_list": buying_price_list,
			"item_code": item_code
		})
		if existing_buying_price:
			frappe.db.set_value("Item Price", existing_buying_price, "price_list_rate", flt(valuation_rate))
		else:
			item_buying_price = frappe.get_doc({
				"doctype": "Item Price",
				"price_list": buying_price_list,
				"item_code": item_code,
				"price_list_rate": flt(valuation_rate),
				"buying": 1,
				"selling": 0,
			})
			item_buying_price.insert()

	return {
		"name": item.name,
		"item_code": item.item_code,
		"item_name": item.item_name,
		"rate": flt(standard_rate),
		"image": None,
	}


@frappe.whitelist()
def ensure_generic_item(item_code="Otros"):
	if not frappe.db.exists("Item", item_code):
		stock_uom = frappe.db.get_value("UOM", {"name": ["in", ["Nos", "Unidad", "Unit"]]}, "name") or "Nos"
		item_group = frappe.db.get_value("Item Group", {}, "name") or "All Item Groups"
		item = frappe.get_doc({
			"doctype": "Item",
			"item_code": item_code,
			"item_name": "Otros",
			"item_group": item_group,
			"stock_uom": stock_uom,
			"is_sales_item": 1,
			"is_stock_item": 0,
			"standard_rate": 0.0,
		})
		item.insert(ignore_permissions=True)
	return item_code


@frappe.whitelist()
def get_sales_invoice_details(invoice_name):
	invoice = frappe.get_doc("Sales Invoice", invoice_name)
	if invoice.docstatus != 1:
		frappe.throw(_("Solo se pueden procesar facturas confirmadas."))
	if invoice.outstanding_amount <= 0:
		frappe.throw(_("Esta factura no tiene saldo pendiente."))
	delivery_notes = sorted({d.delivery_note for d in invoice.items if d.delivery_note})

	return {
		"name": invoice.name,
		"grand_total": invoice.grand_total,
		"outstanding_amount": invoice.outstanding_amount,
		"currency": invoice.currency,
		"delivery_notes": delivery_notes,
		"items": [
			{
				"item_code": item.item_code,
				"item_name": item.item_name,
				"description": item.description,
				"rate": item.rate,
				"qty": item.qty,
				"amount": item.amount,
			} for item in invoice.items
		],
	}


@frappe.whitelist()
def create_invoice_payment_entry(invoice_name, mode_of_payment, paid_amount=None, create_delivery_note=0, payment_entry_data=None):
	invoice = frappe.get_doc("Sales Invoice", invoice_name)
	if invoice.docstatus != 1:
		frappe.throw(_("Solo se pueden procesar facturas confirmadas."))

	outstanding_amount = flt(invoice.outstanding_amount)
	if outstanding_amount <= 0:
		frappe.throw(_("La factura ya esta pagada."))

	allocated_amount = flt(paid_amount) if paid_amount is not None else outstanding_amount
	if allocated_amount <= 0:
		frappe.throw(_("El importe de pago debe ser mayor que cero."))
	allocated_amount = min(allocated_amount, outstanding_amount)

	bank_account = _get_mode_of_payment_account(mode_of_payment, invoice.company)
	pe = get_payment_entry(
		"Sales Invoice",
		invoice.name,
		party_amount=allocated_amount,
		bank_account=bank_account,
		reference_date=nowdate(),
	)
	pe.mode_of_payment = mode_of_payment

	if pe.references:
		pe.references[0].allocated_amount = allocated_amount

	delivery_note_name = None
	if frappe.utils.cint(create_delivery_note):
		if not any(d.delivery_note for d in invoice.items):
			delivery_note = make_delivery_note(invoice.name)
			delivery_note.flags.ignore_permissions = True
			delivery_note.insert()
			delivery_note.submit()
			delivery_note_name = delivery_note.name
		else:
			delivery_note_name = ", ".join(sorted({d.delivery_note for d in invoice.items if d.delivery_note}))

	delivery_notes = sorted({d.delivery_note for d in invoice.items if d.delivery_note})
	if delivery_notes:
		delivery_notes_text = ", ".join(delivery_notes)
		pe.remarks = f"{(pe.remarks or '').strip()}\nDelivery Notes: {delivery_notes_text}".strip()
	if delivery_note_name and delivery_note_name not in delivery_notes:
		pe.remarks = f"{(pe.remarks or '').strip()}\nDelivery Note Created: {delivery_note_name}".strip()

	# Custom payment metadata (TPV, card reference, etc.)
	if payment_entry_data:
		if isinstance(payment_entry_data, str):
			payment_entry_data = json.loads(payment_entry_data)
		for key, val in payment_entry_data.items():
			pe.set(key, val)

	if not pe.reference_no:
		pe.reference_no = f"POS-{invoice.name}"
	if not pe.reference_date:
		pe.reference_date = nowdate()

	pe.flags.ignore_permissions = True
	pe.insert()
	pe.submit()

	return {
		"payment_entry": pe.name,
		"invoice": invoice.name,
		"allocated_amount": allocated_amount,
		"delivery_notes": delivery_notes,
		"delivery_note_created": delivery_note_name,
	}


@frappe.whitelist()
def create_unpaid_invoice(company, pos_profile, items, customer=None):
	if isinstance(items, str):
		items = json.loads(items)

	if not customer:
		customer = frappe.db.get_value("POS Profile", pos_profile, "customer")
	if not customer:
		customer = frappe.db.get_value("Customer", {}, "name")
	if not customer:
		frappe.throw(_("Debe configurar un cliente por defecto en el POS Profile."))

	invoice = frappe.get_doc({
		"doctype": "Sales Invoice",
		"customer": customer,
		"company": company,
		"pos_profile": pos_profile,
		"is_pos": 1,
		"update_stock": 1,
		"items": [
			{
				"item_code": item.get("item_code").split("::")[0],
				"qty": flt(item.get("qty")),
				"rate": flt(item.get("rate")),
				"uom": item.get("uom") or frappe.db.get_value("Item", item.get("item_code").split("::")[0], "stock_uom") or "Nos",
			} for item in items if not item.get("is_reference")
		]
	})

	invoice.set_missing_values()
	invoice.insert(ignore_permissions=True)
	invoice.submit()

	delivery_notes = sorted({d.delivery_note for d in invoice.items if d.delivery_note})

	return {
		"name": invoice.name,
		"outstanding_amount": flt(invoice.outstanding_amount),
		"grand_total": flt(invoice.grand_total),
		"currency": invoice.currency,
		"delivery_notes": delivery_notes,
	}


@frappe.whitelist()
def cancel_unpaid_invoice(invoice_name):
	invoice = frappe.get_doc("Sales Invoice", invoice_name)
	if invoice.docstatus == 1:
		invoice.cancel()
	return True


@frappe.whitelist()
def get_recent_orders(status="Paid", search_term="", limit=20):
	return get_past_order_list(search_term=search_term, status=status, limit=limit)


@frappe.whitelist()
def create_closing_entry_from_opening(pos_opening_entry):
	opening = frappe.get_doc("POS Opening Entry", pos_opening_entry)
	closing_entry = make_closing_entry_from_opening(opening)
	closing_entry.insert()

	return {
		"name": closing_entry.name,
		"doctype": closing_entry.doctype,
		"docstatus": closing_entry.docstatus,
	}


@frappe.whitelist()
def get_sellable_items(search_term="", limit=40, pos_profile=None, item_group=None):
	limit = max(1, min(frappe.utils.cint(limit) or 40, 100))
	filters = {
		"disabled": 0,
		"is_sales_item": 1,
		"has_variants": 0,
	}
	if item_group and item_group != "All Item Groups":
		descendants = frappe.db.get_descendants("Item Group", item_group)
		item_groups = [item_group] + descendants
		filters["item_group"] = ["in", item_groups]

	or_filters = []
	if search_term:
		like_term = f"%{search_term.strip()}%"
		or_filters = [
			{"item_code": ["like", like_term]},
			{"item_name": ["like", like_term]},
		]

	items = frappe.get_all(
		"Item",
		filters=filters,
		or_filters=or_filters,
		fields=["name", "item_code", "item_name", "stock_uom", "sales_uom", "image", "standard_rate"],
		order_by="modified desc",
		limit_page_length=limit,
	)

	price_list = None
	if pos_profile:
		price_list = frappe.db.get_value("POS Profile", pos_profile, "selling_price_list")
	if not price_list:
		price_list = frappe.get_single_value("Selling Settings", "selling_price_list")

	item_codes = [item["item_code"] for item in items]
	item_prices_by_item = {}
	if price_list and item_codes:
		item_prices = frappe.get_all(
			"Item Price",
			filters={
				"price_list": price_list,
				"selling": 1,
				"item_code": ["in", item_codes],
			},
			fields=["item_code", "uom", "currency", "price_list_rate", "batch_no", "valid_from", "valid_upto"],
			order_by="valid_from desc, creation desc",
		)

		current_date = getdate(frappe.utils.today())
		for price in item_prices:
			if price.get("valid_from") and getdate(price.get("valid_from")) > current_date:
				continue
			if price.get("valid_upto") and getdate(price.get("valid_upto")) < current_date:
				continue
			item_prices_by_item.setdefault(price["item_code"], []).append(price)

	for item in items:
		item["rate"] = frappe.utils.flt(item.get("standard_rate"))
		item["currency"] = None
		item["uom"] = item.get("stock_uom")
		item["batch_no"] = None

		if price_list and item["item_code"] in item_prices_by_item:
			prices = item_prices_by_item[item["item_code"]]
			item_uom = item["stock_uom"]
			item_uom_price = next((p for p in prices if p.get("uom") == item["stock_uom"]), None)

			if item.get("sales_uom") and item["sales_uom"] != item["stock_uom"]:
				item_uom = item["sales_uom"]
				sales_uom_price = next((p for p in prices if p.get("uom") == item["sales_uom"]), None)
				if sales_uom_price:
					item_uom_price = sales_uom_price

			if not item_uom_price:
				item_uom_price = prices[0]
				item_uom = item_uom_price.get("uom") or item_uom

			conversion_factor = get_conversion_factor(item["item_code"], item_uom).get("conversion_factor", 1)

			if item_uom_price and item_uom != item_uom_price.get("uom"):
				item_uom_price["price_list_rate"] = frappe.utils.flt(item_uom_price.get("price_list_rate")) * conversion_factor

			if item_uom_price:
				item["rate"] = frappe.utils.flt(item_uom_price.get("price_list_rate"))
				item["currency"] = item_uom_price.get("currency")
				item["uom"] = item_uom
				item["batch_no"] = item_uom_price.get("batch_no")

	return items
