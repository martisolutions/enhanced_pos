import PluginService from '../../services/plugins';
import CashCheckout from './CashCheckout.vue';
import CashCustomerDisplay from './CashCustomerDisplay.vue';

PluginService.register({
	name: 'Cash',
	label: 'Efectivo',
	hook: 'new_payment_method',
	component: CashCheckout,
	customerComponent: CashCustomerDisplay,
	paymentConfig: {
		type: 'cash',
		requiresKeypad: true,
		showChange: true,
		validateExactAmount: true,
	},
});
