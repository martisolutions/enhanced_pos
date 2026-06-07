<template>
	<div class="enhanced-pos-vue min-h-screen p-6" :class="[compactClass]">

		<!-- ── Header ──────────────────────────────────────────────────── -->
		<PosHeader
			:user="state.user"
			:has-open-session="hasOpenSession"
			:show-invoice-picker="showInvoicePicker"
			:enable-customer-display="Boolean(state.enable_customer_display)"
			:customer-display-connected="customerDisplayConnected"
			@openInvoiceForm="openInvoiceForm"
			@openInvoiceFetchDialog="handleOpenInvoiceFetchDialog"
			@openRecentOrdersDialog="showRecentOrdersModal = true"
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
		<div :class="['epos-sale-layout grid grid-cols-1 lg:grid-cols-3 gap-4 transition-all duration-300', activeScreen !== 'itemSelection' ? 'blur-sm pointer-events-none scale-[0.98]' : '']">

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

		<!-- ── Multi-step Payment Dialog ────────────────────────────────── -->
		<PaymentDialog
			v-if="activeScreen !== 'itemSelection'"
			:active-screen="activeScreen"
			:processing-step="processingStep"
			:payment-methods="paymentMethods"
			:selected-payment-method="selectedPaymentMethod"
			:display-input="displayPaymentInput"
			:paid-amount="paymentAmount"
			:cart-total="cartTotal"
			:payment-due="paymentDue"
			:can-confirm-payment="canConfirmPayment"
			:currency="currency"
			:invoice-to-pay="invoiceToPay"
			:success-invoice="successInvoice"
			:success-total="successTotal"
			:pos-ctx="posCtx"
			@update:selectedPaymentMethod="selectedPaymentMethod = $event"
			@pressKey="appendPaymentKey"
			@backspace="removeLastPaymentKey"
			@setExactAmount="setExactAmount"
			@back="backToSaleScreen"
			@confirm="confirmPayment"
			@confirmPaymentEntry="confirmPaymentEntry"
			@cancelInvoice="cancelUnpaidInvoice"
			@changeMethod="changePaymentMethod"
			@print="printInvoice"
			@newSale="backToSaleScreen"
		/>

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

		<!-- Recent Orders Modal -->
		<RecentOrdersModal
			v-model="showRecentOrdersModal"
			:currency="currency"
			:call="call"
			@selectOrder="handleSelectRecentOrder"
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
import PosHeader from '../components/pos/PosHeader.vue';
import ProductCatalog from '../components/pos/ProductCatalog.vue';
import PosCart from '../components/pos/PosCart.vue';
import PaymentDialog from '../components/pos/PaymentDialog.vue';

// New modular components
import SessionStatusBar from '../components/pos/SessionStatusBar.vue';
import PluginSlot from '../components/PluginSlot.vue';
import StartupModal from '../components/pos/StartupModal.vue';
import InvoiceFetchModal from '../components/pos/InvoiceFetchModal.vue';
import QuickCreateModal from '../components/pos/QuickCreateModal.vue';
import GenericItemModal from '../components/pos/GenericItemModal.vue';
import RecentOrdersModal from '../components/pos/RecentOrdersModal.vue';

// Composables
import { useSession } from '../composables/useSession';
import { useCart } from '../composables/useCart';
import { usePayment } from '../composables/usePayment';

import PluginService from '../services/plugins';
import '../plugins';

const ENHANCED_POS_SETTINGS_KEY = 'enhanced_pos_selected_settings';

export default defineComponent({
	name: 'Home',
	components: {
		PosHeader,
		ProductCatalog,
		PosCart,
		PaymentDialog,
		SessionStatusBar,
		PluginSlot,
		StartupModal,
		InvoiceFetchModal,
		QuickCreateModal,
		GenericItemModal,
		RecentOrdersModal,
	},
	setup() {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;
		const call = inject('$call') as (...args: any[]) => Promise<any>;

		// ── Composables ────────────────────────────────────────────────
		const session = useSession(call);
		const {
			state, visualSettings, products,
			hasOpenSession, currentOpening, compactClass,
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
			activeScreen, processingStep, paymentMethods, selectedPaymentMethod,
			paymentAmount, paymentDue, canConfirmPayment, displayPaymentInput,
			successInvoice, successTotal, printFormat, printInvoice,
			loadPaymentMethods, appendPaymentKey, removeLastPaymentKey,
			setExactAmount, goToPaymentScreen, backToSaleScreen, confirmPayment,
			createInvoice, confirmPaymentEntry, cancelUnpaidInvoice, changePaymentMethod,
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

		const showRecentOrdersModal = ref(false);

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
			activeScreen.value = 'itemSelection';
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

		const handleSelectRecentOrder = async (order: any) => {
			if (!order?.name) return;
			try {
				const details = await call('enhanced_pos.api.pos.get_any_invoice_details', {
					invoice_name: order.name,
					doctype: order.doctype
				});
				if (!details?.items?.length) {
					alert(__('No se encontraron lineas para esta factura.'));
					return;
				}
				
				// Check if the invoice is unpaid and submitted (docstatus === 1 and outstanding_amount > 0)
				if (details.docstatus === 1 && details.outstanding_amount > 0) {
					// Load it as a pending reference payment
					invoiceToPay.value = {
						name: details.name,
						outstanding_amount: Number(details.outstanding_amount || 0),
						delivery_notes: details.delivery_notes || [],
					};
					const referenceKey = `__INVOICE_REFERENCE__${details.name}`;
					cartItems.value = [
						...details.items.map((item: any) => ({
							item_code: `${item.item_code}::${referenceKey}`,
							item_name: item.description || item.item_name || item.item_code,
							rate: Number(item.rate || 0),
							qty: Number(item.qty || 0),
							is_invoice_child: 1,
							parent_invoice_reference: referenceKey,
						})),
						{
							item_code: referenceKey,
							item_name: __('Referencia Factura: {0}', [details.name]),
							rate: 0, qty: 1, is_reference: 1, invoice_reference_key: referenceKey,
						},
					];
					payment.paymentInput.value = String(Number(details.outstanding_amount).toFixed(2));
					await loadPaymentMethods();
					activeScreen.value = 'itemSelection';
					
					const frappe = (window as any).frappe;
					if (frappe?.show_alert) {
						frappe.show_alert({ message: __('Factura {0} agregada al carrito.', [details.name]), indicator: 'green' });
					}
				} else {
					// It is either a Draft or already Paid.
					// Load the items directly to the cart as normal items so the cashier can copy/clone it
					invoiceToPay.value = null; // No pending reference
					cartItems.value = details.items.map((item: any) => ({
						item_code: item.item_code,
						item_name: item.item_name || item.item_code,
						rate: Number(item.rate || 0),
						qty: Number(item.qty || 0),
					}));
					activeScreen.value = 'itemSelection';
					
					const frappe = (window as any).frappe;
					if (frappe?.show_alert) {
						frappe.show_alert({ message: __('Artículos de la factura {0} cargados en el carrito.', [details.name]), indicator: 'green' });
					}
				}
			} catch (e: any) {
				alert(e.message || __('Error al cargar los detalles del pedido.'));
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
			
			const plugin = PluginService.getPaymentPlugin(selectedPaymentMethod.value);
			const config = plugin?.paymentConfig || { type: 'plugin', requiresKeypad: false, showChange: false };
			
			const formattedInput = config.formatInput 
				? config.formatInput(displayPaymentInput.value) 
				: displayPaymentInput.value;
				
			const formattedChange = config.formatChange 
				? config.formatChange(Math.max(paymentAmount.value - cartTotal.value, 0))
				: null;

			broadcastToDisplay('UPDATE_DISPLAY', {
				activeScreen: activeScreen.value === 'itemSelection' && cartItems.value.length === 0
					? 'idle'
					: activeScreen.value,
				processingStep: processingStep.value,
				items: cartItems.value,
				total: cartTotal.value,
				currency: currency.value,
				paymentMethod: selectedPaymentMethod.value,
				paymentDue: paymentDue.value,
				qrCode: qrCode.value,
				cashReceived: paymentAmount.value,
				changeAmount: Math.max(paymentAmount.value - cartTotal.value, 0),
				paymentConfig: {
					type: config.type,
					requiresKeypad: config.requiresKeypad,
					showChange: config.showChange,
					inputLabel: config.inputLabel,
					changeLabel: config.changeLabel,
				},
				formattedInput,
				formattedChange,
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

		watch(
			[
				() => cartItems.value,
				() => cartTotal.value,
				() => activeScreen.value,
				() => processingStep.value,
				() => selectedPaymentMethod.value,
				() => paymentAmount.value,
				() => displayPaymentInput.value,
				() => paymentDue.value,
				() => qrCode.value
			],
			() => {
				sendDisplayUpdate();
			},
			{ deep: true, immediate: true }
		);

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
			createInvoice,
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
			state, visualSettings, compactClass,
			hasOpenSession, currentOpening, currency, showInvoicePicker, call,
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
			createInvoice, confirmPaymentEntry, cancelUnpaidInvoice, changePaymentMethod,
			successInvoice, successTotal, printInvoice, printFormat,
			// Session handlers
			handleTriggerStartup, submitLocalStartup,
			openInvoiceForm, openRecentOrdersDialog, openClosingEntry,
			// Modal visibility
			showLocalStartupModal, localStartupForm,
			showInvoiceFetchModal, selectedInvoiceToFetch, submitInvoiceFetch,
			handleOpenInvoiceFetchDialog,
			showRecentOrdersModal, handleSelectRecentOrder,
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
