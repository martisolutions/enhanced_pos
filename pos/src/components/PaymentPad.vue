<template>
	<div class="epos-payment-layout grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Left Pane: Payment Methods Selection -->
		<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
			<h4 class="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">
				{{ __('Formato de Pago') }}
			</h4>
			<div v-if="allPaymentMethods.length" class="epos-payment-methods flex flex-col gap-2">
				<label
					v-for="method in allPaymentMethods"
					:key="method.value"
					:class="[
						'epos-payment-method flex gap-3 items-center p-3 border rounded-xl cursor-pointer transition select-none',
						selectedMethod === method.value
							? 'border-indigo-600 bg-indigo-50/30 text-indigo-900 font-semibold'
							: 'border-gray-200 hover:bg-gray-50 text-gray-700'
					]"
				>
					<input
						type="radio"
						name="payment_method"
						:value="method.value"
						v-model="selectedMethod"
						class="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
					/>
					<span class="text-sm">{{ method.label }}</span>
				</label>
			</div>
			<div v-else class="epos-empty text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400">
				{{ __('No hay metodos de pago disponibles.') }}
			</div>
		</div>

		<!-- Center Pane: Numeric Keypad and Totals -->
		<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
			<div class="epos-keypad-display-wrap flex gap-2 items-center">
				<div
					ref="keypadDisplayRef"
					class="epos-keypad-display flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-right text-2xl font-bold text-gray-800 font-mono outline-none focus:ring-2 focus:ring-indigo-500"
					tabindex="0"
					@click="focusDisplay"
				>
					{{ displayInput }}
				</div>
				<button
					type="button"
					class="btn btn-danger bg-red-100 hover:bg-red-200 text-red-700 font-bold w-12 h-12 rounded-xl flex items-center justify-center transition"
					@click="$emit('backspace')"
				>
					⌫
				</button>
			</div>

			<div class="epos-keypad-grid grid grid-cols-3 gap-2">
				<button
					v-for="key in keypadKeys"
					:key="key"
					class="btn btn-default border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 p-3 rounded-xl font-bold text-lg transition"
					@click="$emit('pressKey', key)"
				>
					{{ key }}
				</button>
			</div>

			<div class="epos-exact-wrap mt-1">
				<button
					class="btn btn-default border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl font-bold text-sm transition w-full"
					@click="$emit('setExactAmount')"
				>
					{{ __('Importe exacto') }}
				</button>
			</div>

			<div class="epos-totals border-t border-gray-100 pt-3 flex flex-col gap-1 text-sm text-gray-500">
				<div class="flex justify-between">
					<span>{{ __('Total') }}</span>
					<span class="font-semibold text-gray-800">{{ fmtMoney(cartTotal) }}</span>
				</div>
				<div class="flex justify-between text-base font-bold mt-1">
					<span>{{ __('Pendiente') }}</span>
					<span :class="paymentDue > 0 ? 'text-red-500' : 'text-green-600'">
						{{ fmtMoney(paymentDue) }}
					</span>
				</div>
			</div>

			<div class="epos-payment-actions flex gap-2 border-t border-gray-100 pt-3 mt-auto">
				<button
					class="btn btn-default border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition flex-1"
					@click="$emit('back')"
				>
					{{ __('Volver') }}
				</button>
				<button
					class="btn btn-primary bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl font-bold transition flex-1"
					:disabled="!canConfirm"
					@click="onConfirm"
				>
					{{ __('Finalizar compra') }}
				</button>
			</div>
		</div>

		<!-- Right Pane: Plugin Dynamic Slot or Cart Summary -->
		<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
			<h4 class="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">
				{{ __('Resumen / Extensiones') }}
			</h4>

			<!-- Dynamically render active payment method plugin component, if registered -->
			<div v-if="activePaymentPlugin" class="flex-1">
				<component
					v-if="activePaymentPlugin.component"
					:is="activePaymentPlugin.component"
					:amount="paidAmount"
					:cart-total="cartTotal"
					:pending="paymentDue"
					@success="$emit('confirm')"
				/>
				<div v-else class="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
					<p class="font-semibold text-gray-700 mb-1">{{ activePaymentPlugin.name }}</p>
					<p>{{ __('Este metodo de pago cuenta con una extension modular.') }}</p>
				</div>
			</div>
			<div v-else class="flex-1 flex flex-col justify-center items-center py-12 text-center text-gray-400">
				<svg
					class="w-12 h-12 text-gray-300 mb-2"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
					/>
				</svg>
				<p class="text-sm font-medium">{{ __('Listo para procesar el cobro.') }}</p>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import PluginService from '../services/plugins';

export interface MethodOption {
	value: string;
	label: string;
	isPlugin: boolean;
}

export default defineComponent({
	name: 'PaymentPad',
	props: {
		paymentMethods: {
			type: Array as () => string[],
			required: true
		},
		selectedPaymentMethod: {
			type: String,
			required: true
		},
		displayInput: {
			type: String,
			required: true
		},
		paidAmount: {
			type: Number,
			required: true
		},
		cartTotal: {
			type: Number,
			required: true
		},
		paymentDue: {
			type: Number,
			required: true
		},
		canConfirmPayment: {
			type: Boolean,
			required: true
		},
		currency: {
			type: String,
			required: true
		}
	},
	emits: ['update:selectedPaymentMethod', 'pressKey', 'backspace', 'setExactAmount', 'back', 'confirm'],
	setup(props, { emit }) {
		const __ = (text: string) => (window as any).__ ? (window as any).__(text) : text;
		const keypadDisplayRef = ref<HTMLElement | null>(null);
		const keypadKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "."];

		const selectedMethod = computed({
			get() {
				return props.selectedPaymentMethod;
			},
			set(value) {
				emit('update:selectedPaymentMethod', value);
			}
		});

		// Fetch payment plugins registered in window hook 'payment_method'
		const paymentPlugins = computed(() => {
			return PluginService.getPluginsForHook('payment_method');
		});

		// Combine standard payment methods and payment plugins
		const allPaymentMethods = computed<MethodOption[]>(() => {
			const methods: MethodOption[] = props.paymentMethods.map(m => ({
				value: m,
				label: m,
				isPlugin: false
			}));

			paymentPlugins.value.forEach(plugin => {
				// Avoid duplicate standard methods
				if (!methods.some(m => m.value === plugin.name)) {
					methods.push({
						value: plugin.name,
						label: plugin.label || plugin.name,
						isPlugin: true
					});
				}
			});

			return methods;
		});

		const activePaymentPlugin = computed(() => {
			return paymentPlugins.value.find(p => p.name === props.selectedPaymentMethod) || null;
		});

		// If a plugin defines a custom confirm handler (e.g. Stripe checkout), we can override the standard confirm
		const canConfirm = computed(() => {
			if (activePaymentPlugin.value && activePaymentPlugin.value.component) {
				// The plugin component handles confirmation internally (e.g., via iframe or custom buttons)
				return false;
			}
			return props.canConfirmPayment;
		});

		const onConfirm = async () => {
			// Trigger beforePayment hook
			const success = await PluginService.triggerBeforePayment({
				mode_of_payment: props.selectedPaymentMethod,
				paid_amount: props.paidAmount
			});
			if (success) {
				emit('confirm');
			}
		};

		const focusDisplay = () => {
			keypadDisplayRef.value?.focus();
		};

		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), props.currency);
			}
			return `${Number(value || 0).toFixed(2)} ${props.currency}`;
		};

		return {
			__,
			keypadDisplayRef,
			keypadKeys,
			selectedMethod,
			allPaymentMethods,
			activePaymentPlugin,
			canConfirm,
			onConfirm,
			focusDisplay,
			fmtMoney
		};
	}
});
</script>
