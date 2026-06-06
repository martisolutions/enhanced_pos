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
						v-for="step in [1, 2, 3, 4]"
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
							v-if="step < 4"
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
					<div v-if="activeScreen === 'selectingPaymentMethod'" key="step-select" class="flex flex-col gap-6">
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
									<svg v-if="getMethodType(method.value) === 'cash'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
									<!-- Card Icon -->
									<svg v-else-if="getMethodType(method.value) === 'card'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
									</svg>
									<!-- Plugin/Other Icon -->
									<svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
									</svg>
								</div>
								
								<span :class="['text-sm font-bold text-center tracking-tight', selectedMethod === method.value ? 'text-indigo-900 font-black' : 'text-slate-700']">
									{{ __(method.label) }}
								</span>
							</div>
						</div>
						
						<div v-else class="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400">
							{{ __('No hay métodos de pago disponibles.') }}
						</div>
					</div>

					<!-- ── STEP 2: Checkout Details (Plugin UI Injection) ──────── -->
					<div v-else-if="activeScreen === 'paymentCheckout'" key="step-checkout">
						<div v-if="activePaymentPlugin && activePaymentPlugin.component" class="w-full">
							<component
								:is="activePaymentPlugin.component"
								:display-input="formattedDisplayInput"
								:paid-amount="paidAmount"
								:cart-total="cartTotal"
								:payment-due="paymentDue"
								:currency="currency"
								:pos-ctx="posCtx"
								@pressKey="$emit('pressKey', $event)"
								@backspace="$emit('backspace')"
								@setExactAmount="$emit('setExactAmount')"
								@success="$emit('confirmPaymentEntry')"
							/>
						</div>

						<!-- Fallback slot if the resolved plugin has no checkout component -->
						<div v-else class="max-w-xl mx-auto flex flex-col gap-6">
							<PluginSlot hook="checkout_panel" :ctx="posCtx" />
							<PluginSlot hook="payment_panel" :ctx="posCtx" />

							<div class="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-center text-slate-500 text-xs leading-relaxed">
								{{ __('Este método de pago no cuenta con una interfaz de checkout registrada.') }}
							</div>
						</div>
					</div>

					<!-- ── STEP: Processing Payment (Async loading screen) ───── -->
					<div v-else-if="activeScreen === 'processingPayment'" key="step-processing" class="flex flex-col items-center justify-center py-12 text-center">
						<div class="w-16 h-16 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mb-6"></div>
						<h3 class="text-2xl font-black text-slate-800 tracking-tight">
							{{ processingStep === 4 ? __('Registrando Factura...') : __('Procesando Pago...') }}
						</h3>
						<p class="text-slate-400 mt-2 text-sm leading-relaxed max-w-sm">
							{{ processingStep === 4 
								? __('Guardando y enviando la factura a ERPNext. Por favor, no cierre la aplicación.')
								: __('Comunicando con la pasarela de pago y verificando la transacción.') }}
						</p>
					</div>

					<!-- ── STEP 3: Payment OK (Success screen) ────────────────── -->
					<div v-else-if="activeScreen === 'paymentSuccessful'" key="step-success" class="flex flex-col items-center justify-center py-6 text-center">
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
					<div v-else-if="activeScreen === 'paymentFailed'" key="step-error" class="flex flex-col items-center justify-center py-6 text-center">
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
						v-if="activeScreen === 'selectingPaymentMethod'"
						class="btn bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-6 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-sm text-sm"
						@click="$emit('back')"
					>
						{{ __('Cancelar') }}
					</button>

					<!-- Go back to Step 1 from Step 2 -->
					<button
						v-else-if="activeScreen === 'paymentCheckout'"
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
						v-if="activeScreen === 'selectingPaymentMethod'"
						class="btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-md shadow-indigo-600/10 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
						:disabled="!selectedMethod"
						@click="confirmMode"
					>
						{{ __('Siguiente') }}
					</button>

					<!-- Step 2 Finalize purchase -->
					<button
						v-else-if="activeScreen === 'paymentCheckout' && !activePaymentPlugin?.paymentConfig?.hideConfirmButton"
						class="btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-md shadow-indigo-600/10 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
						:disabled="isConfirmDisabled"
						@click="$emit('confirmPaymentEntry')"
					>
						{{ __('Confirmar pago') }}
					</button>

					<!-- Step 3 actions (Receipt printing & new transaction) -->
					<div v-else-if="activeScreen === 'paymentSuccessful'" class="flex gap-3">
						<button
							:class="[
								'btn font-bold py-2.5 px-5 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-sm text-sm flex items-center gap-2',
								focusedStep3Option === 'print'
									? 'bg-slate-100 border border-indigo-500 ring-2 ring-indigo-500 text-indigo-700'
									: 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
							]"
							@click="$emit('print')"
						>
							<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
							{{ __('Imprimir Ticket') }}
						</button>
						<button
							:class="[
								'btn font-bold py-2.5 px-8 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-md text-sm font-black',
								focusedStep3Option === 'newSale'
									? 'bg-indigo-700 ring-2 ring-indigo-500 ring-offset-2 text-white shadow-indigo-600/20'
									: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
							]"
							@click="$emit('newSale')"
						>
							{{ __('Nueva Venta') }}
						</button>
					</div>

					<!-- Error state Retry -->
					<button
						v-else-if="activeScreen === 'paymentFailed'"
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
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue';
import type { PropType } from 'vue';
import type { PosContext } from '../../types';
import PluginSlot from '../PluginSlot.vue';
import PluginService from '../../services/plugins';

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
			type: String as PropType<'idle' | 'itemSelection' | 'selectingPaymentMethod' | 'paymentCheckout' | 'processingPayment' | 'paymentSuccessful' | 'paymentFailed'>,
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
		processingStep: {
			type: Number,
			default: 3,
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

		const getMethodType = (method: string): 'cash' | 'card' | 'plugin' => {
			const plugin = PluginService.getPaymentPlugin(method);
			return plugin?.paymentConfig?.type || 'plugin';
		};

		// Stepper helpers
		const getCurrentStep = (): number => {
			if (props.activeScreen === 'selectingPaymentMethod') return 1;
			if (props.activeScreen === 'paymentCheckout') return 2;
			if (props.activeScreen === 'processingPayment') return 3;
			if (props.activeScreen === 'paymentSuccessful' || props.activeScreen === 'paymentFailed') return 4;
			return 1;
		};

		const getStepSubtitle = (): string => {
			if (props.activeScreen === 'selectingPaymentMethod') return __('Selecciona el formato de pago');
			if (props.activeScreen === 'paymentCheckout') return __('Completa y confirma el importe');
			if (props.activeScreen === 'processingPayment') {
				if (props.processingStep === 4) {
					return __('Registrando factura en el servidor...');
				}
				return __('Verificando transacción...');
			}
			if (props.activeScreen === 'paymentSuccessful') return __('Transacción completada con éxito');
			if (props.activeScreen === 'paymentFailed') return __('Ocurrió un error en el pago');
			return '';
		};

		// Retrieve registered plugins for the payment method
		const paymentPlugins = computed(() => {
			return PluginService.state.plugins.filter((p) => p.hook === 'new_payment_method');
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
			return PluginService.getPaymentPlugin(props.selectedPaymentMethod);
		});

		const formattedDisplayInput = computed(() => {
			const config = activePaymentPlugin.value?.paymentConfig;
			if (config?.formatInput) {
				return config.formatInput(props.displayInput);
			}
			return props.displayInput;
		});

		const isConfirmDisabled = computed(() => {
			const config = activePaymentPlugin.value?.paymentConfig;
			if (config?.validateConfirm) {
				return !config.validateConfirm(props.paidAmount, props.cartTotal);
			}
			if (config?.validateExactAmount) {
				return props.paidAmount < props.cartTotal;
			}
			return false;
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

		const focusedStep3Option = ref<'print' | 'newSale'>('newSale');

		const handleKeyDown = (e: KeyboardEvent) => {
			const activeEl = document.activeElement;
			if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.id !== 'managed-keypad-input') {
				return;
			}

			// ── Escape Key (Back / Close) ──
			if (e.key === 'Escape') {
				e.preventDefault();
				if (props.activeScreen === 'selectingPaymentMethod') {
					emit('back');
				} else if (props.activeScreen === 'paymentCheckout') {
					emit('changeMethod');
				} else if (props.activeScreen === 'paymentSuccessful') {
					emit('newSale');
				} else if (props.activeScreen === 'paymentFailed') {
					emit('changeMethod');
				}
				return;
			}

			// ── Enter Key (Confirm / Next) ──
			if (e.key === 'Enter') {
				e.preventDefault();
				if (props.activeScreen === 'selectingPaymentMethod') {
					if (selectedMethod.value) {
						confirmMode();
					}
				} else if (props.activeScreen === 'paymentCheckout') {
					if (!isConfirmDisabled.value) {
						emit('confirmPaymentEntry');
					}
				} else if (props.activeScreen === 'paymentSuccessful') {
					if (focusedStep3Option.value === 'print') {
						emit('print');
					} else {
						emit('newSale');
					}
				} else if (props.activeScreen === 'paymentFailed') {
					emit('changeMethod');
				}
				return;
			}

			// ── Arrow Keys ──
			if (props.activeScreen === 'selectingPaymentMethod') {
				const methods = allPaymentMethods.value;
				if (!methods.length) return;
				const currentIndex = methods.findIndex(m => m.value === selectedMethod.value);

				const cols = window.innerWidth >= 768 ? 3 : (window.innerWidth >= 640 ? 2 : 1);
				let newIndex = currentIndex;

				if (e.key === 'ArrowLeft') {
					e.preventDefault();
					newIndex = currentIndex - 1;
				} else if (e.key === 'ArrowRight') {
					e.preventDefault();
					newIndex = currentIndex + 1;
				} else if (e.key === 'ArrowUp') {
					e.preventDefault();
					newIndex = currentIndex - cols;
				} else if (e.key === 'ArrowDown') {
					e.preventDefault();
					newIndex = currentIndex + cols;
				} else {
					return;
				}

				// Clamp and select
				if (newIndex >= 0 && newIndex < methods.length) {
					selectedMethod.value = methods[newIndex].value;
				}
				return;
			}

			if (props.activeScreen === 'paymentSuccessful') {
				if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
					e.preventDefault();
					focusedStep3Option.value = focusedStep3Option.value === 'print' ? 'newSale' : 'print';
				}
				return;
			}

			// ── Keypad Inputs (digits and backspace when in checkout cash) ──
			const config = activePaymentPlugin.value?.paymentConfig;
			if (props.activeScreen === 'paymentCheckout' && config?.requiresKeypad) {
				if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === ',') {
					e.preventDefault();
					const char = e.key === ',' ? '.' : e.key;
					emit('pressKey', char);
				} else if (e.key === 'Backspace') {
					e.preventDefault();
					emit('backspace');
				}
			}
		};

		onMounted(() => {
			window.addEventListener('keydown', handleKeyDown);
		});

		onUnmounted(() => {
			window.removeEventListener('keydown', handleKeyDown);
		});

		return {
			__,
			keypadKeys,
			selectedMethod,
			allPaymentMethods,
			activePaymentPlugin,
			getCurrentStep,
			getStepSubtitle,
			getMethodType,
			formattedDisplayInput,
			isConfirmDisabled,
			confirmMode,
			selectAndNext,
			fmtMoney,
			focusedStep3Option,
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
