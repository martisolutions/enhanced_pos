import { reactive } from 'vue';
import type { PosPlugin, CartItem, POSState, Product } from '../types';

// Re-export types for external consumers
export type { PosPlugin };

class PluginRegistry {
	public state = reactive<{ plugins: PosPlugin[] }>({
		plugins: []
	});

	// ──────────────────────────────────────────────
	// Registration
	// ──────────────────────────────────────────────

	public register(plugin: PosPlugin): void {
		if (!plugin.name || !plugin.hook) {
			console.error('[EnhancedPOS] Plugin validation failed. Name and hook are required.', plugin);
			return;
		}
		// Avoid duplicate — replace existing if same name
		this.unregister(plugin.name);
		this.state.plugins.push(plugin);
		console.log(`[EnhancedPOS] Plugin "${plugin.name}" registered for hook "${plugin.hook}".`);
	}

	public unregister(name: string): void {
		this.state.plugins = this.state.plugins.filter(p => p.name !== name);
	}

	public getPluginsForHook(hook: string): PosPlugin[] {
		return this.state.plugins.filter(p => p.hook === hook);
	}

	// ──────────────────────────────────────────────
	// UI lifecycle triggers
	// ──────────────────────────────────────────────

	/** Fires after the POS session state has been loaded. */
	public triggerOnSessionLoad(state: POSState): void {
		const hooks = this.state.plugins.filter(p => p.onSessionLoad);
		for (const plugin of hooks) {
			try {
				plugin.onSessionLoad!(state);
			} catch (err) {
				console.error(`[EnhancedPOS] Error in onSessionLoad for plugin "${plugin.name}":`, err);
			}
		}
	}

	/** Fires after the product catalog has been fetched. */
	public triggerOnProductsLoad(products: Product[]): void {
		const hooks = this.state.plugins.filter(p => p.onProductsLoad);
		for (const plugin of hooks) {
			try {
				plugin.onProductsLoad!(products);
			} catch (err) {
				console.error(`[EnhancedPOS] Error in onProductsLoad for plugin "${plugin.name}":`, err);
			}
		}
	}

	/** Fires after any mutation to the cart (add, remove, qty change). */
	public triggerOnCartChange(cart: CartItem[]): void {
		const hooks = this.state.plugins.filter(p => p.onCartChange);
		for (const plugin of hooks) {
			try {
				plugin.onCartChange!(cart);
			} catch (err) {
				console.error(`[EnhancedPOS] Error in onCartChange for plugin "${plugin.name}":`, err);
			}
		}
	}

	/** Fires when an item is added to the cart. */
	public triggerOnItemAdd(item: any, cart: CartItem[]): void {
		const hooks = this.state.plugins.filter(p => p.onItemAdd);
		for (const plugin of hooks) {
			try {
				plugin.onItemAdd!(item, cart);
			} catch (err) {
				console.error(`[EnhancedPOS] Error in onItemAdd for plugin "${plugin.name}":`, err);
			}
		}
	}

	/**
	 * Fires before confirming a payment.
	 * Any plugin can return `false` to cancel the payment.
	 * @returns `true` if all plugins allow the payment, `false` if any cancels it.
	 */
	public async triggerBeforePayment(paymentData: {
		invoice_name?: string;
		mode_of_payment: string;
		paid_amount: number;
	}): Promise<boolean> {
		const hooks = this.state.plugins.filter(p => p.beforePayment);
		for (const plugin of hooks) {
			try {
				const result = await plugin.beforePayment!(paymentData);
				if (result === false) {
					console.warn(`[EnhancedPOS] Payment halted by plugin "${plugin.name}".`);
					return false;
				}
			} catch (err) {
				console.error(`[EnhancedPOS] Error in beforePayment for plugin "${plugin.name}":`, err);
				throw err;
			}
		}
		return true;
	}

	/** Fires after the unpaid Sales Invoice has been created and submitted. */
	public async triggerAfterInvoiceCreate(invoiceDetails: {
		name: string;
		outstanding_amount: number;
		grand_total: number;
		currency: string;
		delivery_notes: string[];
	}): Promise<void> {
		const hooks = this.state.plugins.filter(p => p.afterInvoiceCreate);
		for (const plugin of hooks) {
			try {
				await plugin.afterInvoiceCreate!(invoiceDetails);
			} catch (err) {
				console.error(`[EnhancedPOS] Error in afterInvoiceCreate for plugin "${plugin.name}":`, err);
			}
		}
	}

	/** Fires after the payment is confirmed and saved. */
	public async triggerAfterPayment(paymentResult: any): Promise<void> {
		const hooks = this.state.plugins.filter(p => p.afterPayment);
		for (const plugin of hooks) {
			try {
				await plugin.afterPayment!(paymentResult);
			} catch (err) {
				console.error(`[EnhancedPOS] Error in afterPayment for plugin "${plugin.name}":`, err);
			}
		}
	}
}

// ──────────────────────────────────────────────────────────
// Singleton instance
// ──────────────────────────────────────────────────────────
const PluginService = new PluginRegistry();

// ──────────────────────────────────────────────────────────
// Global exposure — other Frappe apps can use window.EnhancedPos
// ──────────────────────────────────────────────────────────
(window as any).EnhancedPos = (window as any).EnhancedPos || {};
(window as any).EnhancedPos.PluginService = PluginService;

/**
 * Register a plugin from any external JS file.
 * @example
 * window.EnhancedPos.registerPlugin({
 *   name: 'my-plugin',
 *   hook: 'catalog_panel',
 *   component: MyVueComponent,
 * });
 */
(window as any).EnhancedPos.registerPlugin = (plugin: PosPlugin) => PluginService.register(plugin);

export default PluginService;
