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

			<!-- Customer Display Activation Indicator/Button -->
			<div v-if="enableCustomerDisplay" class="relative">
				<button
					class="btn border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
					@click="toggleDropdown"
				>
					<span :class="['w-2.5 h-2.5 rounded-full inline-block', customerDisplayConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400']"></span>
					{{ customerDisplayConnected ? __("Pantalla Cliente (Activa)") : __("Activar Pantalla Cliente") }}
				</button>

				<!-- Screen Selector Dropdown -->
				<div v-if="showScreenDropdown" class="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2 text-sm text-gray-700">
					<p class="font-bold text-gray-800 px-2 py-1 border-b border-gray-100 mb-1">
						{{ __("Seleccionar Monitor") }}
					</p>
					
					<div v-if="availableScreens.length" class="flex flex-col gap-1 max-h-48 overflow-y-auto">
						<button
							v-for="(screen, idx) in availableScreens"
							:key="idx"
							class="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-xs transition"
							@click="selectScreen(screen)"
						>
							<span>🖥️ {{ screen.label || `Monitor ${idx + 1}` }}</span>
							<span v-if="screen.isCurrent" class="text-[10px] text-gray-400">({{ __("Actual") }})</span>
						</button>
					</div>
					
					<p v-else class="text-xs text-gray-400 px-2 py-2 italic text-center">
						{{ __("No se detectaron monitores secundarios.") }}
					</p>
					
					<!-- Fallback option/Direct Launch -->
					<button
						class="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded-lg text-xs font-semibold text-primary transition mt-1 border-t border-gray-100 pt-2"
						@click="launchFallback"
					>
						🚀 {{ __("Lanzar en pestaña nueva") }}
					</button>
				</div>
			</div>

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
import { defineComponent, computed, ref } from 'vue';
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
		},
		enableCustomerDisplay: {
			type: Boolean,
			default: false
		},
		customerDisplayConnected: {
			type: Boolean,
			default: false
		}
	},
	emits: ['openInvoiceForm', 'openInvoiceFetchDialog', 'openRecentOrdersDialog', 'openClosingEntry', 'activateCustomerDisplay'],
	setup(_, { emit }) {
		const headerPlugins = computed(() => {
			return PluginService.getPluginsForHook('header_action');
		});

		const showScreenDropdown = ref(false);
		const availableScreens = ref<any[]>([]);

		const toggleDropdown = async () => {
			if (showScreenDropdown.value) {
				showScreenDropdown.value = false;
				return;
			}
			try {
				if ('getScreenDetails' in window) {
					const screenDetails = await (window as any).getScreenDetails();
					availableScreens.value = screenDetails.screens.map((s: any) => ({
						label: s.label || `${s.width}x${s.height}`,
						left: s.availLeft,
						top: s.availTop,
						width: s.availWidth,
						height: s.availHeight,
						isCurrent: s === screenDetails.currentScreen
					}));
				} else {
					availableScreens.value = [];
				}
			} catch (err) {
				console.error("Window Management API error:", err);
				availableScreens.value = [];
			}
			showScreenDropdown.value = true;
		};

		const selectScreen = (screen: any) => {
			emit('activateCustomerDisplay', screen);
			showScreenDropdown.value = false;
		};

		const launchFallback = () => {
			emit('activateCustomerDisplay', null);
			showScreenDropdown.value = false;
		};

		return {
			__,
			headerPlugins,
			showScreenDropdown,
			availableScreens,
			toggleDropdown,
			selectScreen,
			launchFallback
		};
	}
});
</script>
