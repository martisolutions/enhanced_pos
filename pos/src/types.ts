export interface Product {
	name: string;
	item_code: string;
	item_name: string;
	stock_uom: string;
	sales_uom: string;
	image: string | null;
	standard_rate: number;
	rate: number;
	currency: string | null;
	uom: string;
	batch_no: string | null;
}

export interface CartItem {
	item_code: string;
	item_name: string;
	rate: number;
	qty: number;
	is_invoice_child?: number | boolean;
	parent_invoice_reference?: string;
	is_reference?: number | boolean;
	invoice_reference_key?: string;
}

export type CartGroup =
	| { type: 'invoice'; reference: CartItem; children: CartItem[]; row?: never }
	| { type: 'item'; row: CartItem; reference?: never; children?: never };

export interface VisualSettings {
	theme: string;
	compact_mode: number | boolean;
	show_images: number | boolean;
	show_stock: number | boolean;
}

export interface POSOpeningEntry {
	name: string;
	pos_profile: string;
	company: string;
	currency?: string;
	[key: string]: any;
}

export interface POSState {
	opening_entries: POSOpeningEntry[];
	invoice_type: string;
	show_invoice_picker: number | boolean;
	auto_create_delivery_note: number | boolean;
	enhanced_pos_settings: string;
	visual_settings_defaults: VisualSettings;
	user: string;
}
