<template>
	<div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 border border-gray-100">
			<h3 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
				{{ __("Otros (Producto Genérico)") }}
			</h3>

			<div class="flex flex-col gap-3">
				<!-- Description -->
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
						{{ __("Nombre o Descripción") }} <span class="text-red-500">*</span>
					</label>
					<input
						id="generic-item-description"
						type="text"
						:value="localForm.description"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
						:placeholder="__('Ej: Servicio técnico, Producto personalizado')"
						@input="localForm.description = ($event.target as HTMLInputElement).value"
					/>
				</div>

				<!-- Price -->
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
						{{ __("Precio de Venta") }} <span class="text-red-500">*</span>
					</label>
					<input
						id="generic-item-rate"
						type="number"
						step="0.01"
						:value="localForm.rate"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
						placeholder="0.00"
						@input="localForm.rate = Number(($event.target as HTMLInputElement).value)"
					/>
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
					class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
					@click="$emit('submit', { ...localForm })"
				>
					{{ __("Añadir al Carrito") }}
				</button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';

export interface GenericItemForm {
	description: string;
	rate: number | string;
}

export default defineComponent({
	name: 'GenericItemModal',
	props: {
		/** v-model: controls visibility */
		modelValue: {
			type: Boolean,
			default: false,
		},
		/** Form data (externally controlled) */
		form: {
			type: Object as () => GenericItemForm,
			default: () => ({ description: 'Otros', rate: '' }),
		},
	},
	emits: ['update:modelValue', 'submit'],
	setup(props) {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const localForm = reactive<GenericItemForm>({ ...props.form });
		watch(
			() => props.form,
			(next) => Object.assign(localForm, next),
			{ deep: true }
		);

		return { __, localForm };
	},
});
</script>
