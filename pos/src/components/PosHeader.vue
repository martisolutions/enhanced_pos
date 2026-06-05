<template>
	<div class="epos-header bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex justify-between items-center">
		<div class="flex flex-col items-center justify-center">
			<div class="epos-meta text-gray-500 text-sm">
				<h3 class="font-semibold text-lg text-gray-800">
					{{ __("Usuario") }}: <span class="text-indigo-600">{{ user }}</span>
				</h3>
			</div>
		</div>
		<div class="epos-header-actions flex gap-2 items-center">
			<button
				class="btn btn-default border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
				v-if="showInvoicePicker && hasOpenSession"
				@click="$emit('openInvoiceFetchDialog')"
			>
				{{ __("Obtener datos de Factura") }}
			</button>
			<button
				class="btn btn-default border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
				:disabled="!hasOpenSession"
				@click="$emit('openRecentOrdersDialog')"
			>
				{{ __("Ordenes Recientes") }}
			</button>
			<button
				class="btn btn-default border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
				:disabled="!hasOpenSession"
				@click="$emit('openClosingEntry')"
			>
				{{ __("Cerrar Caja") }}
			</button>

			<!-- Plugin Extension Hook for Header Actions -->
			<template v-for="plugin in headerPlugins" :key="plugin.name">
				<!-- Custom component rendering -->
				<component
					v-if="plugin.component"
					:is="plugin.component"
					:has-open-session="hasOpenSession"
					:user="user"
				/>
				<!-- Simple button rendering -->
				<button
					v-else
					:class="plugin.class || 'btn btn-default border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition'"
					:disabled="plugin.disabled ? (plugin.disabled as any)({ hasOpenSession, user }) : !hasOpenSession"
					@click="plugin.action ? (plugin.action as any)({ hasOpenSession, user }) : null"
				>
					{{ __(plugin.label || plugin.name) }}
				</button>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import PluginService from '../services/plugins';
import { __ } from '../utils/i18n';

export default defineComponent({
	name: 'PosHeader',
	props: {
		user: {
			type: String,
			required: true
		},
		hasOpenSession: {
			type: Boolean,
			required: true
		},
		showInvoicePicker: {
			type: Boolean,
			required: true
		}
	},
	emits: ['openInvoiceForm', 'openInvoiceFetchDialog', 'openRecentOrdersDialog', 'openClosingEntry'],
	setup() {
		const headerPlugins = computed(() => {
			return PluginService.getPluginsForHook('header_action');
		});

		return {
			__,
			headerPlugins
		};
	}
});
</script>
