import { reactive } from 'vue';
import type { PosPlugin, CartItem, POSState, Product, InvoiceResult } from '../types';

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
		const hasHook = plugin.name && plugin.hook &&
			(!Array.isArray(plugin.hook) || plugin.hook.length > 0);
		if (!hasHook) {
			console.error('[EnhancedPOS] Plugin validation failed. Name and at least one hook are required.', plugin);
			return;
		}
		// Avoid duplicate — replace existing if same name
		this.unregister(plugin.name);
		this.state.plugins.push(plugin);
		const hookDisplay = Array.isArray(plugin.hook)
			? plugin.hook.join(', ')
			: plugin.hook;
		console.log(`[EnhancedPOS] Plugin "${plugin.name}" registered for hook(s): [${hookDisplay}].`);
	}

	public unregister(name: string): void {
		this.state.plugins = this.state.plugins.filter(p => p.name !== name);
	}

	public getPluginsForHook(hook: string): PosPlugin[] {
		return this.state.plugins.filter(p =>
			Array.isArray(p.hook)
				? p.hook.includes(hook)
				: p.hook === hook
		);
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

	/**
	 * Fires when the payment mode is selected and confirmed by clicking Next.
	 * Any plugin can return `false` to cancel or block the transition to Step 2.
	 * @returns `true` if all plugins allow, `false` if any cancels.
	 */
	public async triggerOnPaymentModeConfirmed(paymentData: {
		mode_of_payment: string;
		paid_amount: number;
	}): Promise<boolean> {
		const hooks = this.state.plugins.filter(p => p.onPaymentModeConfirmed);
		for (const plugin of hooks) {
			try {
				const result = await plugin.onPaymentModeConfirmed!(paymentData);
				if (result === false) {
					console.warn(`[EnhancedPOS] Payment mode transition halted by plugin "${plugin.name}".`);
					return false;
				}
			} catch (err) {
				console.error(`[EnhancedPOS] Error in onPaymentModeConfirmed for plugin "${plugin.name}":`, err);
				throw err;
			}
		}
		return true;
	}


	/**
	 * Fires before creating the Sales Invoice in ERPNext.
	 * Any plugin can return `false` to cancel the invoice creation.
	 * @returns `true` if all plugins allow, `false` if any cancels.
	 */
	public async triggerBeforeInvoiceCreate(context: {
		items: CartItem[];
		total: number;
		currency: string;
		mode_of_payment: string;
	}): Promise<boolean> {
		const hooks = this.state.plugins.filter(p => p.beforeInvoiceCreate);
		for (const plugin of hooks) {
			try {
				const result = await plugin.beforeInvoiceCreate!(context);
				if (result === false) {
					console.warn(`[EnhancedPOS] Invoice creation halted by plugin "${plugin.name}".`);
					return false;
				}
			} catch (err) {
				console.error(`[EnhancedPOS] Error in beforeInvoiceCreate for plugin "${plugin.name}":`, err);
				throw err;
			}
		}
		return true;
	}

	/** Fires after the unpaid Sales Invoice has been created and submitted. */
	public async triggerAfterInvoiceCreate(invoiceDetails: InvoiceResult): Promise<void> {
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

	/**
	 * Resolves the active payment plugin by matching its name (case-insensitive).
	 * Supports smart name-based fallbacks to Cash and Card plugins.
	 */
	public getPaymentPlugin(name: string): PosPlugin | null {
		if (!name) return null;
		const key = name.toLowerCase();

		// 1. Direct name match
		const direct = this.state.plugins.find(
			p => p.hook === 'new_payment_method' && p.name.toLowerCase() === key
		);
		if (direct) return direct;

		// 2. Fallbacks for cash names
		const isCash = key.includes('cash') || key.includes('efectivo') || key.includes('dinero') || key.includes('caja');
		if (isCash) {
			const cashPlugin = this.state.plugins.find(
				p => p.hook === 'new_payment_method' && p.name.toLowerCase() === 'cash'
			);
			if (cashPlugin) return cashPlugin;
		}

		// 3. Fallbacks for card names
		const isCard = key.includes('card') || key.includes('tarjeta') || key.includes('credit') || key.includes('débito') || key.includes('debito');
		if (isCard) {
			const cardPlugin = this.state.plugins.find(
				p => p.hook === 'new_payment_method' && p.name.toLowerCase() === 'credit card'
			);
			if (cardPlugin) return cardPlugin;
		}

		// 4. Default fallback to Credit Card plugin
		return this.state.plugins.find(
			p => p.hook === 'new_payment_method' && p.name.toLowerCase() === 'credit card'
		) || null;
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
 */
(window as any).EnhancedPos.registerPlugin = (plugin: PosPlugin) => PluginService.register(plugin);
(window as any).EnhancedPos.getPaymentPlugin = (name: string) => PluginService.getPaymentPlugin(name);

export default PluginService;
