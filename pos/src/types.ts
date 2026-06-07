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
	enable_customer_display?: number | boolean;
	customer_display_media?: string;
	media_rotation_interval?: number;
	primary_color?: string;
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
	| 'customer_payment_panel' // Inside the customer display during checkout
	| 'checkout_panel';  // Checkout/payment intent screen on POS main page

/**
 * Lifecycle event hooks that do not render UI but run callbacks at key moments.
 */
export type LifecycleHook =
	| 'onItemAdd'            // After an item is added to the cart
	| 'beforeInvoiceCreate'  // Before creating the Sales Invoice (can cancel if returns false)
	| 'beforePayment'        // Before confirming a payment (can cancel if returns false)
	| 'onPaymentModeConfirmed' // When the payment mode is selected and confirmed
	| 'afterInvoiceCreate'   // After the unpaid Sales Invoice has been created and submitted
	| 'afterPayment'         // After the payment is confirmed and saved
	| 'onSessionLoad'        // After the POS session state is loaded
	| 'onCartChange'         // After any mutation to the cart (add, remove, qty change)
	| 'onProductsLoad'       // After the product catalog is fetched

/**
 * Result returned by createInvoice() — mirrors the backend create_unpaid_invoice response.
 */
export interface InvoiceResult {
	name: string;
	outstanding_amount: number;
	grand_total: number;
	currency: string;
	delivery_notes: string[];
}

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
	/** Connection status of secondary customer display screen */
	customerDisplayConnected: boolean;
	/** Send custom broadcast payload to the customer display */
	broadcastToDisplay: (type: string, payload: any) => void;
	// ── Checkout state & methods ─────────────────────────────────────
	invoiceToPay: any;
	activeScreen: 'idle' | 'itemSelection' | 'selectingPaymentMethod' | 'paymentCheckout' | 'processingPayment' | 'paymentSuccessful' | 'paymentFailed';
	paymentMethod: string;
	paymentAmount: number;
	/**
	 * Creates an unpaid Sales Invoice in ERPNext from the current cart items.
	 * Fires the `beforeInvoiceCreate` hook (can cancel) and `afterInvoiceCreate` hook.
	 * Sets `invoiceToPay` on success so that `confirmPaymentEntry` uses it.
	 *
	 * Call this explicitly from your plugin component when you need the invoice
	 * before processing payment (e.g. Klarna, Stripe, BNPL).
	 *
	 * @returns The invoice data, or `null` if cancelled by a `beforeInvoiceCreate` hook.
	 */
	createInvoice: () => Promise<InvoiceResult | null>;
	/** Finalises the payment: runs beforePayment hook, creates Payment Entry, transitions to paymentSuccessful. */
	confirmPaymentEntry: (paymentEntryData?: any) => Promise<void>;
	/** Cancels (amends/voids) the current unpaid invoice and returns to itemSelection. */
	cancelUnpaidInvoice: () => Promise<void>;
	qrCode: string | null;
	setQrCode: (url: string | null) => void;
	printFormat: string | null;
	printInvoice: (invoiceName?: string) => void;
}

export interface PaymentMethodConfig {
	type: 'cash' | 'card' | 'plugin';
	requiresKeypad: boolean;
	showChange: boolean;
	validateExactAmount?: boolean;
	validateConfirm?: (amount: number, total: number) => boolean;
	inputLabel?: string;
	changeLabel?: string;
	formatInput?: (rawVal: string) => string;
	formatChange?: (changeVal: number) => string;
	hideConfirmButton?: boolean;
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
	 * Hook target(s). Accepts a single hook name or an array of hook names.
	 * Use UIHooks to render a Vue component into POS UI zones,
	 * or LifecycleHooks / arbitrary strings for event-only plugins.
	 *
	 * @example Single hook (backward compatible):
	 *   hook: 'new_payment_method'
	 *
	 * @example Multiple hooks in one registration:
	 *   hook: ['new_payment_method', 'header_action']
	 */
	hook: UIHook | LifecycleHook | string | Array<UIHook | LifecycleHook | string>;

	// ── UI extension ────────────────────────────────────────────────
	/** Vue component to render inside a PluginSlot for UIHooks */
	component?: any;
	/** Vue component to render on the Customer Display for payment checkout screen */
	customerComponent?: any;
	/** Payment capabilities configuration (only for hook: 'new_payment_method') */
	paymentConfig?: PaymentMethodConfig;
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
	 * Called when the payment mode is selected and confirmed (Step 1 → Step 2).
	 * Return `false` to block the transition.
	 */
	onPaymentModeConfirmed?: (paymentData: {
		mode_of_payment: string;
		paid_amount: number;
	}) => Promise<boolean | void> | boolean | void;
	/**
	 * Called before creating the Sales Invoice in ERPNext.
	 * Fires whenever posCtx.createInvoice() is called — either by the core or a plugin.
	 * Return `false` to cancel invoice creation. The flow returns to paymentCheckout.
	 */
	beforeInvoiceCreate?: (context: {
		items: CartItem[];
		total: number;
		currency: string;
		mode_of_payment: string;
	}) => Promise<boolean | void> | boolean | void;
	/**
	 * Called after the unpaid Sales Invoice has been created and submitted in ERPNext.
	 * Receives the invoice data. Cannot cancel.
	 */
	afterInvoiceCreate?: (invoiceDetails: InvoiceResult) => Promise<void> | void;
	/**
	 * Called before confirming a payment (creating the Payment Entry).
	 * Return `false` to cancel the payment. The flow stays in paymentCheckout.
	 */
	beforePayment?: (paymentData: {
		invoice_name?: string;
		mode_of_payment: string;
		paid_amount: number;
	}) => Promise<boolean | void> | boolean | void;
	/** Called after the payment has been confirmed and saved */
	afterPayment?: (paymentResult: any) => Promise<void> | void;
}
