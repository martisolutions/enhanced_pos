import { ref, computed, watch } from 'vue';
import type { POSState, Product, VisualSettings } from '../types';
import PluginService from '../services/plugins';

const ENHANCED_POS_SETTINGS_KEY = 'enhanced_pos_selected_settings';

const DEFAULT_STATE: POSState = {
	opening_entries: [],
	invoice_type: 'POS Invoice',
	show_invoice_picker: 0,
	auto_create_delivery_note: 0,
	enhanced_pos_settings: '',
	visual_settings_defaults: {
		compact_mode: 0,
		show_images: 1,
		show_stock: 1,
	},
	user: '',
	enable_quick_item_creation: 0,
	enable_generic_item: 0,
	generic_item_code: '',
	enable_customer_display: 0,
	customer_display_media: '',
	media_rotation_interval: 10,
	primary_color: '#4f46e5',
};

/**
 * Composable that manages the POS session state, visual settings and product catalog.
 *
 * @param call - The Frappe API call function (injected from App.vue via provide/inject)
 */
export function useSession(call: (...args: any[]) => Promise<any>) {
	// ── State ────────────────────────────────────────────────────────
	const state = ref<POSState>({ ...DEFAULT_STATE });

	const visualSettings = ref<VisualSettings>({
		compact_mode: 0,
		show_images: 1,
		show_stock: 1,
	});

	const products = ref<Product[]>([]);
	const productSearch = ref('');
	const selectedCategory = ref('');

	// ── Computed ─────────────────────────────────────────────────────
	const hasOpenSession = computed(() => (state.value.opening_entries || []).length > 0);
	const currentOpening = computed(() => (state.value.opening_entries || [])[0] || null);
	const compactClass = computed(() => visualSettings.value.compact_mode ? 'compact' : '');
	const currency = computed(
		() =>
			currentOpening.value?.currency ||
			(window as any).frappe?.defaults?.get_default('currency') ||
			'EUR'
	);
	const showInvoicePicker = computed(() => Boolean(state.value.show_invoice_picker));

	// Persist visual settings to localStorage whenever they change
	watch(
		() => visualSettings.value,
		(next) => localStorage.setItem('enhanced_pos_visual_settings', JSON.stringify(next)),
		{ deep: true }
	);

	// ── Session loading ───────────────────────────────────────────────

	/**
	 * Loads session state from the backend, merges with localStorage overrides,
	 * and fetches the active Enhanced POS Settings config.
	 */
	const loadState = async (): Promise<void> => {
		try {
			const sessionState = await call('enhanced_pos.api.pos.get_session_state');
			state.value = { ...state.value, ...sessionState };

			// Restore persisted visual preferences
			let stored: Partial<VisualSettings> = {};
			try {
				stored = JSON.parse(localStorage.getItem('enhanced_pos_visual_settings') || '{}');
			} catch { stored = {}; }

			visualSettings.value = {
				compact_mode: Number(stored.compact_mode ?? state.value.visual_settings_defaults.compact_mode ?? 0),
				show_images: Number(stored.show_images ?? state.value.visual_settings_defaults.show_images ?? 1),
				show_stock: Number(stored.show_stock ?? state.value.visual_settings_defaults.show_stock ?? 1),
			};

			// Load Enhanced POS Settings
			const settingsName =
				localStorage.getItem(ENHANCED_POS_SETTINGS_KEY) || state.value.enhanced_pos_settings || '';

			let cfg: any = {};
			if (settingsName) {
				cfg = await call('enhanced_pos.api.pos.get_enhanced_pos_settings', { settings_name: settingsName });
			}
			if (!cfg?.name) {
				cfg = await call('enhanced_pos.api.pos.get_default_enhanced_pos_settings');
			}
			if (cfg?.name) {
				state.value.show_invoice_picker = Number(cfg.show_invoice_picker || 0);
				state.value.auto_create_delivery_note = Number(cfg.auto_create_delivery_note || 0);
				state.value.enable_quick_item_creation = Number(cfg.enable_quick_item_creation || 0);
				state.value.enable_generic_item = Number(cfg.enable_generic_item || 0);
				state.value.generic_item_code = cfg.generic_item_code || '';
				state.value.enhanced_pos_settings = cfg.name || '';
				localStorage.setItem(ENHANCED_POS_SETTINGS_KEY, cfg.name);

				if (cfg.show_images !== undefined) {
					state.value.visual_settings_defaults.show_images = Number(cfg.show_images);
					visualSettings.value.show_images = Number(stored.show_images ?? cfg.show_images);
				}

				state.value.enable_customer_display = Number(cfg.enable_customer_display || 0);
				state.value.customer_display_media = cfg.customer_display_media || '';
				state.value.media_rotation_interval = Number(cfg.media_rotation_interval ?? 10);
				state.value.primary_color = cfg.primary_color || '#4f46e5';

				if (cfg.primary_color) {
					document.documentElement.style.setProperty('--epos-primary', cfg.primary_color);
				}
			}

			PluginService.triggerOnSessionLoad(state.value);
		} catch (e) {
			console.error('[useSession] Error loading POS session state:', e);
		}
	};

	/**
	 * Fetches payment methods for a given POS profile.
	 */
	const loadProfilePayments = async (pos_profile: string): Promise<any[]> => {
		const data = await call('enhanced_pos.api.pos.get_profile_data', { pos_profile });
		return data.payments || [];
	};

	/**
	 * Fetches the product catalog, optionally filtered by search term and/or item group.
	 */
	const loadProducts = async (search_term = '', item_group = ''): Promise<void> => {
		productSearch.value = search_term;
		selectedCategory.value = item_group;
		const posProfile = currentOpening.value?.pos_profile || null;
		const result: Product[] = await call('enhanced_pos.api.pos.get_sellable_items', {
			search_term,
			limit: 60,
			pos_profile: posProfile,
			item_group,
		});
		products.value = result;
		PluginService.triggerOnProductsLoad(result);
	};

	// ── Dialog / navigation helpers ───────────────────────────────────

	/**
	 * Opens the POS opening entry dialog (Frappe native or local fallback).
	 * @param onSuccess - Callback fired after a successful opening entry.
	 * @param openLocalFallback - Called when the Frappe Dialog API is unavailable.
	 */
	const triggerStartupDialog = (
		onSuccess: () => Promise<void>,
		openLocalFallback: () => void,
	): void => {
		const frappe = (window as any).frappe;
		if (frappe?.ui?.Dialog) {
			const dialog = new frappe.ui.Dialog({
				title: __('Apertura de caja'),
				static: true,
				fields: [
					{
						fieldtype: 'Link', label: __('Company'),
						default: frappe.defaults.get_default('company'),
						options: 'Company', fieldname: 'company', reqd: 1,
					},
					{
						fieldtype: 'Link', label: __('Configuracion POS'),
						options: 'Enhanced POS Settings', fieldname: 'enhanced_pos_settings',
						default: localStorage.getItem(ENHANCED_POS_SETTINGS_KEY) || '',
						reqd: 1,
					},
					{
						fieldtype: 'Link', label: __('POS Profile'),
						options: 'POS Profile', fieldname: 'pos_profile', reqd: 1,
						get_query: () => ({
							query: 'erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query',
							filters: { company: dialog.get_value('company') },
						}),
						onchange: async () => {
							const profile = dialog.get_value('pos_profile');
							if (!profile) {
								dialog.fields_dict.balance_details.df.data = [];
								dialog.fields_dict.balance_details.grid.refresh();
								return;
							}
							const payments = await loadProfilePayments(profile);
							dialog.fields_dict.balance_details.df.data = payments.map((row: any) => ({
								mode_of_payment: row.mode_of_payment,
								opening_amount: 0,
							}));
							dialog.fields_dict.balance_details.grid.refresh();
						},
					},
					{
						fieldname: 'balance_details', fieldtype: 'Table',
						label: __('Opening Balance Details'), reqd: 1, in_place_edit: true, data: [],
						fields: [
							{ fieldname: 'mode_of_payment', fieldtype: 'Link', label: __('Mode of Payment'), options: 'Mode of Payment', in_list_view: 1, reqd: 1 },
							{ fieldname: 'opening_amount', fieldtype: 'Currency', label: __('Opening Amount'), options: 'company:company_currency', in_list_view: 1, reqd: 1 },
						],
					},
				],
				primary_action_label: __('Iniciar POS'),
				primary_action: async (values: any) => {
					if (!values.pos_profile) return frappe.msgprint(__('Selecciona un Perfil de POS valido.'));
					if (!values.company) return frappe.msgprint(__('Selecciona una compania valida.'));
					if (!values.enhanced_pos_settings) return frappe.msgprint(__('Selecciona una configuracion de POS valida.'));
					const rows = (values.balance_details || []).filter((d: any) => d.mode_of_payment);
					if (!rows.length) return frappe.msgprint(__('Debes definir al menos un metodo de pago para apertura.'));

					await call('enhanced_pos.api.pos.create_opening_entry', {
						pos_profile: values.pos_profile,
						company: values.company,
						balance_details: rows,
					});
					localStorage.setItem(ENHANCED_POS_SETTINGS_KEY, values.enhanced_pos_settings || '');
					await onSuccess();
					frappe.show_alert({ message: __('POS iniciado'), indicator: 'green' });
					dialog.hide();
				},
			});
			dialog.show();
		} else {
			openLocalFallback();
		}
	};

	/** Opens the recent orders search dialog. */
	const openRecentOrdersDialog = (): void => {
		const frappe = (window as any).frappe;
		if (!frappe?.ui?.Dialog) {
			alert('Frappe environment not detected.');
			return;
		}

		let searchRecentOrders: () => Promise<void>;
		const dialog = new frappe.ui.Dialog({
			title: __('Ordenes Recientes'),
			size: 'large',
			fields: [
				{ fieldname: 'search_term', fieldtype: 'Data', label: __('Buscar Cliente / Factura / Ticket'), onchange: () => searchRecentOrders() },
				{ fieldname: 'results_html', fieldtype: 'HTML' },
			],
			primary_action_label: __('Cerrar'),
			primary_action: () => dialog.hide(),
		});

		searchRecentOrders = async () => {
			const term = (dialog.get_value('search_term') || '').trim();
			const orders = await call('enhanced_pos.api.pos.get_recent_orders', { search_term: term, status: 'Paid', limit: 20 });
			const wrapper = dialog.fields_dict.results_html.$wrapper;
			if (!orders.length) {
				wrapper.html(`<div class="p-4 text-center text-gray-400 border border-dashed rounded-xl mt-2">${__('No se encontraron resultados.')}</div>`);
				return;
			}
			const html = orders.map((order: any) => {
				const customer = order.customer_name || order.customer || '-';
				const total = `${order.grand_total || 0} ${order.currency || ''}`.trim();
				return `
					<div class="flex justify-between items-center p-3 border border-gray-100 rounded-xl mb-2 hover:bg-gray-50">
						<div>
							<div class="font-bold text-gray-800">${order.name}</div>
							<div class="text-xs text-gray-500">${customer}</div>
						</div>
						<div class="flex gap-3 items-center">
							<strong class="text-gray-800 text-sm">${total}</strong>
							<button class="btn btn-sm btn-default epos-open-order border border-gray-300 hover:bg-gray-100 px-3 py-1 rounded-lg text-xs" data-name="${order.name}">
								${__('Abrir')}
							</button>
						</div>
					</div>`;
			}).join('');
			wrapper.html(`<div class="mt-2 max-h-[350px] overflow-y-auto">${html}</div>`);
			wrapper.find('.epos-open-order').on('click', function (this: HTMLElement) {
				const name = (window as any).$(this).data('name');
				if (!name) return;
				if (frappe?.set_route) {
					frappe.set_route('Form', state.value.invoice_type || 'POS Invoice', name);
				} else {
					const slug = (state.value.invoice_type || 'POS Invoice').toLowerCase().replace(/ /g, '-');
					window.location.href = `/app/${slug}/${name}`;
				}
				dialog.hide();
			});
		};

		dialog.show();
		searchRecentOrders();
	};

	/** Creates a closing entry and navigates to it. */
	const openClosingEntry = async (): Promise<void> => {
		if (!currentOpening.value) return;
		const closingEntry = await call('enhanced_pos.api.pos.create_closing_entry_from_opening', {
			pos_opening_entry: currentOpening.value.name,
		});
		const frappe = (window as any).frappe;
		if (frappe?.set_route) {
			frappe.set_route('Form', 'POS Closing Entry', closingEntry.name);
		} else {
			window.location.href = `/app/pos-closing-entry/${closingEntry.name}`;
		}
	};

	/** Opens a new invoice form in Frappe. */
	const openInvoiceForm = (): void => {
		const frappe = (window as any).frappe;
		if (frappe?.new_doc) {
			frappe.new_doc(state.value.invoice_type || 'POS Invoice');
		} else {
			alert('Frappe environment not detected.');
		}
	};

	/** Formats a date string using Frappe's locale format. */
	const formatUserDate = (value: string): string => {
		if (!value) return '-';
		try {
			return (window as any).frappe?.datetime?.str_to_user?.(value) ?? value;
		} catch {
			return value;
		}
	};

	// ── Internals ─────────────────────────────────────────────────────
	const SETTINGS_KEY = ENHANCED_POS_SETTINGS_KEY;

	return {
		// State
		state,
		visualSettings,
		products,
		productSearch,
		selectedCategory,
		// Computed
		hasOpenSession,
		currentOpening,
		compactClass,
		currency,
		showInvoicePicker,
		// Methods
		loadState,
		loadProfilePayments,
		loadProducts,
		triggerStartupDialog,
		openRecentOrdersDialog,
		openClosingEntry,
		openInvoiceForm,
		formatUserDate,
		SETTINGS_KEY,
	};
}

// Internal __ helper (same pattern as pos.vue)
function __(text: string, args?: any[]): string {
	return (window as any).__ ? (window as any).__(text, args) : text;
}
