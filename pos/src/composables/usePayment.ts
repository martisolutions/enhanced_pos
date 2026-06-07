import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { CartItem, POSState, InvoiceResult } from '../types';
import PluginService from '../services/plugins';

/**
 * Composable that manages payment keypad state and the confirm-payment flow.
 *
 * @param cart - Reactive cart (from useCart)
 * @param invoiceToPay - Reactive invoice reference (from useCart)
 * @param cartTotal - Computed cart total (from useCart)
 * @param clearCart - Function to clear the cart after successful payment
 * @param state - POS state (from useSession)
 * @param loadPaymentMethodsImpl - Implementation that fetches payment methods from the backend
 * @param call - Frappe API call function
 */
export function usePayment(
	cart: Ref<CartItem[]>,
	invoiceToPay: Ref<any>,
	cartTotal: Ref<number>,
	clearCart: () => void,
	state: Ref<POSState>,
	call: (...args: any[]) => Promise<any>,
) {
	// ── State ─────────────────────────────────────────────────────────
	const activeScreen = ref<'idle' | 'itemSelection' | 'selectingPaymentMethod' | 'paymentCheckout' | 'processingPayment' | 'paymentSuccessful' | 'paymentFailed'>('itemSelection');
	const processingStep = ref<number>(3);
	const paymentMethods = ref<string[]>([]);
	const selectedPaymentMethod = ref('');
	const paymentInput = ref('0');
	const successInvoice = ref('');
	const successTotal = ref(0);
	const printFormat = ref<string | null>(null);

	// ── Computed ──────────────────────────────────────────────────────

	const paymentAmount = computed(() =>
		Number(String(paymentInput.value || '0').replace(',', '.')) || 0
	);

	/**
	 * The total amount expected to be paid:
	 * - If collecting against a fetched invoice → its outstanding amount
	 * - Otherwise → the current cart total
	 */
	const expectedPaymentTotal = computed(() => {
		if (invoiceToPay.value?.outstanding_amount) {
			return Number(invoiceToPay.value.outstanding_amount || 0);
		}
		return cartTotal.value;
	});

	const paymentDue = computed(() =>
		Math.max(expectedPaymentTotal.value - paymentAmount.value, 0)
	);

	const canConfirmPayment = computed(() =>
		!!selectedPaymentMethod.value &&
		cart.value.length > 0 &&
		paymentAmount.value >= expectedPaymentTotal.value
	);

	/** Formatted display string for the keypad input (e.g. "1,234.50") */
	const displayPaymentInput = computed(() => {
		let current = String(paymentInput.value || '0');
		if (current === '') current = '0';
		const hasTrailingDot = current.endsWith('.');
		const parts = current.split('.');
		const integerPart = parts[0].replace(/^0+(?=\d)/, '') || '0';
		const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		if (parts.length > 1) return `${formattedInt}.${parts[1]}`;
		return hasTrailingDot ? `${formattedInt}.` : formattedInt;
	});

	// ── Payment methods ───────────────────────────────────────────────

	/**
	 * Loads available payment methods for the current POS profile.
	 * Selects the first one if none is already selected.
	 */
	const loadPaymentMethods = async (): Promise<void> => {
		const profile =
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(state.value.opening_entries?.[0] as any)?.pos_profile;

		if (!profile) {
			paymentMethods.value = [];
			selectedPaymentMethod.value = '';
			printFormat.value = null;
			return;
		}
		const profileData = await call('enhanced_pos.api.pos.get_profile_data', { pos_profile: profile });
		const rows = profileData.payments || [];
		printFormat.value = profileData.print_format || null;

		paymentMethods.value = (rows || []).map((r: any) => r.mode_of_payment).filter(Boolean);
		if (!selectedPaymentMethod.value && paymentMethods.value.length) {
			selectedPaymentMethod.value = paymentMethods.value[0];
		}
	};

	// ── Keypad operations ─────────────────────────────────────────────

	/** Appends a key press to the payment input. Handles comma → dot normalization. */
	const appendPaymentKey = (key: string): void => {
		const normalized = key === ',' ? '.' : key;
		let current = String(paymentInput.value || '0');
		if (normalized === '.') {
			if (current.includes('.')) return;
			paymentInput.value = `${current}.`;
			return;
		}
		paymentInput.value = current === '0' ? normalized : `${current}${normalized}`;
	};

	/** Removes the last character from the payment input. */
	const removeLastPaymentKey = (): void => {
		const current = String(paymentInput.value || '0');
		if (current.length <= 1) { paymentInput.value = '0'; return; }
		const trimmed = current.slice(0, -1);
		paymentInput.value = trimmed === '' || trimmed === '.' ? '0' : trimmed;
	};

	/** Sets the input to the exact expected total. */
	const setExactAmount = (): void => {
		paymentInput.value = String(expectedPaymentTotal.value.toFixed(2));
	};

	// ── Screen navigation ─────────────────────────────────────────────

	// ── Screen navigation ─────────────────────────────────────────────

	/** Transitions to the payment screen after loading payment methods. */
	const goToPaymentScreen = async (): Promise<void> => {
		if (!cart.value.length) { alert(__('Agrega productos al carrito.')); return; }
		await loadPaymentMethods();
		paymentInput.value = String(expectedPaymentTotal.value.toFixed(2));
		activeScreen.value = 'selectingPaymentMethod';
	};

	/** Returns to the sale screen. */
	const backToSaleScreen = (): void => {
		activeScreen.value = 'itemSelection';
	};

	// ── Confirm payment mode (Step 1 -> Step 2) ─────────────────────────

	const confirmPayment = async (): Promise<void> => {
		if (!selectedPaymentMethod.value) {
			alert(__('Por favor, seleccione un método de pago.'));
			return;
		}
		if (cart.value.length === 0) {
			alert(__('El carrito está vacío.'));
			return;
		}
		const method = selectedPaymentMethod.value;
		const amount = paymentAmount.value;

		try {
			// Trigger the new onPaymentModeConfirmed hook
			const allowed = await PluginService.triggerOnPaymentModeConfirmed({
				mode_of_payment: method,
				paid_amount: amount,
			});
			if (!allowed) return;

			activeScreen.value = 'paymentCheckout';
		} catch (e: any) {
			alert(e.message || __('Error al confirmar el método de pago.'));
		}
	};

	// ── Create unpaid invoice (explicit, plugin-controlled) ─────────────────

	/**
	 * Creates an unpaid Sales Invoice in ERPNext from the current cart.
	 * Fires `beforeInvoiceCreate` (cancellable) then `afterInvoiceCreate` (informational).
	 * On success, sets `invoiceToPay` so confirmPaymentEntry reuses it.
	 *
	 * @returns The invoice data, or null if a beforeInvoiceCreate hook cancelled it.
	 */
	const createInvoice = async (): Promise<InvoiceResult | null> => {
		if (cart.value.length === 0) {
			alert(__('El carrito está vacío.'));
			return null;
		}
		if (invoiceToPay.value) {
			console.warn('[EnhancedPOS] createInvoice() called but invoiceToPay already set. Returning existing invoice.');
			return invoiceToPay.value as InvoiceResult;
		}

		// Hook: beforeInvoiceCreate — any plugin can cancel
		const currency = state.value.opening_entries?.[0]?.currency || 'EUR';
		const allowed = await PluginService.triggerBeforeInvoiceCreate({
			items: cart.value,
			total: cartTotal.value,
			currency,
			mode_of_payment: selectedPaymentMethod.value,
		});
		if (!allowed) return null;

		try {
			const result: InvoiceResult = await call(
				'enhanced_pos.api.pos.create_unpaid_invoice',
				{
					company: state.value.opening_entries?.[0]?.company,
					pos_profile: state.value.opening_entries?.[0]?.pos_profile,
					items: cart.value.filter(item => !item.is_reference),
				}
			);

			invoiceToPay.value = result;

			// Hook: afterInvoiceCreate — informational, cannot cancel
			await PluginService.triggerAfterInvoiceCreate(result);

			return result;
		} catch (e: any) {
			alert(e.message || __('Error al crear la factura.'));
			return null;
		}
	};

	// ── Finalize Purchase & Create Invoice/Payment Entry (Step 2 → Step 3) ──

	const confirmPaymentEntry = async (paymentEntryData?: any): Promise<void> => {
		if (cart.value.length === 0) {
			alert(__('El carrito está vacío.'));
			return;
		}
		const method = selectedPaymentMethod.value;
		const amount = paymentAmount.value;

		activeScreen.value = 'processingPayment';
		processingStep.value = 3;

		try {
			// 1. Run beforePayment hook (plugins can cancel the checkout)
			const allowed = await PluginService.triggerBeforePayment({
				invoice_name: invoiceToPay.value?.name,
				mode_of_payment: method,
				paid_amount: amount,
			});
			if (!allowed) {
				activeScreen.value = 'paymentCheckout';
				return;
			}

			processingStep.value = 4;

			let result;
			if (invoiceToPay.value?.name) {
				// Paying an existing fetched invoice
				result = await call('enhanced_pos.api.pos.create_invoice_payment_entry', {
					invoice_name: invoiceToPay.value.name,
					mode_of_payment: method,
					paid_amount: amount,
					create_delivery_note: state.value.auto_create_delivery_note,
					payment_entry_data: paymentEntryData || null,
				});
			} else {
				// Atomically create invoice AND payment entry in a single step
				result = await call('enhanced_pos.api.pos.create_invoice_with_payment', {
					company: state.value.opening_entries?.[0]?.company,
					pos_profile: state.value.opening_entries?.[0]?.pos_profile,
					items: cart.value.filter(item => !item.is_reference),
					mode_of_payment: method,
					paid_amount: amount,
					create_delivery_note: state.value.auto_create_delivery_note,
				});
			}

			// Broadcast PAYMENT_OK event to the customer display
			const bc = new BroadcastChannel('pos_customer_display');
			bc.postMessage({
				type: 'PAYMENT_OK',
				payload: {
					invoice: result.invoice,
					amount: amount,
				}
			});
			bc.close();

			// Store success values for POS screen
			successInvoice.value = result.invoice || '';
			successTotal.value = amount;

			clearCart();
			paymentInput.value = '0';
			invoiceToPay.value = null;
			activeScreen.value = 'paymentSuccessful';




			const frappe = (window as any).frappe;
			if (frappe?.show_alert) {
				frappe.show_alert({
					message: __('Pago registrado en {0} por {1}', [result.payment_entry, amount]),
					indicator: 'green'
				});
			}
			await PluginService.triggerAfterPayment(result);
		} catch (e: any) {
			activeScreen.value = 'paymentFailed';
			alert(e.message || __('Error al confirmar el cobro.'));
		}
	};

	const cancelUnpaidInvoice = async (): Promise<void> => {
		invoiceToPay.value = null;
		activeScreen.value = 'itemSelection';
	};

	const changePaymentMethod = (): void => {
		activeScreen.value = 'selectingPaymentMethod';
	};

	const printInvoice = (invoiceName?: string): void => {
		const name = invoiceName || successInvoice.value;
		if (!name) return;
		const format = printFormat.value || 'POS Invoice';
		const printUrl = `/printview?doctype=Sales%20Invoice&name=${encodeURIComponent(name)}&format=${encodeURIComponent(format)}&no_letterhead=0`;
		const w = window.open(printUrl, '_blank');
		if (w) {
			w.focus();
		} else {
			const frappe = (window as any).frappe;
			const msg = __('El navegador bloqueó la ventana de impresión. Por favor, permita las ventanas emergentes.');
			if (frappe?.msgprint) {
				frappe.msgprint(msg);
			} else {
				alert(msg);
			}
		}
	};

	return {
		// State
		activeScreen,
		processingStep,
		paymentMethods,
		selectedPaymentMethod,
		paymentInput,
		successInvoice,
		successTotal,
		printFormat,
		printInvoice,
		// Computed
		paymentAmount,
		paymentDue,
		canConfirmPayment,
		displayPaymentInput,
		expectedPaymentTotal,
		// Methods
		loadPaymentMethods,
		appendPaymentKey,
		removeLastPaymentKey,
		setExactAmount,
		goToPaymentScreen,
		backToSaleScreen,
		confirmPayment,
		createInvoice,
		confirmPaymentEntry,
		cancelUnpaidInvoice,
		changePaymentMethod,
	};
}

function __(text: string, args?: any[]): string {
	return (window as any).__ ? (window as any).__(text, args) : text;
}
