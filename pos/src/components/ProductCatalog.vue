<template>
	<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
		<div class="epos-search flex flex-col sm:flex-row gap-2 items-stretch">
			<div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
				<!-- Category Autocomplete Selector -->
				<AppLinkField
					v-model="selectedCategory"
					doctype="Item Group"
					:placeholder="__('Filtrar por categoría')"
					@change="onSearch"
				/>
				<div class="relative flex items-center">
					<input
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
						v-model="searchQuery"
						@input="onInput"
						@keyup.enter="onSearch"
						:placeholder="__('Buscar producto (código, nombre)...')"
					/>
				</div>
			</div>
			<div class="flex gap-2 shrink-0">
				<!-- Refresh Button -->
				<button
					class="btn btn-default border border-gray-300 hover:bg-gray-50 text-gray-700 p-2 rounded-lg transition flex items-center justify-center"
					@click="onRefresh"
					:title="__('Actualizar catálogo')"
				>
					<img src="/refresh.png" width="20" height="20"/>
				</button>
			</div>
		</div>

		<div v-if="products.length || enableQuickCreate || enableGenericItem" class="epos-products-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
			<!-- Quick Create Product Card -->
			<div
				v-if="enableQuickCreate"
				class="epos-product-card border border-dashed border-indigo-200 bg-indigo-50/10 hover:bg-indigo-50/30 hover:shadow-md rounded-xl p-3 flex flex-col gap-2 transition cursor-pointer justify-center items-center text-center min-h-[160px]"
				@click="$emit('quick-create')"
			>
				<div class="w-10 h-10 rounded-full bg-indigo-100/60 flex items-center justify-center text-indigo-600 mb-1">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
					</svg>
				</div>
				<div class="font-bold text-xs text-indigo-900 leading-tight">
					{{ __('Crear Producto') }}
				</div>
				<div class="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">
					{{ __('Rápido') }}
				</div>
			</div>

			<!-- Generic "Otros" Item Card -->
			<div
				v-if="enableGenericItem"
				class="epos-product-card border border-dashed border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/30 hover:shadow-md rounded-xl p-3 flex flex-col gap-2 transition cursor-pointer justify-center items-center text-center min-h-[160px]"
				@click="$emit('generic-item')"
			>
				<div class="w-10 h-10 rounded-full bg-emerald-100/60 flex items-center justify-center text-emerald-600 mb-1">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
					</svg>
				</div>
				<div class="font-bold text-xs text-emerald-900 leading-tight">
					{{ __('Otros') }}
				</div>
				<div class="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
					{{ __('Precio Libre') }}
				</div>
			</div>

			<!-- Standard Products -->
			<div
				v-for="product in products"
				:key="product.item_code"
				class="epos-product-card border border-gray-100 hover:border-indigo-100 bg-white hover:shadow-md rounded-xl p-3 flex flex-col gap-2 transition cursor-pointer"
				@click="$emit('addToCart', product)"
			>
				<!-- Optional Product Image -->
				<div v-if="showImages" class="epos-product-image-wrap max-w-[150px] w-full aspect-square mx-auto bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-50">
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
					@click.stop="$emit('addToCart', product)"
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
import { defineComponent, ref, watch, onUnmounted } from 'vue';
import type { Product } from '../types';
import AppLinkField from './AppLinkField.vue';
import { __ } from '../utils/i18n';

export default defineComponent({
	name: 'ProductCatalog',
	components: {
		AppLinkField
	},
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
		},
		enableQuickCreate: {
			type: Boolean,
			default: false
		},
		enableGenericItem: {
			type: Boolean,
			default: false
		}
	},
	emits: ['search', 'addToCart', 'quick-create', 'generic-item'],
	setup(props, { emit }) {
		const searchQuery = ref('');
		const selectedCategory = ref('');
		let debounceTimeout: any = null;

		const onSearch = () => {
			clearTimeout(debounceTimeout);
			emit('search', searchQuery.value, selectedCategory.value);
		};

		const onInput = () => {
			clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(() => {
				onSearch();
			}, 200);
		};

		const onRefresh = () => {
			onSearch();
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
				selectedCategory.value = '';
			}
		});

		onUnmounted(() => {
			clearTimeout(debounceTimeout);
		});

		return {
			__,
			searchQuery,
			selectedCategory,
			onSearch,
			onInput,
			onRefresh,
			fmtMoney
		};
	}
});
</script>
