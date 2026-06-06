<template>
	<div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 border border-gray-100">
			<h3 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
				{{ __("Crear Producto Rápido") }}
			</h3>

			<div class="flex flex-col gap-3">
				<!-- Item Code -->
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
						{{ __("Código de Producto") }} <span class="text-red-500">*</span>
					</label>
					<input
						id="quick-create-item-code"
						type="text"
						:value="localForm.item_code"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
						:placeholder="__('Ej: PROD-001')"
						@input="localForm.item_code = ($event.target as HTMLInputElement).value"
					/>
				</div>

				<!-- Item Name -->
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
						{{ __("Nombre del Producto") }} <span class="text-red-500">*</span>
					</label>
					<input
						id="quick-create-item-name"
						type="text"
						:value="localForm.item_name"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
						:placeholder="__('Ej: Coca Cola 330ml')"
						@input="localForm.item_name = ($event.target as HTMLInputElement).value"
					/>
				</div>

				<!-- Item Group -->
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
						{{ __("Categoría (Grupo de Artículo)") }} <span class="text-red-500">*</span>
					</label>
					<AppLinkField
						v-model="localForm.item_group"
						doctype="Item Group"
						:placeholder="__('Selecciona Categoría...')"
					/>
				</div>

				<!-- Prices -->
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
							{{ __("Precio Compra") }}
						</label>
						<input
							id="quick-create-buy-price"
							type="number"
							step="0.01"
							:value="localForm.valuation_rate"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
							placeholder="0.00"
							@input="localForm.valuation_rate = Number(($event.target as HTMLInputElement).value)"
						/>
					</div>
					<div>
						<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
							{{ __("Precio Venta") }} <span class="text-red-500">*</span>
						</label>
						<input
							id="quick-create-sell-price"
							type="number"
							step="0.01"
							:value="localForm.standard_rate"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
							placeholder="0.00"
							@input="localForm.standard_rate = Number(($event.target as HTMLInputElement).value)"
						/>
					</div>
				</div>
			</div>

			<div class="flex gap-2 justify-end mt-4">
				<button
					class="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
					@click="$emit('update:modelValue', false)"
				>
					{{ __("Cancelar") }}
				</button>
				<button
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
					@click="$emit('submit', { ...localForm })"
				>
					{{ __("Crear y Añadir") }}
				</button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';
import AppLinkField from './AppLinkField.vue';

export interface QuickCreateForm {
	item_code: string;
	item_name: string;
	item_group: string;
	valuation_rate: number | string;
	standard_rate: number | string;
}

export default defineComponent({
	name: 'QuickCreateModal',
	components: { AppLinkField },
	props: {
		/** v-model: controls visibility */
		modelValue: {
			type: Boolean,
			default: false,
		},
		/** Form data (externally controlled) */
		form: {
			type: Object as () => QuickCreateForm,
			default: () => ({ item_code: '', item_name: '', item_group: '', valuation_rate: '', standard_rate: '' }),
		},
	},
	emits: ['update:modelValue', 'submit'],
	setup(props) {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const localForm = reactive<QuickCreateForm>({ ...props.form });
		watch(
			() => props.form,
			(next) => Object.assign(localForm, next),
			{ deep: true }
		);

		return { __, localForm };
	},
});
</script>
