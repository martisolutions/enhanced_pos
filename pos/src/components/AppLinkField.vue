<template>
	<div ref="elRef" class="app-link-field relative w-full">
		<!-- Main Input Field -->
		<div class="relative flex items-center">
			<input
				type="text"
				v-model="searchQuery"
				@focus="onFocus"
				@input="onInput"
				@keydown="onKeyDown"
				:placeholder="placeholder || __('Select {0}...', [__(doctype)])"
				class="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
			/>
			<!-- Clear Button / Arrow Icon -->
			<button
				v-if="modelValue"
				type="button"
				@click="clearSelection"
				class="absolute right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
			>
				✕
			</button>
			<svg
				v-else
				class="absolute right-2.5 w-4 h-4 text-gray-400 pointer-events-none"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 9l-7 7-7-7"
				/>
			</svg>
		</div>

		<!-- Autocomplete Dropdown List -->
		<transition name="fade">
			<div
				v-if="showDropdown"
				class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
			>
				<div v-if="loading" class="p-3 text-xs text-gray-400 text-center">
					{{ __('Buscando...') }}
				</div>
				<div v-else-if="results.length === 0" class="p-3 text-xs text-gray-400 text-center">
					{{ __('No se encontraron resultados.') }}
				</div>
				<ul v-else class="py-1">
					<li
						v-for="(item, idx) in results"
						:key="item.value"
						:class="[
							'px-3 py-2 text-sm cursor-pointer transition flex flex-col',
							idx === highlightedIndex ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-gray-700 hover:bg-gray-50'
						]"
						@mousedown.prevent="selectResult(item)"
						@mouseenter="highlightedIndex = idx"
					>
						<span class="font-semibold">{{ item.label || item.value }}</span>
						<span v-if="item.description && item.description !== item.value" class="text-xs text-gray-400">{{ item.description }}</span>
					</li>
				</ul>

				<!-- Create New Record Action -->
				<div
					class="border-t border-gray-100 px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-gray-50/50 hover:bg-indigo-50/40 cursor-pointer flex items-center gap-1.5 transition select-none"
					@mousedown.prevent="createNewRecord"
				>
					<span class="text-sm">+</span> {{ __('Crear nuevo {0}', [__(doctype)]) }}
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onUnmounted, inject } from 'vue';

export interface LinkSearchResult {
	value: string;
	description: string;
	label?: string;
}

export default defineComponent({
	name: 'AppLinkField',
	props: {
		modelValue: {
			type: String,
			required: true
		},
		doctype: {
			type: String,
			required: true
		},
		placeholder: {
			type: String,
			default: ''
		},
		filters: {
			type: Object,
			default: () => ({})
		}
	},
	emits: ['update:modelValue', 'change'],
	setup(props, { emit }) {
		const __ = (text: string, args?: any[]) => (window as any).__ ? (window as any).__(text, args) : text;
		const call = inject('$call') as any;

		const elRef = ref<HTMLElement | null>(null);
		const searchQuery = ref('');
		const results = ref<LinkSearchResult[]>([]);
		const showDropdown = ref(false);
		const highlightedIndex = ref(-1);
		const loading = ref(false);
		let debounceTimeout: any = null;

		// Set initial value
		watch(() => props.modelValue, (newVal) => {
			if (newVal !== searchQuery.value) {
				searchQuery.value = newVal || '';
			}
		}, { immediate: true });

		const fetchResults = async () => {
			if (!showDropdown.value) return;
			loading.value = true;
			try {
				const data = await call('frappe.desk.search.search_link', {
					doctype: props.doctype,
					txt: searchQuery.value || '',
					filters: props.filters,
					page_length: 5
				});
				results.value = (data || []) as LinkSearchResult[];
				highlightedIndex.value = results.value.length > 0 ? 0 : -1;
			} catch (err) {
				console.error('Error fetching search link suggestions:', err);
				results.value = [];
			} finally {
				loading.value = false;
			}
		};

		const onInput = () => {
			showDropdown.value = true;
			clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(() => {
				fetchResults();
			}, 300);
		};

		const onFocus = () => {
			showDropdown.value = true;
			fetchResults();
		};

		const selectResult = (item: LinkSearchResult) => {
			searchQuery.value = item.value;
			emit('update:modelValue', item.value);
			emit('change', item.value);
			showDropdown.value = false;
		};

		const clearSelection = () => {
			searchQuery.value = '';
			emit('update:modelValue', '');
			emit('change', '');
			showDropdown.value = false;
		};

		const createNewRecord = () => {
			const slug = props.doctype.toLowerCase().replace(/ /g, '-');
			window.open(`/app/${slug}/new-${slug}`, '_blank');
			showDropdown.value = false;
		};

		// Document click outside listener to close dropdown
		const onDocumentClick = (e: MouseEvent) => {
			if (elRef.value && !elRef.value.contains(e.target as Node)) {
				showDropdown.value = false;
			}
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (!showDropdown.value) {
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					showDropdown.value = true;
					fetchResults();
				}
				return;
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				highlightedIndex.value = (highlightedIndex.value + 1) % results.value.length;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				highlightedIndex.value = (highlightedIndex.value - 1 + results.value.length) % results.value.length;
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (highlightedIndex.value >= 0 && highlightedIndex.value < results.value.length) {
					selectResult(results.value[highlightedIndex.value]);
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				showDropdown.value = false;
			}
		};

		onMounted(() => {
			document.addEventListener('click', onDocumentClick);
		});

		onUnmounted(() => {
			document.removeEventListener('click', onDocumentClick);
			clearTimeout(debounceTimeout);
		});

		return {
			__,
			elRef,
			searchQuery,
			results,
			showDropdown,
			highlightedIndex,
			loading,
			onFocus,
			onInput,
			onKeyDown,
			selectResult,
			clearSelection,
			createNewRecord
		};
	}
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
