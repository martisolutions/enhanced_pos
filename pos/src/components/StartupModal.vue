<template>
	<div v-if="modelValue" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 border border-gray-100">
			<h3 class="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
				{{ __("Apertura de Caja (Fallback Local)") }}
			</h3>

			<div class="flex flex-col gap-3">
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">{{ __("Company") }}</label>
					<AppLinkField v-model="localForm.company" doctype="Company" />
				</div>
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">{{ __("POS Profile") }}</label>
					<AppLinkField
						v-model="localForm.pos_profile"
						doctype="POS Profile"
						:filters="{ company: localForm.company }"
					/>
				</div>
				<div>
					<label class="block text-xs font-semibold text-gray-500 uppercase mb-1">{{ __("Configuracion POS") }}</label>
					<AppLinkField v-model="localForm.enhanced_pos_settings" doctype="Enhanced POS Settings" />
				</div>
			</div>
			
			<div class="flex gap-2 justify-end mt-4">
				<button
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
					@click="$emit('submit', localForm)"
				>
					{{ __("Iniciar POS") }}
				</button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';
import AppLinkField from './AppLinkField.vue';

export default defineComponent({
	name: 'StartupModal',
	components: { AppLinkField },
	props: {
		/** v-model: controls visibility */
		modelValue: {
			type: Boolean,
			default: false,
		},
		/** Initial form values */
		form: {
			type: Object,
			default: () => ({ company: '', pos_profile: '', enhanced_pos_settings: '' }),
		},
	},
	emits: ['update:modelValue', 'submit'],
	setup(props) {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		// Keep a local copy of the form so we don't mutate the prop directly
		const localForm = reactive({ ...props.form });
		watch(
			() => props.form,
			(next) => Object.assign(localForm, next),
			{ deep: true }
		);

		return { __, localForm };
	},
});
</script>
