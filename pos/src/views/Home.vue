<template>
	<div class="enhanced-pos-vue min-h-screen p-6" :class="[themeClass, compactClass]">

		<!-- ── Header ──────────────────────────────────────────────────── -->
		<PosHeader
			:user="state.user"
			:has-open-session="hasOpenSession"
			:show-invoice-picker="showInvoicePicker"
			@openInvoiceForm="openInvoiceForm"
			@openInvoiceFetchDialog="handleOpenInvoiceFetchDialog"
			@openRecentOrdersDialog="openRecentOrdersDialog"
			@openClosingEntry="openClosingEntry"
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
					@increaseQty="increaseQty"
					@decreaseQty="decreaseQty"
					@removeInvoiceReference="removeInvoiceReference"
					@goToPaymentScreen="goToPaymentScreen"
				/>
				<PluginSlot hook="cart_panel" :ctx="posCtx" />
			</div>
		</div>

		<!-- ── Payment screen ────────────────────────────────────────────── -->
		<div v-else class="mt-4">
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
import { defineComponent, ref, computed, inject, onMounted } from 'vue';
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
			loadState, loadProducts, loadProfilePayments,
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
			state, loadProfilePayments, call
		);
		const {
			activeScreen, paymentMethods, selectedPaymentMethod,
			paymentAmount, paymentDue, canConfirmPayment, displayPaymentInput,
			loadPaymentMethods, appendPaymentKey, removeLastPaymentKey,
			setExactAmount, goToPaymentScreen, backToSaleScreen, confirmPayment,
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

		// ── PosContext (shared with plugins) ───────────────────────────
		const posCtx = computed<PosContext>(() => ({
			state: state.value,
			cart: cartItems.value,
			products: products.value,
			cartTotal: cartTotal.value,
			currency: currency.value,
			addToCart,
			loadProducts,
		}));

		// ── Lifecycle ──────────────────────────────────────────────────
		onMounted(async () => {
			await loadState();
			if (!hasOpenSession.value) handleTriggerStartup();
			await loadProducts();
			await loadPaymentMethods();
		});

		return {
			__,
			// Session
			state, visualSettings, themeClass, compactClass,
			hasOpenSession, currentOpening, currency, showInvoicePicker,
			// Products & catalog
			products, loadProducts,
			// Cart
			cart: cartItems, cartGroups, cartTotal,
			addToCart, increaseQty, decreaseQty, removeInvoiceReference,
			// Payment
			activeScreen, paymentMethods, selectedPaymentMethod,
			paymentAmount, paymentDue, canConfirmPayment, displayPaymentInput,
			appendPaymentKey, removeLastPaymentKey, setExactAmount,
			goToPaymentScreen, backToSaleScreen, confirmPayment,
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
</style>
