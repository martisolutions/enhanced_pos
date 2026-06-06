import PluginService from '../../services/plugins';
import CardCheckout from './CardCheckout.vue';
import CardCustomerDisplay from './CardCustomerDisplay.vue';

PluginService.register({
	name: 'Credit Card', //name of the plugin
	label: 'Tarjeta', //label of the plugin (this get's automatically translated)
	hook: 'new_payment_method', //hook of the plugin (this determines where it shows up)
	component: CardCheckout, //component of the plugin (this is the main Vue component that renders in POS screen)
	customerComponent: CardCustomerDisplay, //customer component of the plugin (this is the Vue component that renders on the customer display)
	paymentConfig: {
		type: 'card', //type of the payment method (this is used to determine if it's a card payment)
		requiresKeypad: false, //whether the payment method requires a keypad
		showChange: false, //whether the payment method shows change
	},
});