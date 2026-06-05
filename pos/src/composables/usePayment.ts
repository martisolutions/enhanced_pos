import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { CartItem, POSState } from '../types';
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
	loadPaymentMethodsImpl: (pos_profile: string) => Promise<any[]>,
	call: (...args: any[]) => Promise<any>,
) {
	// ── State ─────────────────────────────────────────────────────────
	const activeScreen = ref<'sale' | 'payment'>('sale');
	const paymentMethods = ref<string[]>([]);
	const selectedPaymentMethod = ref('');
	const paymentInput = ref('0');

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
			return;
		}
		const rows = await loadPaymentMethodsImpl(profile);
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

	/** Transitions to the payment screen after loading payment methods. */
	const goToPaymentScreen = async (): Promise<void> => {
		if (!cart.value.length) { alert(__('Agrega productos al carrito.')); return; }
		invoiceToPay.value = null;
		await loadPaymentMethods();
		paymentInput.value = String(expectedPaymentTotal.value.toFixed(2));
		activeScreen.value = 'payment';
	};

	/** Returns to the sale screen. */
	const backToSaleScreen = (): void => {
		activeScreen.value = 'sale';
	};

	// ── Confirm payment ───────────────────────────────────────────────

	/** Processes the payment. Runs beforePayment hooks; can be cancelled by plugins. */
	const confirmPayment = async (): Promise<void> => {
		if (!canConfirmPayment.value) return;
		const method = selectedPaymentMethod.value;
		const total = expectedPaymentTotal.value;

		try {
			// Allow plugins to cancel the payment
			const allowed = await PluginService.triggerBeforePayment({
				invoice_name: invoiceToPay.value?.name,
				mode_of_payment: method,
				paid_amount: paymentAmount.value,
			});
			if (!allowed) return;

			// Paying a fetched invoice
			if (invoiceToPay.value?.name) {
				const result = await call('enhanced_pos.api.pos.create_invoice_payment_entry', {
					invoice_name: invoiceToPay.value.name,
					mode_of_payment: method,
					paid_amount: paymentAmount.value,
					create_delivery_note: state.value.auto_create_delivery_note,
				});
				clearCart();
				paymentInput.value = '0';
				activeScreen.value = 'sale';
				alert(__('Pago registrado en {0} por {1}', [result.payment_entry, total]));
				await PluginService.triggerAfterPayment(result);
				return;
			}

			// Standard cart payment
			clearCart();
			paymentInput.value = '0';
			activeScreen.value = 'sale';
			alert(__('Pago confirmado con {0} por {1}', [method, total]));
			await PluginService.triggerAfterPayment({ method, amount: total });
		} catch (e: any) {
			alert(e.message || 'Error processing payment');
		}
	};

	return {
		// State
		activeScreen,
		paymentMethods,
		selectedPaymentMethod,
		paymentInput,
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
	};
}

function __(text: string, args?: any[]): string {
	return (window as any).__ ? (window as any).__(text, args) : text;
}
