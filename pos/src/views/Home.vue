<template>
	<div class="enhanced-pos-vue min-h-screen p-6" :class="[themeClass, compactClass]">
		<!-- Top Navigation Header -->
		<PosHeader
			:user="state.user"
			:has-open-session="hasOpenSession"
			:show-invoice-picker="showInvoicePicker"
			@openInvoiceForm="openInvoiceForm"
			@openInvoiceFetchDialog="openInvoiceFetchDialog"
			@openRecentOrdersDialog="openRecentOrdersDialog"
			@openClosingEntry="openClosingEntry"
		/>

		<!-- Session Status Bar -->
		<div class="epos-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
			<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm col-span-3">
				<div v-if="hasOpenSession" class="flex justify-between items-center text-sm text-gray-500">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
						<span class="font-semibold text-gray-700">{{ __("Apertura") }}:</span>
						<span class="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">{{ currentOpening.name }}</span>
					</div>
					<div>
						<span class="font-semibold text-gray-700">{{ __("Perfil") }}:</span>
						<span class="font-medium ml-1">{{ currentOpening.pos_profile }}</span>
					</div>
					<div>
						<span class="font-semibold text-gray-700">{{ __("Inicio") }}:</span>
						<span class="font-medium ml-1">{{ formatUserDate(currentOpening.period_start_date) }}</span>
					</div>
				</div>
				<div v-else class="text-center py-2 text-red-500 font-semibold flex items-center justify-center gap-2">
					<span class="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
					{{ __("No hay sesion abierta. Completa el asistente inicial.") }}
					<button
						class="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-xs font-semibold transition ml-3"
						@click="triggerStartupDialog"
					>
						{{ __("Abrir Caja") }}
					</button>
				</div>
			</div>
		</div>

		<!-- Main Sales Screen -->
		<div v-if="activeScreen === 'sale'" class="epos-sale-layout grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Product Catalog (Col Span 2) -->
			<div class="lg:col-span-2">
				<ProductCatalog
					:products="products"
					:show-images="Boolean(visualSettings.show_images)"
					:currency="currency"
					@search="loadProducts"
					@addToCart="addToCart"
				/>
			</div>

			<!-- Cart Summary -->
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
			</div>
		</div>

		<!-- Payment Screen -->
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
		</div>

		<!-- Standalone Local Fallback Startup Dialog Modal -->
		<div v-if="showLocalStartupModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 border border-gray-100">
				<h3 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
					{{ __("Apertura de Caja (Fallback Local)") }}
				</h3>
				<div class="flex flex-col gap-3">
					<div>
						<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">{{ __("Company") }}</label>
						<AppLinkField
							v-model="localStartupForm.company"
							doctype="Company"
						/>
					</div>
					<div>
						<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">{{ __("POS Profile") }}</label>
						<AppLinkField
							v-model="localStartupForm.pos_profile"
							doctype="POS Profile"
							:filters="{ company: localStartupForm.company }"
						/>
					</div>
					<div>
						<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">{{ __("Configuracion POS") }}</label>
						<AppLinkField
							v-model="localStartupForm.enhanced_pos_settings"
							doctype="Enhanced POS Settings"
						/>
					</div>
				</div>
				<div class="flex gap-2 justify-end mt-4">
					<button class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" @click="submitLocalStartup">
						{{ __("Iniciar POS") }}
					</button>
				</div>
			</div>
		</div>

		<!-- Standalone Local Fallback Fetch Invoice Dialog Modal -->
		<div v-if="showInvoiceFetchModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 border border-gray-100">
				<h3 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
					{{ __("Obtener datos de Factura") }}
				</h3>
				<div class="flex flex-col gap-3">
					<div>
						<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">{{ __("Factura pendiente") }}</label>
						<AppLinkField
							v-model="selectedInvoiceToFetch"
							doctype="Sales Invoice"
							:filters="{ docstatus: 1, outstanding_amount: ['>', 0] }"
							:placeholder="__('Selecciona una factura pendiente...')"
						/>
					</div>
				</div>
				<div class="flex gap-2 justify-end mt-4">
					<button class="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50" @click="showInvoiceFetchModal = false">
						{{ __("Cerrar") }}
					</button>
					<button class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700" @click="submitInvoiceFetch">
						{{ __("Cobrar Factura") }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, inject, onMounted, watch } from 'vue';
import type { POSState, Product, CartItem, CartGroup } from '../types';
import PosHeader from '../components/PosHeader.vue';
import ProductCatalog from '../components/ProductCatalog.vue';
import PosCart from '../components/PosCart.vue';
import PaymentPad from '../components/PaymentPad.vue';
import AppLinkField from '../components/AppLinkField.vue';
import PluginService from '../services/plugins';

const ENHANCED_POS_SETTINGS_KEY = "enhanced_pos_selected_settings";

export default defineComponent({
	name: 'Home',
	components: {
		PosHeader,
		ProductCatalog,
		PosCart,
		PaymentPad,
		AppLinkField
	},
	setup() {
		const __ = (text: string, args?: any[]) => (window as any).__ ? (window as any).__(text, args) : text;
		const call = inject('$call') as any;

		// Session state
		const state = ref<POSState>({
			opening_entries: [],
			invoice_type: "POS Invoice",
			show_invoice_picker: 0,
			auto_create_delivery_note: 0,
			enhanced_pos_settings: "",
			visual_settings_defaults: {
				theme: "forest",
				compact_mode: 0,
				show_images: 1,
				show_stock: 1
			},
			user: ""
		});

		// Visual settings
		const visualSettings = ref({
			theme: "forest",
			compact_mode: 0,
			show_images: 1,
			show_stock: 1
		});

		const activeScreen = ref("sale");
		const productSearch = ref("");
		const products = ref<Product[]>([]);
		const cart = ref<CartItem[]>([]);
		const paymentMethods = ref<string[]>([]);
		const selectedPaymentMethod = ref("");
		const paymentInput = ref("0");
		const invoiceToPay = ref<any>(null);

		// Local Dialog Modal Fallback variables
		const showLocalStartupModal = ref(false);
		const localStartupForm = ref({
			company: "Company",
			pos_profile: "POS Profile",
			enhanced_pos_settings: ""
		});

		const showInvoiceFetchModal = ref(false);
		const selectedInvoiceToFetch = ref("");

		// Computed properties
		const hasOpenSession = computed(() => (state.value.opening_entries || []).length > 0);
		const currentOpening = computed(() => (state.value.opening_entries || [])[0] || null);
		const themeClass = computed(() => `theme-${visualSettings.value.theme || "forest"}`);
		const compactClass = computed(() => visualSettings.value.compact_mode ? "compact" : "");
		const currency = computed(() => currentOpening.value?.currency || (window as any).frappe?.defaults?.get_default("currency") || "EUR");
		const showInvoicePicker = computed(() => Boolean(state.value.show_invoice_picker));

		const cartTotal = computed(() => {
			return cart.value.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.rate || 0), 0);
		});

		const cartGroups = computed<CartGroup[]>(() => {
			const groups: CartGroup[] = [];
			const childrenByReference: Record<string, CartItem[]> = {};
			for (const row of cart.value) {
				if (!row.parent_invoice_reference) continue;
				(childrenByReference[row.parent_invoice_reference] ||= []).push(row);
			}

			const seenChildren = new Set();
			for (const row of cart.value) {
				if (row.is_reference) {
					const referenceKey = row.invoice_reference_key || row.item_code;
					const children = childrenByReference[referenceKey] || [];
					children.forEach((child) => seenChildren.add(child));
					groups.push({ type: "invoice", reference: row, children });
					continue;
				}
				if (!row.parent_invoice_reference) {
					groups.push({ type: "item", row });
				}
			}

			for (const row of cart.value) {
				if (row.parent_invoice_reference && !seenChildren.has(row)) {
					groups.push({ type: "item", row });
				}
			}

			return groups;
		});

		const paymentAmount = computed(() => {
			return Number(String(paymentInput.value || "0").replace(",", ".")) || 0;
		});

		const expectedPaymentTotal = computed(() => {
			if (invoiceToPay.value?.outstanding_amount) {
				return Number(invoiceToPay.value.outstanding_amount || 0);
			}
			return cartTotal.value;
		});

		const paymentDue = computed(() => {
			return Math.max(expectedPaymentTotal.value - paymentAmount.value, 0);
		});

		const canConfirmPayment = computed(() => {
			return !!selectedPaymentMethod.value && cart.value.length > 0 && paymentAmount.value >= expectedPaymentTotal.value;
		});

		const displayPaymentInput = computed(() => {
			let current = String(paymentInput.value || "0");
			if (current === "") current = "0";
			const hasTrailingDot = current.endsWith(".");
			const parts = current.split(".");
			const integerPart = parts[0].replace(/^0+(?=\d)/, "") || "0";
			const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			if (parts.length > 1) {
				return `${formattedInt}.${parts[1]}`;
			}
			return hasTrailingDot ? `${formattedInt}.` : formattedInt;
		});

		// Loading methods
		const loadState = async () => {
			try {
				const sessionState = await call("enhanced_pos.api.pos.get_session_state");
				state.value = { ...state.value, ...sessionState };

				// Load stored settings
				let stored: any = {};
				try {
					stored = JSON.parse(localStorage.getItem("enhanced_pos_visual_settings") || "{}");
				} catch {
					stored = {};
				}
				visualSettings.value = {
					theme: stored.theme || state.value.visual_settings_defaults.theme || "forest",
					compact_mode: Number(stored.compact_mode ?? state.value.visual_settings_defaults.compact_mode ?? 0),
					show_images: Number(stored.show_images ?? state.value.visual_settings_defaults.show_images ?? 1),
					show_stock: Number(stored.show_stock ?? state.value.visual_settings_defaults.show_stock ?? 1)
				};

				let settingsName = localStorage.getItem(ENHANCED_POS_SETTINGS_KEY) || state.value.enhanced_pos_settings || "";
				let cfg: any = {};
				if (settingsName) {
					cfg = await call("enhanced_pos.api.pos.get_enhanced_pos_settings", { settings_name: settingsName });
				}
				if (!cfg?.name) {
					cfg = await call("enhanced_pos.api.pos.get_default_enhanced_pos_settings");
				}
				if (cfg?.name) {
					state.value.show_invoice_picker = Number(cfg.show_invoice_picker || 0);
					state.value.auto_create_delivery_note = Number(cfg.auto_create_delivery_note || 0);
					state.value.enhanced_pos_settings = cfg.name || "";
					localStorage.setItem(ENHANCED_POS_SETTINGS_KEY, cfg.name);
				}
			} catch (e) {
				console.error("Error loading POS session state:", e);
			}
		};

		const loadProfilePayments = async (pos_profile: string) => {
			const data = await call("enhanced_pos.api.pos.get_profile_data", { pos_profile });
			return data.payments || [];
		};

		const loadProducts = async (search_term = "") => {
			productSearch.value = search_term;
			const posProfile = currentOpening.value?.pos_profile || null;
			products.value = await call("enhanced_pos.api.pos.get_sellable_items", {
				search_term: search_term,
				limit: 60,
				pos_profile: posProfile
			});
		};

		const loadPaymentMethods = async () => {
			if (!currentOpening.value?.pos_profile) {
				paymentMethods.value = [];
				selectedPaymentMethod.value = "";
				return;
			}
			const profile = await loadProfilePayments(currentOpening.value.pos_profile);
			paymentMethods.value = (profile || []).map((row: any) => row.mode_of_payment).filter(Boolean);
			if (!selectedPaymentMethod.value && paymentMethods.value.length) {
				selectedPaymentMethod.value = paymentMethods.value[0];
			}
		};

		// Dialogue Handlers
		const triggerStartupDialog = () => {
			const frappe = (window as any).frappe;
			if (frappe && frappe.ui && frappe.ui.Dialog) {
				const dialog = new frappe.ui.Dialog({
					title: __("Apertura de caja"),
					static: true,
					fields: [
						{
							fieldtype: "Link",
							label: __("Company"),
							default: frappe.defaults.get_default("company"),
							options: "Company",
							fieldname: "company",
							reqd: 1
						},
						{
							fieldtype: "Link",
							label: __("Configuracion POS"),
							options: "Enhanced POS Settings",
							fieldname: "enhanced_pos_settings",
							default: localStorage.getItem(ENHANCED_POS_SETTINGS_KEY) || "",
							reqd: 1
						},
						{
							fieldtype: "Link",
							label: __("POS Profile"),
							options: "POS Profile",
							fieldname: "pos_profile",
							reqd: 1,
							get_query: () => ({
								query: "erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query",
								filters: { company: dialog.get_value("company") }
							}),
							onchange: async () => {
								const profile = dialog.get_value("pos_profile");
								if (!profile) {
									dialog.fields_dict.balance_details.df.data = [];
									dialog.fields_dict.balance_details.grid.refresh();
									return;
								}
								const payments = await loadProfilePayments(profile);
								dialog.fields_dict.balance_details.df.data = payments.map((row: any) => ({
									mode_of_payment: row.mode_of_payment,
									opening_amount: 0
								}));
								dialog.fields_dict.balance_details.grid.refresh();
							}
						},
						{
							fieldname: "balance_details",
							fieldtype: "Table",
							label: __("Opening Balance Details"),
							reqd: 1,
							in_place_edit: true,
							data: [],
							fields: [
								{
									fieldname: "mode_of_payment",
									fieldtype: "Link",
									label: __("Mode of Payment"),
									options: "Mode of Payment",
									in_list_view: 1,
									reqd: 1
								},
								{
									fieldname: "opening_amount",
									fieldtype: "Currency",
									label: __("Opening Amount"),
									options: "company:company_currency",
									in_list_view: 1,
									reqd: 1
								}
							]
						}
					],
					primary_action_label: __("Iniciar POS"),
					primary_action: async (values: any) => {
						if (!values.pos_profile) return frappe.msgprint(__("Selecciona un Perfil de POS valido."));
						if (!values.company) return frappe.msgprint(__("Selecciona una compania valida."));
						if (!values.enhanced_pos_settings) return frappe.msgprint(__("Selecciona una configuracion de POS valida."));
						const rows = (values.balance_details || []).filter((d: any) => d.mode_of_payment);
						if (!rows.length) return frappe.msgprint(__("Debes definir al menos un metodo de pago para apertura."));

						await call("enhanced_pos.api.pos.create_opening_entry", {
							pos_profile: values.pos_profile,
							company: values.company,
							balance_details: rows
						});
						localStorage.setItem(ENHANCED_POS_SETTINGS_KEY, values.enhanced_pos_settings || "");
						await loadState();
						await loadProducts();
						await loadPaymentMethods();
						frappe.show_alert({ message: __("POS iniciado"), indicator: "green" });
						dialog.hide();
					}
				});
				dialog.show();
			} else {
				// Standalone UI Modal fallback
				showLocalStartupModal.value = true;
			}
		};

		const submitLocalStartup = async () => {
			try {
				await call("enhanced_pos.api.pos.create_opening_entry", {
					pos_profile: localStartupForm.value.pos_profile,
					company: localStartupForm.value.company,
					balance_details: [{ mode_of_payment: "Cash", opening_amount: 0 }]
				});
				if (localStartupForm.value.enhanced_pos_settings) {
					localStorage.setItem(ENHANCED_POS_SETTINGS_KEY, localStartupForm.value.enhanced_pos_settings);
				}
				await loadState();
				await loadProducts();
				await loadPaymentMethods();
				showLocalStartupModal.value = false;
			} catch (e: any) {
				alert(e.message || "Error starting POS opening session");
			}
		};

		const openInvoiceForm = () => {
			const frappe = (window as any).frappe;
			if (frappe && frappe.new_doc) {
				frappe.new_doc(state.value.invoice_type || "POS Invoice");
			} else {
				alert("Frappe environment not detected.");
			}
		};

		const openInvoiceFetchDialog = () => {
			const frappe = (window as any).frappe;
			if (frappe && frappe.ui && frappe.ui.Dialog) {
				const dialog = new frappe.ui.Dialog({
					title: __("Obtener datos de Factura"),
					fields: [
						{
							fieldname: "sales_invoice",
							fieldtype: "Link",
							options: "Sales Invoice",
							label: __("Factura pendiente"),
							get_query: () => ({
								filters: {
									docstatus: 1,
									outstanding_amount: [">", 0]
								}
							})
						}
					],
					primary_action_label: __("Cobrar Factura"),
					primary_action: async (values: any) => {
						const invoiceName = values.sales_invoice;
						if (!invoiceName) return frappe.msgprint(__("Selecciona una factura pendiente."));

						const invoice = await call("enhanced_pos.api.pos.get_sales_invoice_details", { invoice_name: invoiceName });
						if (!invoice?.items?.length) {
							return frappe.msgprint(__("No se encontraron lineas para esta factura."));
						}

						invoiceToPay.value = {
							name: invoice.name,
							outstanding_amount: Number(invoice.outstanding_amount || 0),
							delivery_notes: invoice.delivery_notes || []
						};

						const referenceKey = `__INVOICE_REFERENCE__${invoice.name}`;
						cart.value = [
							...invoice.items.map((item: any) => ({
								item_code: `${item.item_code}::${referenceKey}`,
								item_name: item.description || item.item_name || item.item_code,
								rate: Number(item.rate || 0),
								qty: Number(item.qty || 0),
								is_invoice_child: 1,
								parent_invoice_reference: referenceKey
							})),
							{
								item_code: referenceKey,
								item_name: __("Referencia Factura: {0}", [invoice.name]),
								rate: 0,
								qty: 1,
								is_reference: 1,
								invoice_reference_key: referenceKey
							}
						];

						paymentInput.value = String(Number(invoice.outstanding_amount || invoice.grand_total || 0).toFixed(2));
						await loadPaymentMethods();
						activeScreen.value = "sale";
						frappe.show_alert({ message: __("Factura {0} agregada al carrito.", [invoice.name]), indicator: "green" });
						dialog.hide();
					}
				});
				dialog.show();
			} else {
				selectedInvoiceToFetch.value = "";
				showInvoiceFetchModal.value = true;
			}
		};

		const submitInvoiceFetch = async () => {
			const invoiceName = selectedInvoiceToFetch.value;
			if (!invoiceName) {
				alert(__("Selecciona una factura pendiente."));
				return;
			}

			try {
				const invoice = await call("enhanced_pos.api.pos.get_sales_invoice_details", { invoice_name: invoiceName });
				if (!invoice?.items?.length) {
					alert(__("No se encontraron lineas para esta factura."));
					return;
				}

				invoiceToPay.value = {
					name: invoice.name,
					outstanding_amount: Number(invoice.outstanding_amount || 0),
					delivery_notes: invoice.delivery_notes || []
				};

				const referenceKey = `__INVOICE_REFERENCE__${invoice.name}`;
				cart.value = [
					...invoice.items.map((item: any) => ({
						item_code: `${item.item_code}::${referenceKey}`,
						item_name: item.description || item.item_name || item.item_code,
						rate: Number(item.rate || 0),
						qty: Number(item.qty || 0),
						is_invoice_child: 1,
						parent_invoice_reference: referenceKey
					})),
					{
						item_code: referenceKey,
						item_name: __("Referencia Factura: {0}", [invoice.name]),
						rate: 0,
						qty: 1,
						is_reference: 1,
						invoice_reference_key: referenceKey
					}
				];

				paymentInput.value = String(Number(invoice.outstanding_amount || invoice.grand_total || 0).toFixed(2));
				await loadPaymentMethods();
				activeScreen.value = "sale";

				const frappe = (window as any).frappe;
				if (frappe && frappe.show_alert) {
					frappe.show_alert({ message: __("Factura {0} agregada al carrito.", [invoice.name]), indicator: "green" });
				} else {
					console.log(`Factura ${invoice.name} agregada al carrito.`);
				}

				showInvoiceFetchModal.value = false;
				selectedInvoiceToFetch.value = "";
			} catch (e: any) {
				alert(e.message || "Error fetching sales invoice details");
			}
		};

		const openRecentOrdersDialog = () => {
			const frappe = (window as any).frappe;
			if (frappe && frappe.ui && frappe.ui.Dialog) {
				let searchRecentOrders: any;
				const dialog = new frappe.ui.Dialog({
					title: __("Ordenes Recientes"),
					size: "large",
					fields: [
						{
							fieldname: "search_term",
							fieldtype: "Data",
							label: __("Buscar Cliente / Factura / Ticket"),
							onchange: () => searchRecentOrders()
						},
						{
							fieldname: "results_html",
							fieldtype: "HTML"
						}
					],
					primary_action_label: __("Cerrar"),
					primary_action: () => dialog.hide()
				});

				searchRecentOrders = async () => {
					const term = (dialog.get_value("search_term") || "").trim();
					const orders = await call("enhanced_pos.api.pos.get_recent_orders", {
						search_term: term,
						status: "Paid",
						limit: 20
					});

					const wrapper = dialog.fields_dict.results_html.$wrapper;
					if (!orders.length) {
						wrapper.html(`<div class="p-4 text-center text-gray-400 border border-dashed rounded-xl mt-2">${__("No se encontraron resultados.")}</div>`);
						return;
					}

					const html = orders.map((order: any) => {
						const customer = order.customer_name || order.customer || "-";
						const total = `${order.grand_total || 0} ${order.currency || ""}`.trim();
						return `
							<div class="flex justify-between items-center p-3 border border-gray-100 rounded-xl mb-2 hover:bg-gray-50">
								<div>
									<div class="font-bold text-gray-800">${order.name}</div>
									<div class="text-xs text-gray-500">${customer}</div>
								</div>
								<div class="flex gap-3 items-center">
									<strong class="text-gray-800 text-sm">${total}</strong>
									<button class="btn btn-sm btn-default epos-open-order border border-gray-300 hover:bg-gray-100 px-3 py-1 rounded-lg text-xs" data-name="${order.name}">
										${__("Abrir")}
									</button>
								</div>
							</div>`;
					}).join("");

					wrapper.html(`<div class="mt-2 max-h-[350px] overflow-y-auto">${html}</div>`);
					wrapper.find(".epos-open-order").on("click", function (this: HTMLElement) {
						const name = (window as any).$(this).data("name");
						if (!name) return;
						const frappe = (window as any).frappe;
						if (frappe && frappe.set_route) {
							frappe.set_route("Form", state.value.invoice_type || "POS Invoice", name);
						} else {
							redirectToForm(state.value.invoice_type || "POS Invoice", name);
						}
						dialog.hide();
					});
				};

				dialog.show();
				searchRecentOrders();
			} else {
				alert("Frappe environment not detected.");
			}
		};

		const redirectToForm = (doctype: string, name: string) => {
			const slug = doctype.toLowerCase().replace(/ /g, '-');
			window.location.href = `/app/${slug}/${name}`;
		};

		const openClosingEntry = async () => {
			if (!currentOpening.value) return;
			const closingEntry = await call("enhanced_pos.api.pos.create_closing_entry_from_opening", {
				pos_opening_entry: currentOpening.value.name
			});
			const frappe = (window as any).frappe;
			if (frappe && frappe.set_route) {
				frappe.set_route("Form", "POS Closing Entry", closingEntry.name);
			} else {
				redirectToForm("POS Closing Entry", closingEntry.name);
			}
		};

		const formatUserDate = (value: string) => {
			if (!value) return "-";
			try {
				return (window as any).frappe?.datetime?.str_to_user ? (window as any).frappe.datetime.str_to_user(value) : value;
			} catch {
				return value;
			}
		};

		// Cart actions
		const addToCart = (item: any) => {
			if (invoiceToPay.value?.name) {
				alert(__("Quita la factura seleccionada antes de agregar otros productos."));
				return;
			}
			const idx = cart.value.findIndex((row) => row.item_code === item.item_code);
			if (idx >= 0) {
				cart.value[idx].qty += 1;
			} else {
				cart.value.push({
					item_code: item.item_code,
					item_name: item.item_name || item.item_code,
					rate: Number(item.rate || 0),
					qty: 1
				});
			}
			PluginService.triggerOnItemAdd(item, cart.value);
		};

		const increaseQty = (row: any) => {
			if (row.is_reference || row.is_invoice_child) return;
			row.qty += 1;
		};

		const decreaseQty = (row: any) => {
			if (row.is_reference || row.is_invoice_child) return;
			row.qty = Math.max(0, row.qty - 1);
			if (row.qty === 0) {
				cart.value = cart.value.filter((d) => d.item_code !== row.item_code);
			}
		};

		const removeInvoiceReference = (refRow: any) => {
			invoiceToPay.value = null;
			cart.value = cart.value.filter(
				row => row.item_code !== refRow.item_code && row.parent_invoice_reference !== refRow.invoice_reference_key
			);
			paymentInput.value = "0";
		};

		// Payment Keypad logic
		const appendPaymentKey = (key: string) => {
			const normalized = key === "," ? "." : key;
			let current = String(paymentInput.value || "0");
			if (normalized === ".") {
				if (current.includes(".")) return;
				paymentInput.value = `${current}.`;
				return;
			}
			if (current === "0") {
				paymentInput.value = normalized;
				return;
			}
			paymentInput.value = `${current}${normalized}`;
		};

		const removeLastPaymentKey = () => {
			const current = String(paymentInput.value || "0");
			if (current.length <= 1) {
				paymentInput.value = "0";
				return;
			}
			const trimmed = current.slice(0, -1);
			paymentInput.value = trimmed === "" || trimmed === "." ? "0" : trimmed;
		};

		const setExactAmount = () => {
			paymentInput.value = String(expectedPaymentTotal.value.toFixed(2));
		};

		const goToPaymentScreen = async () => {
			if (!cart.value.length) return alert(__("Agrega productos al carrito."));
			invoiceToPay.value = null;
			await loadPaymentMethods();
			paymentInput.value = String(expectedPaymentTotal.value.toFixed(2));
			activeScreen.value = "payment";
		};

		const backToSaleScreen = () => {
			activeScreen.value = "sale";
		};

		const confirmPayment = async () => {
			if (!canConfirmPayment.value) return;
			const method = selectedPaymentMethod.value;
			const total = expectedPaymentTotal.value;

			try {
				if (invoiceToPay.value?.name) {
					const result = await call("enhanced_pos.api.pos.create_invoice_payment_entry", {
						invoice_name: invoiceToPay.value.name,
						mode_of_payment: method,
						paid_amount: paymentAmount.value,
						create_delivery_note: state.value.auto_create_delivery_note
					});
					invoiceToPay.value = null;
					cart.value = [];
					paymentInput.value = "0";
					activeScreen.value = "sale";
					alert(__("Pago registrado en {0} por {1}", [result.payment_entry, total]));

					// Trigger plugins after payment
					await PluginService.triggerAfterPayment(result);
					return;
				}

				// Standard payment flow (no invoice ref)
				cart.value = [];
				paymentInput.value = "0";
				activeScreen.value = "sale";
				alert(__("Pago confirmado con {0} por {1}", [method, total]));

				await PluginService.triggerAfterPayment({ method, amount: total });
			} catch (e: any) {
				alert(e.message || "Error processing payment");
			}
		};

		watch(() => visualSettings.value, (next) => {
			localStorage.setItem("enhanced_pos_visual_settings", JSON.stringify(next));
		}, { deep: true });

		onMounted(async () => {
			await loadState();
			if (!hasOpenSession.value) {
				triggerStartupDialog();
			}
			await loadProducts();
			await loadPaymentMethods();
		});

		return {
			__,
			state,
			visualSettings,
			activeScreen,
			products,
			cart,
			cartTotal,
			cartGroups,
			paymentMethods,
			selectedPaymentMethod,
			paymentAmount,
			paymentDue,
			canConfirmPayment,
			displayPaymentInput,
			hasOpenSession,
			currentOpening,
			themeClass,
			compactClass,
			currency,
			showInvoicePicker,
			showLocalStartupModal,
			localStartupForm,
			triggerStartupDialog,
			submitLocalStartup,
			openInvoiceForm,
			openInvoiceFetchDialog,
			openRecentOrdersDialog,
			showInvoiceFetchModal,
			selectedInvoiceToFetch,
			submitInvoiceFetch,
			openClosingEntry,
			formatUserDate,
			loadProducts,
			addToCart,
			increaseQty,
			decreaseQty,
			removeInvoiceReference,
			appendPaymentKey,
			removeLastPaymentKey,
			setExactAmount,
			goToPaymentScreen,
			backToSaleScreen,
			confirmPayment
		};
	}
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
