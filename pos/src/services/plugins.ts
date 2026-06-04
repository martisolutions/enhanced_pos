import { reactive } from 'vue';

export interface PosPlugin {
	name: string;
	label?: string;
	hook: 'payment_method' | 'header_action' | 'cart_action' | 'visual_theme' | string;
	component?: any; // Vue Component to be rendered dynamically
	class?: string;
	action?: (ctx: any) => void | Promise<void>;
	disabled?: (ctx: any) => boolean;
	onItemAdd?: (item: any, cart: any[]) => void;
	beforePayment?: (paymentData: { invoice_name?: string; mode_of_payment: string; paid_amount: number }) => Promise<boolean | void> | boolean | void;
	afterPayment?: (paymentResult: any) => Promise<void> | void;
}

class PluginRegistry {
	public state = reactive<{ plugins: PosPlugin[] }>({
		plugins: []
	});

	public register(plugin: PosPlugin) {
		if (!plugin.name || !plugin.hook) {
			console.error('Plugin validation failed. Name and hook are required.', plugin);
			return;
		}
		// Avoid duplicate registration
		const exists = this.state.plugins.some(p => p.name === plugin.name);
		if (exists) {
			this.unregister(plugin.name);
		}
		this.state.plugins.push(plugin);
		console.log(`Plugin "${plugin.name}" registered successfully for hook "${plugin.hook}".`);
	}

	public unregister(name: string) {
		this.state.plugins = this.state.plugins.filter(p => p.name !== name);
	}

	public getPluginsForHook(hook: string): PosPlugin[] {
		return this.state.plugins.filter(p => p.hook === hook);
	}

	public async triggerBeforePayment(paymentData: { invoice_name?: string; mode_of_payment: string; paid_amount: number }): Promise<boolean> {
		const hooks = this.state.plugins.filter(p => p.beforePayment);
		for (const plugin of hooks) {
			try {
				if (plugin.beforePayment) {
					const result = await plugin.beforePayment(paymentData);
					if (result === false) {
						console.warn(`Payment halted by plugin: ${plugin.name}`);
						return false;
					}
				}
			} catch (err) {
				console.error(`Error in beforePayment hook for plugin ${plugin.name}:`, err);
				throw err;
			}
		}
		return true;
	}

	public async triggerAfterPayment(paymentResult: any): Promise<void> {
		const hooks = this.state.plugins.filter(p => p.afterPayment);
		for (const plugin of hooks) {
			try {
				if (plugin.afterPayment) {
					await plugin.afterPayment(paymentResult);
				}
			} catch (err) {
				console.error(`Error in afterPayment hook for plugin ${plugin.name}:`, err);
			}
		}
	}

	public triggerOnItemAdd(item: any, cart: any[]): void {
		const hooks = this.state.plugins.filter(p => p.onItemAdd);
		for (const plugin of hooks) {
			try {
				if (plugin.onItemAdd) {
					plugin.onItemAdd(item, cart);
				}
			} catch (err) {
				console.error(`Error in onItemAdd hook for plugin ${plugin.name}:`, err);
			}
		}
	}
}

const PluginService = new PluginRegistry();

// Expose globally so other Frappe apps' JS files can access it
(window as any).EnhancedPos = (window as any).EnhancedPos || {};
(window as any).EnhancedPos.PluginService = PluginService;
(window as any).EnhancedPos.registerPlugin = (plugin: PosPlugin) => PluginService.register(plugin);

export default PluginService;
