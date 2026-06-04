<template>
	<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
		<div class="epos-search flex gap-2">
			<input
				class="form-control flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				v-model="searchQuery"
				@keyup.enter="onSearch"
				:placeholder="__('Buscar producto')"
			/>
			<button
				class="btn btn-default border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
				@click="onSearch"
			>
				{{ __('Buscar') }}
			</button>
		</div>

		<div v-if="products.length" class="epos-products-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
			<div
				v-for="product in products"
				:key="product.item_code"
				class="epos-product-card border border-gray-100 hover:border-indigo-100 bg-white hover:shadow-md rounded-xl p-3 flex flex-col gap-2 transition"
			>
				<!-- Optional Product Image -->
				<div v-if="showImages" class="epos-product-image-wrap w-full h-24 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-50">
					<img
						v-if="product.image"
						:src="product.image"
						:alt="product.item_name"
						class="w-full h-full object-cover"
					/>
					<svg
						v-else
						class="w-8 h-8 text-gray-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</div>

				<div class="epos-product-name font-semibold text-sm text-gray-800 line-clamp-2 leading-tight">
					{{ product.item_name || product.item_code }}
				</div>
				<div class="epos-product-meta text-xs text-gray-400 font-mono">
					{{ product.item_code }}
				</div>
				<div class="epos-product-price font-bold text-sm text-indigo-600 mt-auto pt-1">
					{{ fmtMoney(product.rate) }}
				</div>
				<button
					class="btn btn-sm btn-primary bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1.5 rounded-md font-medium transition w-full mt-1"
					@click="$emit('addToCart', product)"
				>
					{{ __('Agregar') }}
				</button>
			</div>
		</div>
		<div v-else class="epos-empty text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400">
			{{ __('No hay productos para mostrar.') }}
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import type { Product } from '../types';

export default defineComponent({
	name: 'ProductCatalog',
	props: {
		products: {
			type: Array as () => Product[],
			required: true
		},
		showImages: {
			type: Boolean,
			default: true
		},
		currency: {
			type: String,
			required: true
		}
	},
	emits: ['search', 'addToCart'],
	setup(props, { emit }) {
		const __ = (text: string) => (window as any).__ ? (window as any).__(text) : text;
		const searchQuery = ref('');

		const onSearch = () => {
			emit('search', searchQuery.value);
		};

		const fmtMoney = (value: number) => {
			if ((window as any).format_currency) {
				return (window as any).format_currency(Number(value || 0), props.currency);
			}
			return `${Number(value || 0).toFixed(2)} ${props.currency}`;
		};

		// Reset search input if products list is emptied externally
		watch(() => props.products, (newVal) => {
			if (newVal.length === 0) {
				searchQuery.value = '';
			}
		});

		return {
			__,
			searchQuery,
			onSearch,
			fmtMoney
		};
	}
});
</script>
