import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { CartItem, CartGroup, POSState } from '../types';
import PluginService from '../services/plugins';

/**
 * Composable that manages the shopping cart state and operations.
 *
 * @param state - Reactive POS state (from useSession)
 * @param openGenericItemModal - Callback to open the generic "Otros" item modal
 */
export function useCart(
	state: Ref<POSState>,
	openGenericItemModal: () => void,
) {
	// ── State ─────────────────────────────────────────────────────────
	const cart = ref<CartItem[]>([]);
	const invoiceToPay = ref<any>(null);

	// ── Computed ──────────────────────────────────────────────────────
	const cartTotal = computed(() =>
		cart.value.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.rate || 0), 0)
	);

	/**
	 * Groups cart items by invoice reference (for split-pay / invoice fetch flow)
	 * and plain items into a flat list of CartGroup entries.
	 */
	const cartGroups = computed<CartGroup[]>(() => {
		const groups: CartGroup[] = [];
		const childrenByReference: Record<string, CartItem[]> = {};

		for (const row of cart.value) {
			if (!row.parent_invoice_reference) continue;
			(childrenByReference[row.parent_invoice_reference] ||= []).push(row);
		}

		const seenChildren = new Set<CartItem>();
		for (const row of cart.value) {
			if (row.is_reference) {
				const referenceKey = row.invoice_reference_key || row.item_code;
				const children = childrenByReference[referenceKey] || [];
				children.forEach(child => seenChildren.add(child));
				groups.push({ type: 'invoice', reference: row, children });
				continue;
			}
			if (!row.parent_invoice_reference) {
				groups.push({ type: 'item', row });
			}
		}

		// Orphaned children (reference row removed) fall back as plain items
		for (const row of cart.value) {
			if (row.parent_invoice_reference && !seenChildren.has(row)) {
				groups.push({ type: 'item', row });
			}
		}

		return groups;
	});

	// ── Cart mutations ────────────────────────────────────────────────

	/**
	 * Adds an item to the cart. Intercepts the generic item code to open the
	 * custom pricing modal instead of directly adding it.
	 */
	const addToCart = (item: any): void => {
		// Block adding items when a fetched invoice is loaded in the cart
		if (invoiceToPay.value?.name) {
			alert(__('Quita la factura seleccionada antes de agregar otros productos.'));
			return;
		}

		// Intercept generic item → open custom pricing modal
		const baseGenericCode = state.value.generic_item_code || 'Otros';
		if (item.item_code === baseGenericCode || item.item_code === 'Otros') {
			openGenericItemModal();
			return;
		}

		const idx = cart.value.findIndex(row => row.item_code === item.item_code);
		if (idx >= 0) {
			cart.value[idx].qty += 1;
		} else {
			cart.value.push({
				item_code: item.item_code,
				item_name: item.item_name || item.item_code,
				rate: Number(item.rate || 0),
				qty: 1,
			});
		}

		PluginService.triggerOnItemAdd(item, cart.value);
		PluginService.triggerOnCartChange([...cart.value]);
	};

	/** Increases the quantity of a non-reference cart row by 1. */
	const increaseQty = (row: CartItem): void => {
		if (row.is_reference || row.is_invoice_child) return;
		row.qty += 1;
		PluginService.triggerOnCartChange([...cart.value]);
	};

	/** Decreases the quantity of a non-reference cart row by 1; removes it at 0. */
	const decreaseQty = (row: CartItem): void => {
		if (row.is_reference || row.is_invoice_child) return;
		row.qty = Math.max(0, row.qty - 1);
		if (row.qty === 0) {
			cart.value = cart.value.filter(d => d.item_code !== row.item_code);
		}
		PluginService.triggerOnCartChange([...cart.value]);
	};

	/**
	 * Removes an invoice reference row and all its child items from the cart.
	 * Also clears the `invoiceToPay` state.
	 */
	const removeInvoiceReference = (refRow: CartItem): void => {
		invoiceToPay.value = null;
		cart.value = cart.value.filter(
			row =>
				row.item_code !== refRow.item_code &&
				row.parent_invoice_reference !== refRow.invoice_reference_key
		);
		PluginService.triggerOnCartChange([...cart.value]);
	};

	/** Clears the entire cart and resets the invoice payment state. */
	const clearCart = (): void => {
		cart.value = [];
		invoiceToPay.value = null;
		PluginService.triggerOnCartChange([]);
	};

	return {
		// State
		cart,
		invoiceToPay,
		// Computed
		cartTotal,
		cartGroups,
		// Mutations
		addToCart,
		increaseQty,
		decreaseQty,
		removeInvoiceReference,
		clearCart,
	};
}

function __(text: string, args?: any[]): string {
	return (window as any).__ ? (window as any).__(text, args) : text;
}
