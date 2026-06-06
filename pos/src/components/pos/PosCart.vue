<template>
	<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
		<h4 class="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">
			{{ __('Carrito') }}
		</h4>

		<div v-if="cart.length" class="epos-cart-list flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
			<div v-for="group in cartGroups" :key="group.reference ? group.reference.item_code : group.row.item_code">
				<!-- Invoice Reference Box -->
				<div v-if="group.type === 'invoice'" class="epos-invoice-reference-box bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex flex-col gap-2">
					<div class="epos-cart-name font-semibold text-sm text-indigo-900 flex justify-between items-center">
						<span>{{ group.reference.item_name }}</span>
						<button
							v-if="!readOnly"
							class="text-red-500 hover:text-red-700 text-xs font-medium"
							@click="$emit('removeInvoiceReference', group.reference)"
						>
							{{ __('Quitar') }}
						</button>
					</div>
					<div class="epos-invoice-children pl-3 border-l-2 border-indigo-200 flex flex-col gap-1.5">
						<div
							v-for="row in group.children"
							:key="row.item_code"
							class="epos-invoice-child-row bg-white border border-gray-100 p-2 rounded-lg text-xs flex justify-between items-center"
						>
							<div class="epos-cart-name font-medium text-gray-700 max-w-[60%] truncate">
								{{ row.item_name }}
							</div>
							<div class="text-gray-500 text-right">
								{{ row.qty }} × {{ fmtMoney(row.rate) }}
							</div>
						</div>
					</div>
				</div>

				<!-- Standard Cart Row -->
				<div v-else class="epos-cart-row border border-gray-100 p-2.5 rounded-xl flex items-center justify-between gap-2 bg-gray-50/30">
					<div class="flex flex-col min-w-0 flex-1">
						<div class="epos-cart-name font-semibold text-sm text-gray-800 truncate">
							{{ group.row.item_name }}
						</div>
						<div class="text-xs text-gray-400">
							{{ fmtMoney(group.row.rate) }}
						</div>
					</div>

					<div class="flex items-center gap-2">
						<template v-if="!readOnly">
							<button
								class="w-7 h-7 flex items-center justify-center border border-gray-200 hover:bg-gray-100 active:bg-gray-200 text-gray-600 rounded-lg transition font-bold"
								@click="$emit('decreaseQty', group.row)"
							>
								−
							</button>
							<span class="font-bold text-sm text-gray-800 min-w-[20px] text-center">
								{{ group.row.qty }}
							</span>
							<button
								class="w-7 h-7 flex items-center justify-center border border-gray-200 hover:bg-gray-100 active:bg-gray-200 text-gray-600 rounded-lg transition font-bold"
								@click="$emit('increaseQty', group.row)"
							>
								+
							</button>
						</template>
						<span v-else class="font-bold text-sm text-gray-800">
							{{ group.row.qty }} × {{ fmtMoney(group.row.rate) }}
						</span>
					</div>
				</div>
			</div>
		</div>
		<div v-else class="epos-empty text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400">
			{{ __('Aun no hay productos en el carrito.') }}
		</div>

		<div class="epos-cart-total border-t border-gray-100 pt-3 flex justify-between items-center text-lg font-bold text-gray-800">
			<span>{{ __('Total') }}</span>
			<span class="text-indigo-600">{{ fmtMoney(cartTotal) }}</span>
		</div>

		<div v-if="!readOnly" class="mt-2 flex flex-col gap-2">
			<button
				class="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition w-full shadow-sm shadow-indigo-100"
				:disabled="!cart.length"
				@click="$emit('goToPaymentScreen')"
			>
				{{ __('Siguiente') }}
			</button>

			<!-- Plugins extension slot in Cart Actions -->
			<template v-for="plugin in cartPlugins" :key="plugin.name">
				<component
					v-if="plugin.component"
					:is="plugin.component"
					:ctx="ctx"
				/>
				<button
					v-else
					:class="plugin.class || 'btn btn-default border border-gray-200 text-gray-600 py-2 rounded-xl transition font-semibold w-full text-sm'"
					:disabled="plugin.disabled ? plugin.disabled(ctx) : !cart.length"
					@click="plugin.action ? plugin.action(ctx) : null"
				>
					{{ __(plugin.label || plugin.name) }}
				</button>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import type { CartItem, CartGroup, PosContext } from '../../types';
import PluginService from '../../services/plugins';

export default defineComponent({
	name: 'PosCart',
	props: {
		cart: {
			type: Array as () => CartItem[],
			required: true
		},
		cartGroups: {
			type: Array as () => CartGroup[],
			required: true
		},
		cartTotal: {
			type: Number,
			required: true
		},
		currency: {
			type: String,
			required: true
		},
		readOnly: {
			type: Boolean,
			default: false
		},
		ctx: {
			type: Object as () => PosContext,
			required: true
		}
	},
	emits: ['increaseQty', 'decreaseQty', 'removeInvoiceReference', 'goToPaymentScreen'],
	setup(props) {
		const __ = (text: string) => (window as any).__ ? (window as any).__(text) : text;

		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), props.currency);
			}
			return `${Number(value || 0).toFixed(2)} ${props.currency}`;
		};

		const cartPlugins = computed(() => {
			return PluginService.getPluginsForHook('cart_action');
		});

		return {
			__,
			fmtMoney,
			cartPlugins
		};
	}
});
</script>
