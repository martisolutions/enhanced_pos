<template>
	<div class="enhanced-pos-vue min-h-screen p-6" :class="[themeClass, compactClass]">

		<!-- ── Header ──────────────────────────────────────────────────── -->
		<PosHeader
			:user="state.user"
			:has-open-session="hasOpenSession"
			:show-invoice-picker="showInvoicePicker"
			:enable-customer-display="Boolean(state.enable_customer_display)"
			:customer-display-connected="customerDisplayConnected"
			@openInvoiceForm="openInvoiceForm"
			@openInvoiceFetchDialog="handleOpenInvoiceFetchDialog"
			@openRecentOrdersDialog="openRecentOrdersDialog"
			@openClosingEntry="openClosingEntry"
			@activateCustomerDisplay="abrirPantallaCliente"
		/>

		<!-- ── Session status bar ───────────────────────────────────────── -->
		<div class="epos-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
			<SessionStatusBar
				:has-open-session="hasOpenSession"
				:current-opening="currentOpening"
				@triggerStartup="handleTriggerStartup"
			/>
		</div>

		<!-- ── Plugin zone: above the sale screen ───────────────────────── -->
		<PluginSlot hook="sale_screen_top" :ctx="posCtx" />

		<!-- ── Main sale screen ─────────────────────────────────────────── -->
		<div v-if="activeScreen === 'sale'" class="epos-sale-layout grid grid-cols-1 lg:grid-cols-3 gap-4">

			<!-- Product Catalog -->
			<div class="lg:col-span-2">
				<ProductCatalog
					:products="products"
					:show-images="Boolean(visualSettings.show_images)"
					:currency="currency"
					:enable-quick-create="Boolean(state.enable_quick_item_creation)"
					:enable-generic-item="Boolean(state.enable_generic_item)"
					@search="loadProducts"
					@addToCart="addToCart"
					@quick-create="openQuickCreateModal"
					@generic-item="openGenericItemModal"
				/>
				<PluginSlot hook="catalog_panel" :ctx="posCtx" />
			</div>

			<!-- Cart -->
			<div class="lg:col-span-1">
				<PosCart
					:cart="cart"
					:cart-groups="cartGroups"
					:cart-total="cartTotal"
					:currency="currency"
					:ctx="posCtx"
					@increaseQty="increaseQty"
					@decreaseQty="decreaseQty"
					@removeInvoiceReference="removeInvoiceReference"
					@goToPaymentScreen="goToPaymentScreen"
				/>
				<PluginSlot hook="cart_panel" :ctx="posCtx" />
			</div>
		</div>

		<!-- ── Payment pad screen ────────────────────────────────────────── -->
		<div v-else-if="activeScreen === 'payment'" class="mt-4">
			<PaymentPad
				:payment-methods="paymentMethods"
				:selected-payment-method="selectedPaymentMethod"
				:display-input="displayPaymentInput"
				:paid-amount="paymentAmount"
				:cart-total="cartTotal"
				:payment-due="paymentDue"
				:can-confirm-payment="canConfirmPayment"
				:currency="currency"
				@update:selectedPaymentMethod="selectedPaymentMethod = $event"
				@pressKey="appendPaymentKey"
				@backspace="removeLastPaymentKey"
				@setExactAmount="setExactAmount"
				@back="backToSaleScreen"
				@confirm="confirmPayment"
			/>
			<PluginSlot hook="payment_panel" :ctx="posCtx" />
		</div>

		<!-- ── Checkout Confirmation / Waiting Screen ────────────────────── -->
		<div v-else-if="activeScreen === 'checkout'" class="mt-4 flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center">
			<div class="w-16 h-16 bg-indigo-50/10 rounded-full flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			</div>
			
			<h2 class="text-2xl font-black text-slate-800 tracking-tight mb-2">
				{{ __('Procesando Transacción') }}
			</h2>
			<p class="text-sm text-slate-500 mb-6">
				{{ __('Factura {0} generada con éxito por un importe de {1}. Esperando confirmación de cobro.', [invoiceToPay?.name, currency + ' ' + paymentAmount.toFixed(2)]) }}
			</p>
			
			<div class="w-full py-4 border-y border-slate-200 mb-6 text-left text-sm space-y-2">
				<div class="flex justify-between">
					<span class="text-slate-400">{{ __('Factura:') }}</span>
					<span class="font-mono font-semibold text-slate-700">{{ invoiceToPay?.name }}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">{{ __('Método de Pago:') }}</span>
					<span class="font-semibold text-slate-700">{{ selectedPaymentMethod }}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">{{ __('Importe:') }}</span>
					<span class="font-mono font-bold text-slate-800">{{ currency }} {{ paymentAmount.toFixed(2) }}</span>
				</div>
			</div>

			<!-- Plugins extension slot in checkout screen -->
			<div class="w-full mb-6">
				<PluginSlot hook="checkout_panel" :ctx="posCtx" />
			</div>

			<div class="flex gap-4 w-full">
				<button
					class="flex-1 btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-sm"
					@click="confirmPaymentEntry()"
				>
					{{ __('Confirmar Pago Manual') }}
				</button>
				<button
					class="btn bg-white border border-slate-200 text-slate-600 font-semibold py-3 px-6 rounded-xl hover:bg-slate-50 transition"
					@click="changePaymentMethod()"
				>
					{{ __('Cambiar Método') }}
				</button>
				<button
					class="btn bg-red-50 text-red-600 font-semibold py-3 px-6 rounded-xl hover:bg-red-100 transition"
					@click="cancelUnpaidInvoice()"
				>
					{{ __('Cancelar Factura') }}
				</button>
			</div>
		</div>

		<!-- ── Success Screen ────────────────────────────────────────────── -->
		<div v-else-if="activeScreen === 'payment_ok'" class="mt-4 flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center animate-fade-in">
			<div class="w-20 h-20 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
				</svg>
			</div>

			<h2 class="text-3xl font-black text-slate-800 tracking-tight mb-2">
				{{ __('¡Pago Registrado!') }}
			</h2>
			<p class="text-sm text-slate-500 mb-6">
				{{ __('La transacción se ha completado y la factura está pagada.') }}
			</p>

			<div class="w-full py-4 border-y border-slate-200 mb-6 text-left text-sm space-y-2">
				<div class="flex justify-between">
					<span class="text-slate-400">{{ __('Factura:') }}</span>
					<span class="font-mono font-semibold text-slate-700">{{ successInvoice }}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">{{ __('Total Pagado:') }}</span>
					<span class="font-mono font-bold text-slate-800">{{ currency }} {{ successTotal.toFixed(2) }}</span>
				</div>
			</div>

			<div class="flex gap-4 w-full">
				<button
					class="flex-1 btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-sm cursor-pointer"
					@click="backToSaleScreen()"
				>
					{{ __('Nueva Venta') }}
				</button>
				<button
					class="btn bg-white border border-slate-200 text-slate-600 font-semibold py-3 px-6 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2"
					@click="printInvoice()"
				>
					<svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
					</svg>
					{{ __('Imprimir Ticket') }}
				</button>
			</div>
		</div>

		<!-- ── Error Screen ──────────────────────────────────────────────── -->
		<div v-else-if="activeScreen === 'payment_error'" class="mt-4 flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center animate-fade-in">
			<div class="w-20 h-20 mx-auto rounded-full bg-rose-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-500/20 animate-pulse">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</div>

			<h2 class="text-3xl font-black text-slate-800 tracking-tight mb-2">
				{{ __('Error en el Pago') }}
			</h2>
			<p class="text-sm text-slate-500 mb-6">
				{{ __('No se ha podido confirmar el cobro.') }}
			</p>

			<button
				class="w-full btn bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-sm cursor-pointer"
				@click="activeScreen = 'checkout'"
			>
				{{ __('Volver a Intentar') }}
			</button>
		</div>

		<!-- ── Modals ─────────────────────────────────────────────────────── -->

		<!-- Local startup fallback -->
		<StartupModal
			v-model="showLocalStartupModal"
			:form="localStartupForm"
			@submit="submitLocalStartup"
		/>

		<!-- Local invoice fetch fallback -->
		<InvoiceFetchModal
			v-model="showInvoiceFetchModal"
			v-model:selectedInvoice="selectedInvoiceToFetch"
			@submit="submitInvoiceFetch"
		/>

		<!-- Quick item creation -->
		<QuickCreateModal
			v-model="showQuickCreateModal"
			:form="quickCreateForm"
			@submit="submitQuickCreate"
		/>

		<!-- Generic "Otros" item -->
		<GenericItemModal
			v-model="showGenericItemModal"
			:form="genericItemForm"
			@submit="submitGenericItem"
		/>

		<!-- Plugin-owned modals -->
		<PluginSlot hook="modal_extra" :ctx="posCtx" />

	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, inject, onMounted, onUnmounted, watch } from 'vue';
import type { PosContext } from '../types';

// Core components
import PosHeader from '../components/PosHeader.vue';
import ProductCatalog from '../components/ProductCatalog.vue';
import PosCart from '../components/PosCart.vue';
import PaymentPad from '../components/PaymentPad.vue';

// New modular components
import SessionStatusBar from '../components/SessionStatusBar.vue';
import PluginSlot from '../components/PluginSlot.vue';
import StartupModal from '../components/StartupModal.vue';
import InvoiceFetchModal from '../components/InvoiceFetchModal.vue';
import QuickCreateModal from '../components/QuickCreateModal.vue';
import GenericItemModal from '../components/GenericItemModal.vue';

// Composables
import { useSession } from '../composables/useSession';
import { useCart } from '../composables/useCart';
import { usePayment } from '../composables/usePayment';

const ENHANCED_POS_SETTINGS_KEY = 'enhanced_pos_selected_settings';

export default defineComponent({
	name: 'Home',
	components: {
		PosHeader,
		ProductCatalog,
		PosCart,
		PaymentPad,
		SessionStatusBar,
		PluginSlot,
		StartupModal,
		InvoiceFetchModal,
		QuickCreateModal,
		GenericItemModal,
	},
	setup() {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;
		const call = inject('$call') as (...args: any[]) => Promise<any>;

		// ── Composables ────────────────────────────────────────────────
		const session = useSession(call);
		const {
			state, visualSettings, products,
			hasOpenSession, currentOpening, themeClass, compactClass,
			currency, showInvoicePicker,
			loadState, loadProducts,
			triggerStartupDialog, openRecentOrdersDialog,
			openClosingEntry, openInvoiceForm,
		} = session;

		// Modal state must be declared before useCart (openGenericItemModal reference)
		const showGenericItemModal = ref(false);
		const genericItemForm = ref({ description: 'Otros', rate: '' as string | number });

		const openGenericItemModal = () => {
			genericItemForm.value = { description: __('Otros'), rate: '' };
			showGenericItemModal.value = true;
		};

		const cart = useCart(state, openGenericItemModal);
		const {
			cart: cartItems, invoiceToPay, cartTotal, cartGroups,
			addToCart, increaseQty, decreaseQty, removeInvoiceReference, clearCart,
		} = cart;

		const payment = usePayment(
			cartItems, invoiceToPay, cartTotal, clearCart,
			state, call
		);
		const {
			activeScreen, paymentMethods, selectedPaymentMethod,
			paymentAmount, paymentDue, canConfirmPayment, displayPaymentInput,
			successInvoice, successTotal, printFormat, printInvoice,
			loadPaymentMethods, appendPaymentKey, removeLastPaymentKey,
			setExactAmount, goToPaymentScreen, backToSaleScreen, confirmPayment,
			confirmPaymentEntry, cancelUnpaidInvoice, changePaymentMethod,
		} = payment;

		// ── Local modal states ─────────────────────────────────────────
		const showLocalStartupModal = ref(false);
		const localStartupForm = ref({
			company: '',
			pos_profile: '',
			enhanced_pos_settings: '',
		});

		const showInvoiceFetchModal = ref(false);
		const selectedInvoiceToFetch = ref('');

		const showQuickCreateModal = ref(false);
		const quickCreateForm = ref({
			item_code: '', item_name: '', item_group: '',
			valuation_rate: '' as string | number,
			standard_rate: '' as string | number,
		});

		// ── Session handlers ───────────────────────────────────────────
		const handleTriggerStartup = () => {
			triggerStartupDialog(
				async () => {
					await loadState();
					await loadProducts();
					await loadPaymentMethods();
				},
				() => { showLocalStartupModal.value = true; }
			);
		};

		const submitLocalStartup = async (form: any) => {
			try {
				await call('enhanced_pos.api.pos.create_opening_entry', {
					pos_profile: form.pos_profile,
					company: form.company,
					balance_details: [{ mode_of_payment: 'Cash', opening_amount: 0 }],
				});
				if (form.enhanced_pos_settings) {
					localStorage.setItem(ENHANCED_POS_SETTINGS_KEY, form.enhanced_pos_settings);
				}
				await loadState();
				await loadProducts();
				await loadPaymentMethods();
				showLocalStartupModal.value = false;
			} catch (e: any) {
				alert(e.message || 'Error starting POS opening session');
			}
		};

		// ── Invoice fetch handlers ─────────────────────────────────────
		const handleOpenInvoiceFetchDialog = () => {
			const frappe = (window as any).frappe;
			if (frappe?.ui?.Dialog) {
				const dialog = new frappe.ui.Dialog({
					title: __('Obtener datos de Factura'),
					fields: [{
						fieldname: 'sales_invoice', fieldtype: 'Link', options: 'Sales Invoice',
						label: __('Factura pendiente'),
						get_query: () => ({ filters: { docstatus: 1, outstanding_amount: ['>', 0] } }),
					}],
					primary_action_label: __('Cobrar Factura'),
					primary_action: async (values: any) => {
						if (!values.sales_invoice) return frappe.msgprint(__('Selecciona una factura pendiente.'));
						await fetchAndLoadInvoice(values.sales_invoice);
						dialog.hide();
					},
				});
				dialog.show();
			} else {
				selectedInvoiceToFetch.value = '';
				showInvoiceFetchModal.value = true;
			}
		};

		const fetchAndLoadInvoice = async (invoiceName: string) => {
			const invoice = await call('enhanced_pos.api.pos.get_sales_invoice_details', { invoice_name: invoiceName });
			if (!invoice?.items?.length) {
				alert(__('No se encontraron lineas para esta factura.'));
				return;
			}
			invoiceToPay.value = {
				name: invoice.name,
				outstanding_amount: Number(invoice.outstanding_amount || 0),
				delivery_notes: invoice.delivery_notes || [],
			};
			const referenceKey = `__INVOICE_REFERENCE__${invoice.name}`;
			cartItems.value = [
				...invoice.items.map((item: any) => ({
					item_code: `${item.item_code}::${referenceKey}`,
					item_name: item.description || item.item_name || item.item_code,
					rate: Number(item.rate || 0),
					qty: Number(item.qty || 0),
					is_invoice_child: 1,
					parent_invoice_reference: referenceKey,
				})),
				{
					item_code: referenceKey,
					item_name: __('Referencia Factura: {0}', [invoice.name]),
					rate: 0, qty: 1, is_reference: 1, invoice_reference_key: referenceKey,
				},
			];
			payment.paymentInput.value = String(Number(invoice.outstanding_amount || invoice.grand_total || 0).toFixed(2));
			await loadPaymentMethods();
			activeScreen.value = 'sale';
			const frappe = (window as any).frappe;
			if (frappe?.show_alert) {
				frappe.show_alert({ message: __('Factura {0} agregada al carrito.', [invoice.name]), indicator: 'green' });
			}
		};

		const submitInvoiceFetch = async () => {
			const invoiceName = selectedInvoiceToFetch.value;
			if (!invoiceName) { alert(__('Selecciona una factura pendiente.')); return; }
			try {
				await fetchAndLoadInvoice(invoiceName);
				showInvoiceFetchModal.value = false;
				selectedInvoiceToFetch.value = '';
			} catch (e: any) {
				alert(e.message || 'Error fetching sales invoice details');
			}
		};

		// ── Quick create handlers ──────────────────────────────────────
		const openQuickCreateModal = () => {
			quickCreateForm.value = { item_code: '', item_name: '', item_group: '', valuation_rate: '', standard_rate: '' };
			showQuickCreateModal.value = true;
		};

		const submitQuickCreate = async (form: any) => {
			if (!form.item_code || !form.item_name || !form.item_group || form.standard_rate === '') {
				alert(__('Por favor, rellena todos los campos obligatorios (*).'));
				return;
			}
			try {
				const posProfile = currentOpening.value?.pos_profile || null;
				const result = await call('enhanced_pos.api.pos.create_quick_item', {
					item_code: form.item_code,
					item_name: form.item_name,
					item_group: form.item_group,
					standard_rate: Number(form.standard_rate),
					valuation_rate: form.valuation_rate !== '' ? Number(form.valuation_rate) : null,
					pos_profile: posProfile,
				});
				await loadProducts(session.productSearch.value, session.selectedCategory.value);
				addToCart({ item_code: result.item_code, item_name: result.item_name, rate: result.rate });
				showQuickCreateModal.value = false;
				alert(__('Producto creado y añadido al carrito.'));
			} catch (e: any) {
				alert(e.message || 'Error al crear el producto.');
			}
		};

		// ── Generic item handler ───────────────────────────────────────
		const submitGenericItem = async (form: any) => {
			if (!form.description || form.rate === '') {
				alert(__('Por favor, introduce una descripción y el precio.'));
				return;
			}
			try {
				const baseItemCode = state.value.generic_item_code || 'Otros';
				await call('enhanced_pos.api.pos.ensure_generic_item', { item_code: baseItemCode });
				const uniqueCode = `${baseItemCode}::generic::${Date.now()}`;
				addToCart({ item_code: uniqueCode, item_name: form.description, rate: Number(form.rate) });
				showGenericItemModal.value = false;
			} catch (e: any) {
				alert(e.message || 'Error al añadir el producto genérico.');
			}
		};

		// ── BroadcastChannel for Customer Display ──────────────────────
		const customerDisplayConnected = ref(false);
		let pingInterval: any = null;
		let pongTimeout: any = null;
		const bc = new BroadcastChannel('pos_customer_display');
		const qrCode = ref<string | null>(null);

		const broadcastToDisplay = (type: string, payload: any) => {
			// Deep clone to plain JavaScript object to strip Vue reactive Proxies
			const cleanPayload = payload ? JSON.parse(JSON.stringify(payload)) : null;
			bc.postMessage({ type, payload: cleanPayload });
		};

		const sendDisplayUpdate = () => {
			if (!state.value.enable_customer_display) return;
			broadcastToDisplay('UPDATE_DISPLAY', {
				activeScreen: activeScreen.value,
				items: cartItems.value,
				total: cartTotal.value,
				currency: currency.value,
				paymentMethod: selectedPaymentMethod.value,
				paymentDue: paymentDue.value,
				qrCode: qrCode.value,
				config: {
					primary_color: state.value.primary_color,
					customer_display_media: state.value.customer_display_media,
					media_rotation_interval: state.value.media_rotation_interval,
				}
			});
		};

		bc.onmessage = (event) => {
			const { type } = event.data;
			if (type === 'POS_PONG' || type === 'CUSTOMER_DISPLAY_BOOT') {
				customerDisplayConnected.value = true;
				clearTimeout(pongTimeout);
				sendDisplayUpdate();
			}
		};

		const pingDisplay = () => {
			if (!state.value.enable_customer_display) return;
			const cleanConfig = JSON.parse(JSON.stringify({
				config: {
					primary_color: state.value.primary_color,
					customer_display_media: state.value.customer_display_media,
					media_rotation_interval: state.value.media_rotation_interval,
				}
			}));
			bc.postMessage({
				type: 'POS_PING',
				payload: cleanConfig
			});
			pongTimeout = setTimeout(() => {
				customerDisplayConnected.value = false;
			}, 1500);
		};

		watch([cartItems, cartTotal, activeScreen, selectedPaymentMethod, paymentDue, qrCode], () => {
			sendDisplayUpdate();
		}, { deep: true });

		const abrirPantallaCliente = async (screen: any) => {
			try {
				let windowFeatures = 'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no';
				if (screen) {
					windowFeatures = `left=${screen.left},top=${screen.top},width=${screen.width},height=${screen.height},menubar=no,toolbar=no,location=no,status=no`;
				}
				window.open('/pos/customer-display', 'CustomerDisplay', windowFeatures);
			} catch (err) {
				console.error("Error opening customer display:", err);
				window.open('/pos/customer-display', 'CustomerDisplay');
			}
		};

		// ── PosContext (shared with plugins) ───────────────────────────
		const posCtx = computed<PosContext>(() => ({
			state: state.value,
			cart: cartItems.value,
			products: products.value,
			cartTotal: cartTotal.value,
			currency: currency.value,
			addToCart,
			loadProducts,
			customerDisplayConnected: customerDisplayConnected.value,
			broadcastToDisplay,
			invoiceToPay: invoiceToPay.value,
			activeScreen: activeScreen.value,
			paymentMethod: selectedPaymentMethod.value,
			paymentAmount: paymentAmount.value,
			confirmPaymentEntry,
			cancelUnpaidInvoice,
			qrCode: qrCode.value,
			setQrCode: (val: string | null) => { qrCode.value = val; },
			printFormat: printFormat.value,
			printInvoice,
		}));

		// ── Lifecycle ──────────────────────────────────────────────────
		onMounted(async () => {
			await loadState();
			if (!hasOpenSession.value) handleTriggerStartup();
			await loadProducts();
			await loadPaymentMethods();

			if (state.value.enable_customer_display) {
				pingDisplay();
				pingInterval = setInterval(pingDisplay, 4000);
			}
		});

		onUnmounted(() => {
			if (pingInterval) clearInterval(pingInterval);
			if (pongTimeout) clearTimeout(pongTimeout);
			bc.close();
		});

		return {
			__,
			// Session
			state, visualSettings, themeClass, compactClass,
			hasOpenSession, currentOpening, currency, showInvoicePicker,
			// Products & catalog
			products, loadProducts,
			// Cart
			cart: cartItems, cartGroups, cartTotal, invoiceToPay,
			addToCart, increaseQty, decreaseQty, removeInvoiceReference,
			// Payment
			activeScreen, paymentMethods, selectedPaymentMethod,
			paymentAmount, paymentDue, canConfirmPayment, displayPaymentInput,
			appendPaymentKey, removeLastPaymentKey, setExactAmount,
			goToPaymentScreen, backToSaleScreen, confirmPayment,
			confirmPaymentEntry, cancelUnpaidInvoice, changePaymentMethod,
			successInvoice, successTotal, printInvoice, printFormat,
			// Session handlers
			handleTriggerStartup, submitLocalStartup,
			openInvoiceForm, openRecentOrdersDialog, openClosingEntry,
			// Modal visibility
			showLocalStartupModal, localStartupForm,
			showInvoiceFetchModal, selectedInvoiceToFetch, submitInvoiceFetch,
			handleOpenInvoiceFetchDialog,
			showQuickCreateModal, quickCreateForm, openQuickCreateModal, submitQuickCreate,
			showGenericItemModal, genericItemForm, openGenericItemModal, submitGenericItem,
			// Plugin context
			posCtx,
			// Customer Display
			customerDisplayConnected,
			abrirPantallaCliente,
		};
	},
});
</script>

<style scoped>
.enhanced-pos-vue {
	background: linear-gradient(130deg, #f7f9f5 0%, #ebf4ef 100%);
	transition: background 0.3s ease;
}
.theme-ocean {
	background: linear-gradient(130deg, #f5f9fb 0%, #e5f0f5 100%);
}
.theme-sun {
	background: linear-gradient(130deg, #fffaf3 0%, #fff0df 100%);
}
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
