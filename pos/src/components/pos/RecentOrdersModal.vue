<template>
	<div v-if="modelValue" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in-backdrop">
		<!-- Main Modal Card -->
		<div class="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-3xl w-full flex flex-col overflow-hidden animate-scale-in max-h-[85vh]">
			
			<!-- Header -->
			<div class="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
						</svg>
					</div>
					<div>
						<h3 class="font-black text-slate-800 text-lg tracking-tight">
							{{ __("Ordenes Recientes") }}
						</h3>
						<p class="text-xs text-slate-400 font-medium">
							{{ __("Busca y gestiona transacciones y facturas") }}
						</p>
					</div>
				</div>
				<button
					class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100/50 transition"
					@click="$emit('update:modelValue', false)"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Search & Filter Controls -->
			<div class="p-6 bg-slate-50/30 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
				<!-- Search Input -->
				<div class="flex-grow relative">
					<span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</span>
					<input
						type="text"
						v-model="searchTerm"
						:placeholder="__('Buscar por factura o nombre del cliente...')"
						class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
						@keyup.enter="triggerSearch"
					/>
				</div>

				<!-- Status Filter -->
				<div class="sm:w-48 shrink-0">
					<select
						v-model="selectedStatus"
						class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
					>
						<option value="Paid">{{ __("Cobrado") }}</option>
						<option value="Partly Paid">{{ __("Pendiente") }}</option>
						<option value="Draft">{{ __("Borrador") }}</option>
						<option value="Return">{{ __("Devolución") }}</option>
					</select>
				</div>
			</div>

			<!-- Results Body -->
			<div class="flex-grow overflow-y-auto min-h-[300px] max-h-[50vh] p-6 relative">
				<!-- Loading state -->
				<div v-if="loading" class="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
					<div class="flex flex-col items-center gap-3">
						<div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
						<span class="text-sm font-semibold text-slate-500">{{ __("Buscando órdenes...") }}</span>
					</div>
				</div>

				<!-- Empty state -->
				<div v-if="!orders.length && !loading" class="flex flex-col items-center justify-center py-16 text-center">
					<div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4" />
						</svg>
					</div>
					<h4 class="font-bold text-slate-700 text-sm">{{ __("No se encontraron órdenes") }}</h4>
					<p class="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
						{{ __("Intente cambiar los términos de búsqueda o filtros de estado.") }}
					</p>
				</div>

				<!-- Orders list -->
				<div v-else class="overflow-x-auto">
					<table class="w-full text-left text-sm border-collapse">
						<thead>
							<tr class="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
								<th class="pb-3 pr-4">{{ __("Factura") }}</th>
								<th class="pb-3 px-4">{{ __("Cliente") }}</th>
								<th class="pb-3 px-4">{{ __("Fecha / Hora") }}</th>
								<th class="pb-3 pl-4 text-right">{{ __("Total") }}</th>
								<th class="pb-3 pl-6"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							<tr
								v-for="order in orders"
								:key="order.name"
								class="hover:bg-slate-50/50 transition group"
							>
								<!-- Invoice reference -->
								<td class="py-3.5 pr-4 font-mono font-bold text-slate-800">
									{{ order.name }}
									<span class="block text-[10px] text-slate-400 font-sans tracking-wide uppercase font-semibold mt-0.5">
										{{ order.doctype }}
									</span>
								</td>
								<!-- Customer name -->
								<td class="py-3.5 px-4 text-slate-600 font-medium">
									{{ order.customer_name || order.customer }}
								</td>
								<!-- Date and Time -->
								<td class="py-3.5 px-4 text-slate-500 text-xs">
									<div>{{ formatDate(order.posting_date) }}</div>
									<div class="text-[10px] text-slate-400 mt-0.5">{{ order.posting_time }}</div>
								</td>
								<!-- Total amount -->
								<td class="py-3.5 pl-4 text-right font-mono font-bold text-slate-700">
									{{ fmtMoney(order.grand_total, order.currency) }}
								</td>
								<!-- Action button -->
								<td class="py-3.5 pl-6 text-right">
									<button
										class="opacity-0 group-hover:opacity-100 btn bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-600 font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer select-none active:scale-95 flex items-center gap-1.5 ml-auto"
										@click="selectOrder(order)"
									>
										{{ __("Cargar") }}
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
										</svg>
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- Footer with Pagination -->
			<div class="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
				<!-- Pagination Controls -->
				<div class="flex items-center gap-2">
					<button
						:disabled="page === 1"
						class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-sm"
						@click="prevPage"
					>
						← {{ __("Anterior") }}
					</button>
					<span class="text-xs text-slate-500 font-semibold select-none px-1">
						{{ __("Página") }} {{ page }}
					</span>
					<button
						:disabled="!hasNextPage"
						class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-sm"
						@click="nextPage"
					>
						{{ __("Siguiente") }} →
					</button>
				</div>

				<button
					class="btn bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-6 rounded-xl transition cursor-pointer select-none active:scale-95 shadow-sm text-sm"
					@click="$emit('update:modelValue', false)"
				>
					{{ __("Cerrar") }}
				</button>
			</div>

		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue';

export default defineComponent({
	name: 'RecentOrdersModal',
	props: {
		modelValue: {
			type: Boolean,
			default: false,
		},
		currency: {
			type: String,
			default: 'EUR',
		},
		call: {
			type: Function,
			required: true,
		},
	},
	emits: ['update:modelValue', 'selectOrder'],
	setup(props, { emit }) {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const searchTerm = ref('');
		const selectedStatus = ref('Paid');
		const orders = ref<any[]>([]);
		const loading = ref(false);

		// Pagination state
		const page = ref(1);
		const hasNextPage = ref(false);

		const triggerSearch = async () => {
			loading.value = true;
			try {
				const res = await props.call('enhanced_pos.api.pos.get_recent_orders', {
					search_term: searchTerm.value,
					status: selectedStatus.value,
					page: page.value,
					limit: 20,
				});
				if (res && res.length > 20) {
					hasNextPage.value = true;
					orders.value = res.slice(0, 20);
				} else {
					hasNextPage.value = false;
					orders.value = res || [];
				}
			} catch (e) {
				console.error("Error fetching recent orders:", e);
			} finally {
				loading.value = false;
			}
		};

		const selectOrder = (order: any) => {
			emit('selectOrder', order);
			emit('update:modelValue', false);
		};

		const prevPage = () => {
			if (page.value > 1) {
				page.value--;
				triggerSearch();
			}
		};

		const nextPage = () => {
			if (hasNextPage.value) {
				page.value++;
				triggerSearch();
			}
		};

		const formatDate = (dateStr: string) => {
			if (!dateStr) return '';
			try {
				const frappe = (window as any).frappe;
				if (frappe?.datetime?.str_to_user) {
					return frappe.datetime.str_to_user(dateStr);
				}
				return dateStr;
			} catch {
				return dateStr;
			}
		};

		const fmtMoney = (value: number, curr?: string) => {
			const c = curr || props.currency;
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), c);
			}
			return `${Number(value || 0).toFixed(2)} ${c}`;
		};

		// Fetch initially when open
		watch(() => props.modelValue, (isOpen) => {
			if (isOpen) {
				searchTerm.value = '';
				page.value = 1;
				triggerSearch();
			}
		});

		// Fetch reactively when status changes
		watch(selectedStatus, () => {
			page.value = 1;
			triggerSearch();
		});

		// Debounce reactive typing search
		let debounceTimer: any = null;
		watch(searchTerm, () => {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				page.value = 1;
				triggerSearch();
			}, 350);
		});

		onMounted(() => {
			if (props.modelValue) {
				triggerSearch();
			}
		});

		return {
			__,
			searchTerm,
			selectedStatus,
			orders,
			loading,
			page,
			hasNextPage,
			prevPage,
			nextPage,
			triggerSearch,
			selectOrder,
			formatDate,
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
</style>
