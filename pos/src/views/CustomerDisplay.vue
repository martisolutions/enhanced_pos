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
			<div v-if="activeScreen === 'idle'" key="idle" class="relative flex-grow flex items-center justify-center overflow-hidden bg-slate-950">
				<!-- Slideshow Media -->
				<div v-if="mediaUrls.length" class="absolute inset-0 w-full h-full">
					<transition-group name="fade" tag="div" class="relative w-full h-full">
						<div
							v-for="(url, idx) in mediaUrls"
							v-show="idx === currentMediaIdx"
							:key="url"
							class="absolute inset-0 w-full h-full flex items-center justify-center"
						>
							<video
								v-if="isVideo(url)"
								ref="videos"
								:src="url"
								autoplay
								muted
								playsinline
								class="w-full h-full object-cover"
								@ended="nextMedia"
							></video>
							<img
								v-else
								:src="url"
								:alt="`Promo ${idx}`"
								class="w-full h-full object-cover"
							/>
						</div>
					</transition-group>
				</div>

				<!-- Fallback background when no media is configured -->
				<div v-else class="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-950"></div>

				<!-- Elegant Glassmorphic Welcome Overlay -->
				<div class="relative z-10 p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl text-center max-w-lg mx-4">
					<div class="w-20 h-20 mx-auto rounded-2xl bg-primary flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/20">
						<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
						</svg>
					</div>
					<h1 class="text-3xl font-extrabold text-white tracking-tight leading-tight">
						{{ __('¡Bienvenido!') }}
					</h1>
					<p class="text-slate-300 mt-2 text-sm">
						{{ __('Gracias por comprar con nosotros. En breve iniciaremos su transacción.') }}
					</p>
				</div>
			</div>

			<!-- ── Active Sale Screen ── -->
			<div v-else-if="activeScreen === 'sale'" key="sale" class="flex-grow flex flex-col lg:flex-row bg-slate-50 p-6 gap-6 h-screen overflow-hidden">
				<!-- Left Column: Cart Items List -->
				<div class="flex-grow flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 lg:w-2/3">
					<h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
						<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
						</svg>
						{{ __('Detalle de su compra') }}
					</h2>

					<!-- Items Container -->
					<div v-if="items.length" class="flex-grow overflow-y-auto pr-1 flex flex-col gap-3 relative">
						<transition-group name="list" tag="div" class="flex flex-col gap-3 w-full relative">
							<div
								v-for="item in items"
								:key="item.item_code"
								class="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition w-full"
							>
								<div class="flex flex-col gap-0.5">
									<span class="font-semibold text-slate-800 text-sm leading-snug">
										{{ item.item_name || item.item_code }}
									</span>
									<span class="text-xs font-mono text-slate-400">
										{{ item.item_code }}
									</span>
								</div>
								<div class="flex items-center gap-6">
									<transition name="pop" mode="out-in">
										<span :key="item.qty" class="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">
											x{{ item.qty }}
										</span>
									</transition>
									<transition name="pop" mode="out-in">
										<span :key="item.qty * item.rate" class="font-bold text-slate-800 text-sm w-20 text-right">
											{{ fmtMoney(item.qty * item.rate) }}
										</span>
									</transition>
								</div>
							</div>
						</transition-group>
					</div>
					<div v-else class="flex-grow flex items-center justify-center text-slate-400 text-sm">
						{{ __('Esperando productos...') }}
					</div>
				</div>

				<!-- Right Column: Grand Total Summary Box -->
				<div class="lg:w-1/3 flex flex-col gap-6">
					<!-- Brand Header Card -->
					<div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
						<div class="w-12 h-12 bg-primary-tint rounded-xl flex items-center justify-center text-primary mx-auto mb-3">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
							</svg>
						</div>
						<h3 class="font-extrabold text-slate-800 text-lg leading-tight">{{ __('Punto de Venta') }}</h3>
						<p class="text-xs text-slate-400 mt-1">{{ __('Transacción en curso') }}</p>
					</div>

					<!-- Glassmorphic Total Box -->
					<div class="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl shadow-xl p-8 text-white flex flex-col justify-between flex-grow">
						<div>
							<span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
								{{ __('Total a pagar') }}
							</span>
							<transition name="pop-large" mode="out-in">
								<h1 :key="total" class="text-4xl lg:text-5xl font-black mt-2 tracking-tight text-white">
									{{ fmtMoney(total) }}
								</h1>
							</transition>
						</div>

						<div class="border-t border-slate-800/80 pt-6 mt-8">
							<div class="flex justify-between text-sm text-slate-400 mb-2">
								<span>{{ __('Artículos totales:') }}</span>
								<span class="font-semibold text-white font-mono">{{ itemsCount }}</span>
							</div>
							<div class="text-xs text-slate-500 mt-4 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/40">
								💡 {{ __('Verifique los artículos en pantalla. Si necesita factura, solicítela al cajero.') }}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ── Payment checkout screen ── -->
			<div v-else-if="activeScreen === 'payment' || activeScreen === 'checkout'" key="payment" class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800">
				<!-- Premium Checkout Card -->
				<div class="w-full max-w-xl p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center">
					<span class="text-xs font-bold uppercase tracking-widest text-primary bg-primary-tint px-3 py-1.5 rounded-full inline-block mb-4">
						{{ activeScreen === 'checkout' ? __('PAGO EN PROCESO') : __('SELECCIONANDO MÉTODO DE PAGO') }}
					</span>
					
					<transition name="pop-large" mode="out-in">
						<h2 :key="total" class="text-4xl lg:text-5xl font-black mt-2 tracking-tight text-slate-800">
							{{ fmtMoney(total) }}
						</h2>
					</transition>
					
					<p class="text-slate-400 mt-2 text-sm">
						{{ __('Método de pago:') }} <span class="font-semibold text-slate-700">{{ paymentMethod || __('No seleccionado') }}</span>
					</p>

					<!-- Standard Payment Display -->
					<div class="my-8 py-6 border-y border-slate-200/80 flex flex-col items-center justify-center">
						<!-- QR Code Block -->
						<div v-if="qrCode" class="bg-white p-4 rounded-2xl inline-block shadow-lg mb-4 animate-fade-in">
							<img :src="qrCode" alt="QR Code" class="w-48 h-48 mx-auto" />
							<p class="text-[10px] text-slate-400 font-semibold mt-2 uppercase tracking-wide">
								{{ __('Escanee para realizar el pago') }}
							</p>
						</div>

						<div v-else class="text-slate-500 text-sm max-w-md mx-auto">
							<div class="w-12 h-12 rounded-full bg-primary-tint flex items-center justify-center mx-auto mb-3 text-primary">
								<svg v-if="isCash(paymentMethod)" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
								</svg>
								<svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
							</div>
							<template v-if="activeScreen === 'checkout'">
								<div v-if="isCash(paymentMethod)" class="w-full flex flex-col gap-3 max-w-xs mx-auto mt-2 text-left border border-slate-100 rounded-2xl p-4 bg-slate-50 shadow-inner">
									<div class="flex justify-between text-sm">
										<span class="text-slate-500">{{ __('Efectivo Recibido:') }}</span>
										<span class="font-bold text-slate-800 font-mono">{{ fmtMoney(cashReceived) }}</span>
									</div>
									<div class="flex justify-between text-base font-bold border-t border-slate-200 pt-2.5 mt-1">
										<span class="text-slate-600">{{ __('Cambio a devolver:') }}</span>
										<span class="font-mono text-emerald-600 font-black">{{ fmtMoney(changeAmount) }}</span>
									</div>
								</div>
								<p v-else class="font-medium text-slate-700">
									{{ __('Por favor, siga las instrucciones del terminal') }}
								</p>
							</template>
							<template v-else>
								<p class="font-medium text-slate-700">
									{{ __('Esperando confirmación del importe...') }}
								</p>
							</template>
						</div>
					</div>

					<!-- Developers Extension Point: customer_payment_panel -->
					<PluginSlot hook="customer_payment_panel" :ctx="posCtx" />
				</div>
			</div>

			<!-- ── Success/Thank You Screen ── -->
			<div v-else-if="activeScreen === 'success'" key="success" class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800">
				<!-- Success Card -->
				<div class="w-full max-w-xl p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center animate-fade-in">
					<div class="w-20 h-20 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20">
						<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
						</svg>
					</div>
					<h1 class="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
						{{ __('¡Pago Completado!') }}
					</h1>
					<p class="text-slate-500 mt-2 text-sm">
						{{ __('Su transacción se ha procesado con éxito.') }}
					</p>
					
					<div class="my-6 py-4 border-y border-slate-100 text-left text-sm space-y-2 max-w-xs mx-auto">
						<div class="flex justify-between">
							<span class="text-slate-400">{{ __('Factura:') }}</span>
							<span class="font-mono font-semibold text-slate-700">{{ successInvoice }}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">{{ __('Total Pagado:') }}</span>
							<span class="font-mono font-bold text-slate-800">{{ successTotal }}</span>
						</div>
					</div>

					<p class="text-xs text-slate-400">
						{{ __('¡Gracias por su compra! Vuelva pronto.') }}
					</p>
				</div>
			</div>

			<!-- ── Payment OK Screen ── -->
			<div v-else-if="activeScreen === 'payment_ok'" key="payment_ok" class="flex-grow flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800">
				<div class="w-full max-w-xl p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center animate-fade-in">
					<div class="w-20 h-20 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20">
						<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
						</svg>
					</div>
					<h1 class="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
						{{ __('¡Pago Confirmado!') }}
					</h1>
					<p class="text-slate-500 mt-2 text-sm">
						{{ __('Su transacción se ha completado con éxito.') }}
					</p>
					
					<div class="my-6 py-4 border-y border-slate-100 text-left text-sm space-y-2 max-w-xs mx-auto">
						<div v-if="successInvoice" class="flex justify-between">
							<span class="text-slate-400">{{ __('Factura:') }}</span>
							<span class="font-mono font-semibold text-slate-700">{{ successInvoice }}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">{{ __('Total Pagado:') }}</span>
							<span class="font-mono font-bold text-slate-800">{{ successTotal }}</span>
						</div>
					</div>

					<p class="text-xs text-slate-400">
						{{ __('¡Gracias por su compra! Vuelva pronto.') }}
					</p>
				</div>
			</div>

			<!-- ── Payment Error Screen ── -->
			<div v-else-if="activeScreen === 'payment_error'" key="payment_error" class="flex-grow flex flex-col items-center justify-center bg-red-50/30 p-8 text-slate-800">
				<div class="w-full max-w-xl p-8 rounded-3xl bg-white border border-red-100 shadow-xl text-center animate-fade-in">
					<div class="w-20 h-20 mx-auto rounded-full bg-rose-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-500/20 animate-pulse">
						<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</div>
					<h1 class="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
						{{ __('Error en el Pago') }}
					</h1>
					<p class="text-slate-500 mt-2 text-sm">
						{{ __('No se ha podido procesar la transacción.') }}
					</p>
					
					<div class="my-6 p-4 rounded-xl bg-rose-50/50 border border-rose-100 text-center text-sm max-w-md mx-auto text-rose-700 font-medium">
						{{ errorMessage }}
					</div>

					<p class="text-xs text-slate-400">
						{{ __('Por favor, intente con otro método o consulte con el cajero.') }}
					</p>
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { CartItem, Product, POSState } from '../types';
import PluginSlot from '../components/PluginSlot.vue';
import { __ } from '../utils/i18n';

export default defineComponent({
	name: 'CustomerDisplay',
	components: {
		PluginSlot
	},
	setup() {
		// State
		const activeScreen = ref<'idle' | 'sale' | 'payment' | 'checkout' | 'success' | 'payment_ok' | 'payment_error'>('idle');
		const items = ref<CartItem[]>([]);
		const total = ref<number>(0);
		const currency = ref<string>('EUR');
		const paymentMethod = ref<string>('');
		const paymentDue = ref<number>(0);
		const qrCode = ref<string | null>(null);
		const cashReceived = ref<number>(0);
		const changeAmount = ref<number>(0);

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
			activeScreen: (activeScreen.value === 'idle' ? 'sale' : activeScreen.value) as 'sale' | 'payment' | 'checkout',
			paymentMethod: paymentMethod.value,
			paymentAmount: 0,
			async confirmPaymentEntry() {},
			async cancelUnpaidInvoice() {},
			qrCode: qrCode.value,
			setQrCode() {},
			printFormat: null,
			printInvoice() {},
		}));

		const itemsCount = computed(() => {
			return items.value.reduce((sum, item) => sum + (item.qty || 0), 0);
		});

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
				activeScreen.value = type === 'PAYMENT_OK' ? 'payment_ok' : 'success';
				
				// Automatically return to idle after 5 seconds
				if (slideshowTimer) clearTimeout(slideshowTimer);
				slideshowTimer = setTimeout(() => {
					activeScreen.value = 'idle';
					setupSlideshow();
				}, 5000);
			} else if (type === 'PAYMENT_ERROR') {
				errorMessage.value = payload.message || __('Su pago no se ha podido procesar.');
				activeScreen.value = 'payment_error';
				
				// Automatically return to checkout/payment screen after 5 seconds
				if (slideshowTimer) clearTimeout(slideshowTimer);
				slideshowTimer = setTimeout(() => {
					activeScreen.value = payload.fallbackScreen || 'checkout';
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
		};

		const isCash = (method: string): boolean => {
			if (!method) return false;
			const m = method.toLowerCase();
			return m.includes('cash') || m.includes('efectivo') || m.includes('dinero');
		};

		// Money Formatter fallback
		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), currency.value);
			}
			return `${Number(value || 0).toFixed(2)} ${currency.value}`;
		};

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
			itemsCount,
			currency,
			paymentMethod,
			qrCode,
			primaryColor,
			mediaUrls,
			currentMediaIdx,
			posCtx,
			isVideo,
			nextMedia,
			fmtMoney,
			successInvoice,
			successTotal,
			errorMessage,
			cashReceived,
			changeAmount,
			isCash
		};
	}
});
</script>

<style scoped>
.customer-display-vue {
	background: #f8fafc;
}

/* Slide Transition Animations */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
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

/* Pop Transition for items quantity & price */
.pop-enter-active {
	animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
	animation: pop-out 0.2s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes pop-in {
	0% {
		opacity: 0;
		transform: scale(0.85);
	}
	70% {
		transform: scale(1.05);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}
@keyframes pop-out {
	0% {
		opacity: 1;
		transform: scale(0.95);
	}
}

/* Pop Large Transition for Grand Total */
.pop-large-enter-active {
	animation: pop-large-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.pop-large-leave-active {
	animation: pop-large-out 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pop-large-in {
	0% {
		opacity: 0;
		transform: translateY(15px) scale(0.98);
	}
	100% {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}
@keyframes pop-large-out {
	0% {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
	100% {
		opacity: 0;
		transform: translateY(-10px) scale(0.98);
	}
}

/* Cart list transition animations */
.list-enter-active {
	transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-leave-active {
	transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	position: absolute;
	left: 0;
	right: 0;
}
.list-move {
	transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-enter-from {
	opacity: 0;
	transform: translateY(12px);
}
.list-leave-to {
	opacity: 0;
	transform: scale(0.95);
}

/* QR Code Fade-in */
.animate-fade-in {
	animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: scale(0.95);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
