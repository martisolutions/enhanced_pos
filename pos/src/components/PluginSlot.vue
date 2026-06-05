<template>
	<!--
		PluginSlot — renders every plugin registered for a given `hook` zone.

		Usage:
		  <PluginSlot hook="catalog_panel" :ctx="posCtx" />

		Each plugin's `component` is mounted with:
		  - All props returned by `plugin.props(ctx)` (if provided)
		  - A fallback `ctx` prop with the full PosContext
	-->
	<template v-for="plugin in plugins" :key="plugin.name">
		<component
			:is="plugin.component"
			v-if="plugin.component && !isDisabled(plugin)"
			v-bind="resolveProps(plugin)"
		/>
		<!-- Action-only plugin (e.g. header_action without a component) -->
		<button
			v-else-if="!plugin.component && plugin.action"
			:class="plugin.class || 'btn btn-sm'"
			:disabled="isDisabled(plugin)"
			@click="runAction(plugin)"
		>
			{{ plugin.label || plugin.name }}
		</button>
	</template>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import type { PropType } from 'vue';
import type { PosContext } from '../types';
import PluginService from '../services/plugins';

export default defineComponent({
	name: 'PluginSlot',
	props: {
		/** The hook name to render plugins for (e.g. 'catalog_panel') */
		hook: {
			type: String,
			required: true,
		},
		/** The current PosContext — passed to every plugin component and callback */
		ctx: {
			type: Object as PropType<PosContext>,
			required: true,
		},
	},
	setup(props) {
		const plugins = computed(() => PluginService.getPluginsForHook(props.hook));

		const isDisabled = (plugin: any): boolean => {
			return typeof plugin.disabled === 'function' ? plugin.disabled(props.ctx) : false;
		};

		const resolveProps = (plugin: any): Record<string, any> => {
			const extra = typeof plugin.props === 'function' ? plugin.props(props.ctx) : {};
			return { ctx: props.ctx, ...extra };
		};

		const runAction = (plugin: any): void => {
			if (typeof plugin.action === 'function') {
				plugin.action(props.ctx);
			}
		};

		return { plugins, isDisabled, resolveProps, runAction };
	},
});
</script>
