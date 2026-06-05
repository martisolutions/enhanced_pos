// ─────────────────────────────────────────────
// Core domain types
// ─────────────────────────────────────────────

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
	period_start_date?: string;
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
	enable_quick_item_creation?: number | boolean;
	enable_generic_item?: number | boolean;
	generic_item_code?: string;
}

// ─────────────────────────────────────────────
// Plugin system types
// ─────────────────────────────────────────────

/**
 * Zones where a plugin can inject a Vue component into the UI.
 * Use these as the `hook` value in your plugin registration.
 */
export type UIHook =
	| 'sale_screen_top'  // Above the entire sale screen (catalog + cart)
	| 'catalog_panel'    // Below the product catalog grid
	| 'cart_panel'       // Below the cart summary
	| 'payment_panel'    // Below the payment keypad
	| 'header_action'    // Extra button/widget in the PosHeader bar
	| 'modal_extra'      // A fully custom modal managed by the plugin

/**
 * Lifecycle event hooks that do not render UI but run callbacks at key moments.
 */
export type LifecycleHook =
	| 'onItemAdd'       // After an item is added to the cart
	| 'beforePayment'   // Before confirming a payment (can cancel if returns false)
	| 'afterPayment'    // After the payment is confirmed and saved
	| 'onSessionLoad'   // After the POS session state is loaded
	| 'onCartChange'    // After any mutation to the cart (add, remove, qty change)
	| 'onProductsLoad'  // After the product catalog is fetched

/**
 * Read-only context object passed to every plugin callback and component prop.
 * Plugins should only interact with the POS through this interface.
 */
export interface PosContext {
	/** Current POS session state (read-only) */
	state: Readonly<POSState>;
	/** Current cart items (read-only snapshot) */
	cart: Readonly<CartItem[]>;
	/** Current product catalog (read-only snapshot) */
	products: Readonly<Product[]>;
	/** Computed cart total */
	cartTotal: number;
	/** Active currency code */
	currency: string;
	/** Add an item to the cart (goes through the standard addToCart flow) */
	addToCart: (item: Partial<Product> & { item_code: string }) => void;
	/** Reload the product catalog */
	loadProducts: (search?: string, group?: string) => Promise<void>;
}

/**
 * A plugin definition. Register with `window.EnhancedPos.registerPlugin(plugin)`.
 */
export interface PosPlugin {
	/** Unique identifier — used to prevent duplicate registrations */
	name: string;
	/** Human-readable display label (used for buttons in `header_action`) */
	label?: string;
	/**
	 * Hook target. Use a UIHook to render a Vue component,
	 * or a LifecycleHook / arbitrary string for event-only plugins.
	 */
	hook: UIHook | LifecycleHook | string;

	// ── UI extension ────────────────────────────────────────────────
	/** Vue component to render inside a PluginSlot for UIHooks */
	component?: any;
	/**
	 * Factory that returns props to pass to the component.
	 * Receives the live PosContext so props stay reactive.
	 */
	props?: (ctx: PosContext) => Record<string, any>;
	/** Extra CSS classes (useful for `header_action` button styling) */
	class?: string;
	/** Click handler (useful for `header_action` buttons without a component) */
	action?: (ctx: PosContext) => void | Promise<void>;
	/** Return true to disable the action/button */
	disabled?: (ctx: PosContext) => boolean;

	// ── Lifecycle callbacks ──────────────────────────────────────────
	/** Called after each item is added to the cart */
	onItemAdd?: (item: any, cart: CartItem[]) => void;
	/** Called after the session state is loaded */
	onSessionLoad?: (state: POSState) => void;
	/** Called after any cart mutation */
	onCartChange?: (cart: CartItem[]) => void;
	/** Called after the product catalog is fetched */
	onProductsLoad?: (products: Product[]) => void;
	/**
	 * Called before confirming a payment.
	 * Return `false` to cancel the payment.
	 */
	beforePayment?: (paymentData: {
		invoice_name?: string;
		mode_of_payment: string;
		paid_amount: number;
	}) => Promise<boolean | void> | boolean | void;
	/** Called after the payment has been confirmed and saved */
	afterPayment?: (paymentResult: any) => Promise<void> | void;
}
