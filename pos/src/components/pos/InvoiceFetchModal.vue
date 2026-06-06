<template>
	<div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 border border-gray-100">
			<h3 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
				{{ __("Obtener datos de Factura") }}
			</h3>

			<div>
				<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
					{{ __("Factura pendiente") }}
				</label>
				<AppLinkField
					:modelValue="selectedInvoice"
					doctype="Sales Invoice"
					:filters="{ docstatus: 1, outstanding_amount: ['>', 0] }"
					:placeholder="__('Selecciona una factura pendiente...')"
					@update:modelValue="$emit('update:selectedInvoice', $event)"
				/>
			</div>

			<div class="flex gap-2 justify-end mt-4">
				<button
					class="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
					@click="$emit('update:modelValue', false)"
				>
					{{ __("Cerrar") }}
				</button>
				<button
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
					@click="$emit('submit')"
				>
					{{ __("Cobrar Factura") }}
				</button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AppLinkField from './AppLinkField.vue';

export default defineComponent({
	name: 'InvoiceFetchModal',
	components: { AppLinkField },
	props: {
		/** v-model: controls visibility */
		modelValue: {
			type: Boolean,
			default: false,
		},
		/** The currently selected invoice name (v-model:selectedInvoice) */
		selectedInvoice: {
			type: String,
			default: '',
		},
	},
	emits: ['update:modelValue', 'update:selectedInvoice', 'submit'],
	setup() {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;
		return { __ };
	},
});
</script>
