<template>
	<div
		class="customer-display-vue min-h-screen text-slate-800 font-sans flex flex-col transition-colors duration-300"
		:style="`--epos-primary: ${primaryColor};`"
	>
		<!-- ── Dynamic Primary Color Styles ── -->
		<component :is="'style'">
			.text-primary { color: var(--epos-primary) !important; }
			.bg-primary { background-color: var(--epos-primary) !important; }
			.border-primary { border-color: var(--epos-primary) !important; }
			.bg-primary-tint { background-color: color-mix(in srgb, var(--epos-primary) 10%, transparent) !important; }
		</component>

		<!-- ── Screen Transitions ── -->
		<transition name="screen" mode="out-in">
			<!-- ── Idle State: Promo Slideshow ── -->
			<DisplayIdle
				v-if="activeScreen === 'idle'"
				key="idle"
				:media-urls="mediaUrls"
				:current-media-idx="currentMediaIdx"
				@ended="nextMedia"
			/>

			<!-- ── Active Sale Screen ── -->
			<DisplaySale
				v-else-if="activeScreen === 'itemSelection'"
				key="sale"
				:items="items"
				:total="total"
				:currency="currency"
			/>

			<!-- ── Modular Payment checkout screen ── -->
			<component
				v-else-if="activeScreen === 'paymentCheckout' && activePaymentPlugin && activePaymentPlugin.customerComponent"
				:is="activePaymentPlugin.customerComponent"
				key="checkout-plugin"
				:total="total"
				:currency="currency"
				:payment-method="paymentMethod"
				:qr-code="qrCode"
				:cash-received="cashReceived"
				:change-amount="changeAmount"
				:display-input="formattedInput"
				:pos-ctx="posCtx"
			/>

			<!-- ── Fallback Payment checkout screen ── -->
			<div
				v-else-if="activeScreen === 'paymentCheckout' || activeScreen === 'selectingPaymentMethod'"
				key="checkout-fallback"
				class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800 w-full h-full"
			>
				<div class="w-full max-w-xl p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl text-center flex flex-col gap-6">
					<div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-600 animate-pulse">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<p class="font-bold text-slate-700 text-center text-sm leading-normal">
						{{ __("Esperando confirmación del importe...") }}
					</p>
				</div>
			</div>

			<!-- ── STEP: Processing Payment (Async loading screen) ───── -->
			<div
				v-else-if="activeScreen === 'processingPayment'"
				key="processing"
				class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800 w-full h-full"
			>
				<div class="w-full max-w-xl p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl text-center flex flex-col gap-6">
					<div class="w-16 h-16 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mx-auto"></div>
					<h2 class="text-2xl font-black text-slate-800 tracking-tight">
						{{ __("Procesando Transacción") }}
					</h2>
					<p class="text-slate-400 text-sm">
						{{ __("Por favor, espere mientras procesamos su pago.") }}
					</p>
				</div>
			</div>

			<!-- ── Success/Thank You Screens ── -->
			<DisplaySuccess
				v-else-if="activeScreen === 'paymentSuccessful'"
				:key="activeScreen"
				:active-screen="activeScreen"
				:success-invoice="successInvoice"
				:success-total="successTotal"
			/>

			<!-- ── Payment Error Screen ── -->
			<DisplayError
				v-else-if="activeScreen === 'paymentFailed'"
				key="payment_error"
				:error-message="errorMessage"
			/>
		</transition>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { CartItem, Product, POSState } from '../types';
import PluginSlot from '../components/PluginSlot.vue';
import { __ } from '../utils/i18n';

// Import split sub-components
import DisplayIdle from '../components/CustomerDisplay/DisplayIdle.vue';
import DisplaySale from '../components/CustomerDisplay/DisplaySale.vue';
import DisplaySuccess from '../components/CustomerDisplay/DisplaySuccess.vue';
import DisplayError from '../components/CustomerDisplay/DisplayError.vue';

// Import Plugin Service and register all default plugins
import PluginService from '../services/plugins';
import '../plugins';

export default defineComponent({
	name: 'CustomerDisplay',
	components: {
		PluginSlot,
		DisplayIdle,
		DisplaySale,
		DisplaySuccess,
		DisplayError,
	},
	setup() {
		// State
		const activeScreen = ref<'idle' | 'itemSelection' | 'selectingPaymentMethod' | 'paymentCheckout' | 'processingPayment' | 'paymentSuccessful' | 'paymentFailed'>('idle');
		const items = ref<CartItem[]>([]);
		const total = ref<number>(0);
		const currency = ref<string>('EUR');
		const paymentMethod = ref<string>('');
		const paymentDue = ref<number>(0);
		const qrCode = ref<string | null>(null);
		const cashReceived = ref<number>(0);
		const changeAmount = ref<number>(0);
		const paymentConfig = ref<any>(null);
		const formattedInput = ref<string>('');
		const formattedChange = ref<string>('');

		// Configurations
		const primaryColor = ref<string>('#4f46e5');
		const mediaUrls = ref<string[]>([]);
		const rotationInterval = ref<number>(10);

		// Media Slideshow
		const currentMediaIdx = ref<number>(0);
		let slideshowTimer: any = null;

		// Connection Channel
		const bc = new BroadcastChannel('pos_customer_display');

		// PosContext adapter for plugin slots
		const posCtx = computed(() => ({
			state: {
				opening_entries: [],
				invoice_type: 'POS Invoice',
				show_invoice_picker: 0,
				auto_create_delivery_note: 0,
				enhanced_pos_settings: '',
				user: '',
				primary_color: primaryColor.value,
				enable_customer_display: 1,
				customer_display_media: mediaUrls.value.join('\n'),
				media_rotation_interval: rotationInterval.value
			} as unknown as POSState,
			cart: items.value,
			products: [] as Product[],
			cartTotal: total.value,
			currency: currency.value,
			addToCart() {},
			loadProducts: async () => {},
			customerDisplayConnected: true,
			broadcastToDisplay() {},
			invoiceToPay: null,
			activeScreen: (activeScreen.value === 'idle' ? 'itemSelection' : activeScreen.value) as any,
			paymentMethod: paymentMethod.value,
			paymentAmount: 0,
			async confirmPaymentEntry() {},
			async cancelUnpaidInvoice() {},
			qrCode: qrCode.value,
			setQrCode() {},
			printFormat: null,
			printInvoice() {},
		}));

		// Media Check
		const isVideo = (url: string): boolean => {
			if (!url) return false;
			const cleanUrl = url.split('?')[0].toLowerCase();
			return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg');
		};

		// Carousel Logic
		const nextMedia = () => {
			if (!mediaUrls.value.length) return;
			currentMediaIdx.value = (currentMediaIdx.value + 1) % mediaUrls.value.length;
			setupSlideshow();
		};

		const setupSlideshow = () => {
			if (slideshowTimer) clearTimeout(slideshowTimer);
			if (mediaUrls.value.length <= 1) return;

			const currentUrl = mediaUrls.value[currentMediaIdx.value];
			if (isVideo(currentUrl)) {
				// Videos handle transition via @ended event on video tag
				return;
			}

			// Images rotate on configured timeout
			slideshowTimer = setTimeout(() => {
				nextMedia();
			}, rotationInterval.value * 1000);
		};

		const successInvoice = ref<string>('');
		const successTotal = ref<string>('');
		const errorMessage = ref<string>('');

		// Broadcast Receivers
		bc.onmessage = (event) => {
			const { type, payload } = event.data;

			if (type === 'POS_PING') {
				// Answer immediately to confirm we are active
				bc.postMessage({ type: 'POS_PONG' });
				// Only sync configuration on ping, do not overwrite screen state
				if (payload && payload.config) {
					applyConfig(payload.config);
				}
			} else if (type === 'UPDATE_DISPLAY') {
				applyPayload(payload);
			} else if (type === 'PAYMENT_SUCCESS' || type === 'PAYMENT_OK') {
				successInvoice.value = payload.invoice || '';
				successTotal.value = fmtMoney(payload.amount || 0);
				activeScreen.value = 'paymentSuccessful';
				
				// Automatically return to idle after 5 seconds
				if (slideshowTimer) clearTimeout(slideshowTimer);
				slideshowTimer = setTimeout(() => {
					activeScreen.value = 'idle';
					setupSlideshow();
				}, 5000);
			} else if (type === 'PAYMENT_ERROR') {
				errorMessage.value = payload.message || __('Su pago no se ha podido procesar.');
				activeScreen.value = 'paymentFailed';
				
				// Automatically return to checkout/payment screen after 5 seconds
				if (slideshowTimer) clearTimeout(slideshowTimer);
				slideshowTimer = setTimeout(() => {
					activeScreen.value = payload.fallbackScreen || 'paymentCheckout';
				}, 5000);
			}
		};

		const applyConfig = (config: any) => {
			if (!config) return;
			primaryColor.value = config.primary_color || '#4f46e5';
			rotationInterval.value = Number(config.media_rotation_interval ?? 10);
			
			const newMedia = (config.customer_display_media || '')
				.split('\n')
				.map((url: string) => url.trim())
				.filter(Boolean);
			
			// Only reset slider if media urls changed
			if (JSON.stringify(newMedia) !== JSON.stringify(mediaUrls.value)) {
				mediaUrls.value = newMedia;
				currentMediaIdx.value = 0;
				nextTick(() => setupSlideshow());
			}
		};

		const applyPayload = (payload: any) => {
			if (payload.config) {
				applyConfig(payload.config);
			}

			activeScreen.value = payload.activeScreen || 'idle';
			items.value = payload.items || [];
			total.value = Number(payload.total || 0);
			currency.value = payload.currency || 'EUR';
			paymentMethod.value = payload.paymentMethod || '';
			paymentDue.value = Number(payload.paymentDue || 0);
			qrCode.value = payload.qrCode || null;
			cashReceived.value = Number(payload.cashReceived || 0);
			changeAmount.value = Number(payload.changeAmount || 0);
			paymentConfig.value = payload.paymentConfig || null;
			formattedInput.value = payload.formattedInput || '';
			formattedChange.value = payload.formattedChange || '';
		};

		// Money Formatter fallback
		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), currency.value);
			}
			return `${Number(value || 0).toFixed(2)} ${currency.value}`;
		};

		const activePaymentPlugin = computed(() => {
			return PluginService.getPaymentPlugin(paymentMethod.value);
		});

		onMounted(() => {
			// Announce ourselves to any existing POS sessions
			bc.postMessage({ type: 'CUSTOMER_DISPLAY_BOOT' });
			setupSlideshow();
		});

		onUnmounted(() => {
			if (slideshowTimer) clearTimeout(slideshowTimer);
			bc.close();
		});

		return {
			__,
			activeScreen,
			items,
			total,
			currency,
			paymentMethod,
			qrCode,
			primaryColor,
			mediaUrls,
			currentMediaIdx,
			posCtx,
			nextMedia,
			successInvoice,
			successTotal,
			errorMessage,
			cashReceived,
			changeAmount,
			paymentConfig,
			formattedInput,
			formattedChange,
			activePaymentPlugin,
		};
	}
});
</script>

<style scoped>
.customer-display-vue {
	background: #f8fafc;
}

/* Screen Transitions (Fade + Scale) */
.screen-enter-active,
.screen-leave-active {
	transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1), transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
.screen-enter-from {
	opacity: 0;
	transform: scale(0.995);
}
.screen-leave-to {
	opacity: 0;
	transform: scale(1.005);
}
</style>
