<template>
	<div class="epos-card bg-white p-4 rounded-xl border border-gray-200 shadow-sm col-span-3">
		<!-- Session active -->
		<div v-if="hasOpenSession" class="flex justify-between items-center text-sm text-gray-500">
			<div class="flex items-center gap-2">
				<span class="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
				<span class="font-semibold text-gray-700">{{ __("Apertura") }}:</span>
				<span class="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
					{{ currentOpening?.name }}
				</span>
			</div>
			<div>
				<span class="font-semibold text-gray-700">{{ __("Perfil") }}:</span>
				<span class="font-medium ml-1">{{ currentOpening?.pos_profile }}</span>
			</div>
			<div>
				<span class="font-semibold text-gray-700">{{ __("Inicio") }}:</span>
				<span class="font-medium ml-1">{{ formatDate(currentOpening?.period_start_date) }}</span>
			</div>
		</div>

		<!-- No session -->
		<div v-else class="text-center py-2 text-red-500 font-semibold flex items-center justify-center gap-2">
			<span class="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
			{{ __("No hay sesion abierta. Completa el asistente inicial.") }}
			<button
				id="epos-open-session-btn"
				class="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-xs font-semibold transition ml-3"
				@click="$emit('triggerStartup')"
			>
				{{ __("Abrir Caja") }}
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { POSOpeningEntry } from '../types';

export default defineComponent({
	name: 'SessionStatusBar',
	props: {
		hasOpenSession: {
			type: Boolean,
			required: true,
		},
		currentOpening: {
			type: Object as PropType<POSOpeningEntry | null>,
			default: null,
		},
	},
	emits: ['triggerStartup'],
	setup() {
		const __ = (text: string, args?: any[]) =>
			(window as any).__ ? (window as any).__(text, args) : text;

		const formatDate = (value?: string): string => {
			if (!value) return '-';
			try {
				return (window as any).frappe?.datetime?.str_to_user?.(value) ?? value;
			} catch {
				return value;
			}
		};

		return { __, formatDate };
	},
});
</script>
