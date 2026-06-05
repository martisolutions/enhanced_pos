<template>
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in-backdrop">
		<!-- Main Dialog Card -->
		<div class="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-4xl w-full flex flex-col overflow-hidden animate-scale-in max-h-[90vh]">
			
			<!-- ── Stepper Header ────────────────────────────────────────── -->
			<div class="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<div>
						<h3 class="font-black text-slate-800 text-lg tracking-tight">
							{{ __('Pasarela de Pago') }}
						</h3>
						<p class="text-xs text-slate-400 font-medium">
							{{ getStepSubtitle() }}
						</p>
					</div>
				</div>

				<!-- Step indicators -->
				<div class="flex items-center gap-2">
					<div
						v-for="step in [1, 2, 3]"
						:key="step"
						class="flex items-center"
					>
						<div
							:class="[
								'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
								getCurrentStep() === step
									? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-110'
									: getCurrentStep() > step
										? 'bg-emerald-500 text-white'
										: 'bg-slate-100 text-slate-400'
							]"
						>
							<span v-if="getCurrentStep() > step">✓</span>
							<span v-else>{{ step }}</span>
						</div>
						<div
							v-if="step < 3"
							:class="[
								'w-12 h-1 rounded-full mx-1 transition-all duration-300',
								getCurrentStep() > step ? 'bg-emerald-500' : 'bg-slate-100'
							]"
						></div>
					</div>
				</div>
			</div>

			<!-- ── Scrollable Body ───────────────────────────────────────── -->
			<div class="flex-grow overflow-y-auto p-8">
				<transition name="fade-slide" mode="out-in">
					
					<!-- ── STEP 1: Select Payment Mode ──────────────────────── -->
					<div v-if="activeScreen === 'selectPaymentMode'" key="step-select" class="flex flex-col gap-6">
						<h4 class="font-bold text-slate-800 text-base tracking-tight text-center sm:text-left">
							{{ __('Selecciona el método de pago:') }}
						</h4>
						
						<div v-if="allPaymentMethods.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							<div
								v-for="method in allPaymentMethods"
								:key="method.value"
								:class="[
									'border-2 rounded-2xl p-5 cursor-pointer flex flex-col items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 select-none relative',
									selectedMethod === method.value
										? 'border-indigo-600 bg-indigo-50/20 shadow-md shadow-indigo-600/5'
										: 'border-slate-100 hover:border-slate-300 bg-white hover:shadow-sm'
								]"
								@click="selectAndNext(method.value)"
							>
								<!-- Selected checkmark indicator -->
								<div v-if="selectedMethod === method.value" class="absolute top-3 right-3 text-indigo-600">
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
									</svg>
								</div>

								<!-- SVG Icon Wrapper -->
								<div :class="['w-16 h-16 rounded-2xl flex items-center justify-center transition-colors', selectedMethod === method.value ? 'bg-indigo-100/50 text-indigo-600' : 'bg-slate-50 text-slate-400']">
									<!-- Cash Icon -->
									<svg v-if="isCash(method.value)" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
									<!-- Card Icon -->
									<svg v-else-if="isCard(method.value)" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
									</svg>
									<!-- Plugin/Other Icon -->
									<svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
									</svg>
								</div>
								
								<span :class="['text-sm font-bold text-center tracking-tight', selectedMethod === method.value ? 'text-indigo-900 font-black' : 'text-slate-700']">
									{{ method.label }}
								</span>
							</div>
						</div>
						
						<div v-else class="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400">
							{{ __('No hay métodos de pago disponibles.') }}
						</div>
					</div>

					<!-- ── STEP 2: Checkout Details (Keypad / Card intent) ──────── -->
					<div v-else-if="activeScreen === 'checkout'" key="step-checkout">
						<div class="grid grid-cols-1 md:grid-cols-12 gap-8">
							
							<!-- Details Left Pane (Centered 8 columns if not Cash, otherwise 6 columns) -->
							<div :class="isCash(selectedMethod) ? 'md:col-span-6 flex flex-col gap-6' : 'md:col-span-8 md:col-start-3 flex flex-col gap-6'">
								
								<!-- Amount Display Card -->
								<div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col gap-4">
									<div>
										<span class="text-xs font-bold uppercase tracking-wider text-slate-400">
											{{ __('Total a pagar') }}
										</span>
										<h2 class="text-3xl font-black text-slate-800 tracking-tight leading-none mt-1 font-mono">
											{{ fmtMoney(cartTotal) }}
										</h2>
									</div>

									<div class="border-t border-slate-200/60 pt-4 flex flex-col gap-2.5 text-sm">
										<div class="flex justify-between">
											<span class="text-slate-400 font-medium">{{ __('Método de Pago:') }}</span>
											<span class="font-bold text-slate-700">{{ selectedMethod }}</span>
										</div>
										<!-- Show input and change ONLY for Cash -->
										<template v-if="isCash(selectedMethod)">
											<div class="flex justify-between items-center bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm mt-1">
												<span class="text-slate-400 font-medium pl-1">{{ __('Efectivo Recibido:') }}</span>
												<span class="font-black text-indigo-600 font-mono text-xl">{{ displayInput }}</span>
											</div>
											<div class="flex justify-between mt-1 text-base font-bold">
												<span class="text-slate-500">{{ __('Cambio a devolver:') }}</span>
												<span class="font-mono text-emerald-600 font-black">
													{{ fmtMoney(Math.max(paidAmount - cartTotal, 0)) }}
												</span>
											</div>
										</template>
									</div>
								</div>

								<!-- Integration Section for Cards / External Plugins -->
								<div v-if="!isCash(selectedMethod)" class="flex-grow flex flex-col justify-center">
									<!-- Dynamic Payment Method Plugin component -->
									<div v-if="activePaymentPlugin && activePaymentPlugin.component" class="w-full">
										<component
											:is="activePaymentPlugin.component"
											:amount="paidAmount"
											:cart-total="cartTotal"
											:pending="paymentDue"
											@success="$emit('confirmPaymentEntry')"
										/>
									</div>
									
									<!-- Card Simulation placeholder -->
									<div v-else-if="isCard(selectedMethod)" class="bg-indigo-50/15 border border-indigo-100/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
										<div class="w-16 h-16 rounded-full bg-indigo-50/30 flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
											<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<p class="font-bold text-slate-700 text-sm">
											{{ __('Por favor, pulse en confirmar pago cuando se haya completado la transacción.') }}
										</p>
									</div>

									<!-- Other general plugin display slots -->
									<div v-else class="w-full flex flex-col gap-4">
										<PluginSlot hook="checkout_panel" :ctx="posCtx" />
										<PluginSlot hook="payment_panel" :ctx="posCtx" />
										
										<div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-center text-slate-500 text-xs leading-relaxed">
											{{ __('Este método de pago cuenta con una extensión modular o integración externa.') }}
										</div>
									</div>
								</div>

							</div>

							<!-- Keypad Right Pane (Only for Cash) -->
							<div v-if="isCash(selectedMethod)" class="md:col-span-6 flex flex-col gap-4">
								<div class="flex gap-2 items-center">
									<div class="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-2xl font-bold text-slate-800 font-mono select-none">
										{{ displayInput }}
									</div>
									<button
										type="button"
										class="w-12 h-12 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl flex items-center justify-center transition cursor-pointer select-none active:scale-95"
										@click="$emit('backspace')"
									>
										⌫
									</button>
								</div>

								<div class="grid grid-cols-3 gap-2">
									<button
										v-for="key in keypadKeys"
										:key="key"
										class="border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 p-4 rounded-xl font-black text-lg transition cursor-pointer select-none active:scale-95 shadow-sm"
										@click="$emit('pressKey', key)"
									>
										{{ key }}
									</button>
								</div>

								<button
									class="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-sm transition cursor-pointer select-none active:scale-95 shadow-sm w-full"
									@click="$emit('setExactAmount')"
								>
									{{ __('Importe exacto') }}
								</button>
							</div>

						</div>
					</div>

					<!-- ── STEP 3: Payment OK (Success screen) ────────────────── -->
					<div v-else-if="activeScreen === 'payment_ok'" key="step-success" class="flex flex-col items-center justify-center py-6 text-center">
						<div class="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-pop">
							<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
						</div>

						<h3 class="text-3xl font-black text-slate-800 mt-6 tracking-tight">
							{{ __('¡Pago Confirmado!') }}
						</h3>
						<p class="text-slate-400 mt-2 text-sm leading-relaxed max-w-sm">
							{{ __('Su transacción se ha completado con éxito y la factura ha sido generada.') }}
						</p>

						<div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 w-full max-w-md my-8 text-left text-sm space-y-2.5">
							<div class="flex justify-between border-b border-slate-200/60 pb-2.5">
								<span class="text-slate-400 font-medium">{{ __('Factura:') }}</span>
								<span class="font-mono font-bold text-slate-700">{{ successInvoice }}</span>
							</div>
							<div class="flex justify-between text-base font-bold pt-1">
								<span class="text-slate-500">{{ __('Total Cobrado:') }}</span>
								<span class="font-mono text-indigo-600">{{ fmtMoney(successTotal) }}</span>
							</div>
						</div>
					</div>

					<!-- ── STEP: Error (Failed screen) ────────────────────────── -->
					<div v-else-if="activeScreen === 'payment_error'" key="step-error" class="flex flex-col items-center justify-center py-6 text-center">
						<div class="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 animate-pulse">
							<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>

						<h3 class="text-3xl font-black text-slate-800 mt-6 tracking-tight">
							{{ __('Error en el Pago') }}
						</h3>
						<p class="text-slate-400 mt-2 text-sm leading-relaxed max-w-sm">
							{{ __('No se ha podido procesar la transacción o verificar el cobro en el terminal.') }}
						</p>
					</div>

				</transition>
			</div>

			<!-- ── Dialog Footer ─────────────────────────────────────────── -->
			<div class="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
				
				<!-- Footer Back/Cancel buttons -->
				<div>
					<!-- Cancel / Close for Step 1 -->
					<button
						v-if="activeScreen === 'selectPaymentMode'"
						class="btn bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-6 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-sm text-sm"
						@click="$emit('back')"
					>
						{{ __('Cancelar') }}
					</button>

					<!-- Go back to Step 1 from Step 2 -->
					<button
						v-else-if="activeScreen === 'checkout'"
						class="btn bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-6 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-sm text-sm"
						@click="$emit('changeMethod')"
					>
						{{ __('Volver') }}
					</button>
				</div>

				<!-- Footer Action / Next buttons -->
				<div>
					<!-- Step 1 Next button -->
					<button
						v-if="activeScreen === 'selectPaymentMode'"
						class="btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-md shadow-indigo-600/10 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
						:disabled="!selectedMethod"
						@click="confirmMode"
					>
						{{ __('Siguiente') }}
					</button>

					<!-- Step 2 Finalize purchase (only if not handled inside a custom component) -->
					<button
						v-else-if="activeScreen === 'checkout' && !hasActivePluginComponent"
						class="btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-md shadow-indigo-600/10 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
						:disabled="isCash(selectedMethod) ? paidAmount < cartTotal : false"
						@click="$emit('confirmPaymentEntry')"
					>
						{{ __('Confirmar pago') }}
					</button>

					<!-- Step 3 actions (Receipt printing & new transaction) -->
					<div v-else-if="activeScreen === 'payment_ok'" class="flex gap-3">
						<button
							class="btn bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-5 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-sm text-sm flex items-center gap-2"
							@click="$emit('print')"
						>
							<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
							{{ __('Imprimir Ticket') }}
						</button>
						<button
							class="btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-md shadow-indigo-600/10 text-sm font-black"
							@click="$emit('newSale')"
						>
							{{ __('Nueva Venta') }}
						</button>
					</div>

					<!-- Error state Retry -->
					<button
						v-else-if="activeScreen === 'payment_error'"
						class="btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-md shadow-indigo-600/10 text-sm font-black"
						@click="$emit('changeMethod')"
					>
						{{ __('Volver a Intentar') }}
					</button>
				</div>

			</div>

		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import type { PropType } from 'vue';
import type { PosContext } from '../types';
import PluginSlot from './PluginSlot.vue';
import PluginService from '../services/plugins';

export interface MethodOption {
	value: string;
	label: string;
	isPlugin: boolean;
}

export default defineComponent({
	name: 'PaymentDialog',
	components: {
		PluginSlot,
	},
	props: {
		activeScreen: {
			type: String as PropType<'sale' | 'payment' | 'selectPaymentMode' | 'checkout' | 'success' | 'payment_ok' | 'payment_error'>,
			required: true,
		},
		paymentMethods: {
			type: Array as PropType<string[]>,
			required: true,
		},
		selectedPaymentMethod: {
			type: String,
			required: true,
		},
		displayInput: {
			type: String,
			required: true,
		},
		paidAmount: {
			type: Number,
			required: true,
		},
		cartTotal: {
			type: Number,
			required: true,
		},
		paymentDue: {
			type: Number,
			required: true,
		},
		canConfirmPayment: {
			type: Boolean,
			required: true,
		},
		currency: {
			type: String,
			required: true,
		},
		invoiceToPay: {
			type: Object as PropType<any>,
			required: false,
			default: null,
		},
		successInvoice: {
			type: String,
			required: true,
		},
		successTotal: {
			type: Number,
			required: true,
		},
		posCtx: {
			type: Object as PropType<PosContext>,
			required: true,
		},
	},
	emits: [
		'update:selectedPaymentMethod',
		'pressKey',
		'backspace',
		'setExactAmount',
		'back',
		'confirm',
		'confirmPaymentEntry',
		'cancelInvoice',
		'changeMethod',
		'print',
		'newSale',
	],
	setup(props, { emit }) {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const keypadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

		const selectedMethod = computed({
			get() {
				return props.selectedPaymentMethod;
			},
			set(value) {
				emit('update:selectedPaymentMethod', value);
			},
		});

		// Check helper functions
		const isCash = (method: string): boolean => {
			if (!method) return false;
			const m = method.toLowerCase();
			return m.includes('cash') || m.includes('efectivo') || m.includes('dinero');
		};

		const isCard = (method: string): boolean => {
			if (!method) return false;
			const m = method.toLowerCase();
			return m.includes('card') || m.includes('tarjeta') || m.includes('credit') || m.includes('débito') || m.includes('debito');
		};

		// Stepper helpers
		const getCurrentStep = (): number => {
			if (props.activeScreen === 'selectPaymentMode') return 1;
			if (props.activeScreen === 'checkout' || props.activeScreen === 'payment_error') return 2;
			if (props.activeScreen === 'payment_ok') return 3;
			return 1;
		};

		const getStepSubtitle = (): string => {
			if (props.activeScreen === 'selectPaymentMode') return __('Selecciona el formato de pago');
			if (props.activeScreen === 'checkout') return __('Completa y confirma el importe');
			if (props.activeScreen === 'payment_ok') return __('Transacción completada');
			if (props.activeScreen === 'payment_error') return __('Ocurrió un error en el pago');
			return '';
		};

		// Retrieve registered plugins for the payment method
		const paymentPlugins = computed(() => {
			return PluginService.getPluginsForHook('payment_method');
		});

		const allPaymentMethods = computed<MethodOption[]>(() => {
			const methods: MethodOption[] = props.paymentMethods.map((m) => ({
				value: m,
				label: m,
				isPlugin: false,
			}));

			paymentPlugins.value.forEach((plugin) => {
				if (!methods.some((m) => m.value === plugin.name)) {
					methods.push({
						value: plugin.name,
						label: plugin.label || plugin.name,
						isPlugin: true,
					});
				}
			});

			return methods;
		});

		const activePaymentPlugin = computed(() => {
			return paymentPlugins.value.find((p) => p.name === props.selectedPaymentMethod) || null;
		});

		const hasActivePluginComponent = computed(() => {
			return !!(activePaymentPlugin.value && activePaymentPlugin.value.component);
		});

		const selectAndNext = (method: string) => {
			selectedMethod.value = method;
			emit('confirm');
		};

		const confirmMode = () => {
			emit('confirm');
		};

		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), props.currency);
			}
			return `${Number(value || 0).toFixed(2)} ${props.currency}`;
		};

		return {
			__,
			keypadKeys,
			selectedMethod,
			allPaymentMethods,
			activePaymentPlugin,
			hasActivePluginComponent,
			getCurrentStep,
			getStepSubtitle,
			isCash,
			isCard,
			confirmMode,
			selectAndNext,
			fmtMoney,
		};
	},
});
</script>

<style scoped>
.animate-fade-in-backdrop {
	animation: fadeInBackdrop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.animate-scale-in {
	animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes fadeInBackdrop {
	from {
		background-color: rgba(15, 23, 42, 0);
		backdrop-filter: blur(0px);
	}
	to {
		background-color: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(8px);
	}
}

@keyframes scaleIn {
	from {
		opacity: 0;
		transform: scale(0.95) translateY(10px);
	}
	to {
		opacity: 1;
		transform: scale(1) translateY(0);
	}
}

.fade-slide-enter-active,
.fade-slide-leave-active {
	transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from {
	opacity: 0;
	transform: translateX(20px);
}

.fade-slide-leave-to {
	opacity: 0;
	transform: translateX(-20px);
}

.animate-pop {
	animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pop {
	from {
		transform: scale(0.8);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}
</style>
