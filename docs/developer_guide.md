# Developer Guide: Extending Enhanced POS with Plugins

The **Enhanced POS** custom application supports a dynamic, modular plugin framework. Other Frappe apps can inject custom logic, UI elements, visual styles, and payment methods without modifying the core `enhanced_pos` codebase.

---

## 1. Backend Asset Injection

To extend the POS, your custom Frappe app must specify its JavaScript and CSS asset paths using hooks. The POS backend queries these hooks and automatically loads your assets prior to booting the Vue 3 frontend.

Add the following to your custom app's `hooks.py` file:

```python
# your_custom_app/hooks.py

# Path to the JavaScript files containing plugin registration logic
enhanced_pos_js = [
    "/assets/your_custom_app/js/pos_plugin.js"
]

# Path to custom CSS files containing plugin stylesheets
enhanced_pos_css = [
    "/assets/your_custom_app/css/pos_plugin.css"
]
```

---

## 2. Frontend Plugin Registration

Once your assets are loaded, they will have access to the global `window.EnhancedPos` namespace. You register custom features by calling `window.EnhancedPos.registerPlugin()`.

### API Interface

A plugin object should satisfy the following TypeScript interface:

```typescript
interface PosPlugin {
    name: string;             // Unique identifier for the plugin
    label?: string;           // Optional human-readable display label
    hook: string;             // Hook target location
    component?: any;          // Optional custom Vue Component / Render Function
    class?: string;           // Optional CSS class override for buttons
    action?: (ctx: any) => void | Promise<void>; // Optional click event action
    disabled?: (ctx: any) => boolean;            // Optional disabled validator
    
    // Lifecycle Hooks
    onItemAdd?: (item: any, cart: any[]) => void;
    beforePayment?: (paymentData: any) => Promise<boolean | void> | boolean | void;
    afterPayment?: (paymentResult: any) => Promise<void> | void;
}
```

---

## 3. Extension Slots (Hooks)

### A. `header_action`
Adds action buttons or widgets inside the top bar header.

```javascript
window.EnhancedPos.registerPlugin({
    name: "print_last_receipt",
    label: "Reimprimir Ticket",
    hook: "header_action",
    class: "btn border border-gray-300 hover:bg-gray-100 text-sm font-semibold rounded-lg px-4 py-2",
    action(ctx) {
        console.log("Printing last receipt. Session info:", ctx);
        frappe.show_alert("Buscando ultima transaccion...");
    }
});
```

### B. `cart_action`
Adds buttons or controls to the bottom of the Cart card.

```javascript
window.EnhancedPos.registerPlugin({
    name: "apply_custom_discount",
    label: "Descuento 10%",
    hook: "cart_action",
    action(ctx) {
        // ctx has access to { cart, cartTotal }
        console.log("Applying 10% discount on cart:", ctx.cart);
    }
});
```

### C. `payment_method`
Registers custom payment methods (e.g., card readers, Klarna, local wallets) and loads custom UI widgets/iframes.

```javascript
window.EnhancedPos.registerPlugin({
    name: "Stripe Reader",
    label: "Cobrar con Stripe",
    hook: "payment_method",
    component: {
        template: `
            <div class="stripe-payment-widget bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                <p class="font-bold text-indigo-900 mb-2">Stripe Terminal</p>
                <p class="text-xs text-indigo-700 mb-4">Esperando aproximación de tarjeta...</p>
                <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded" @click="simulateSwipe">
                    Simular Lectura
                </button>
            </div>
        `,
        props: ['amount', 'cartTotal'],
        methods: {
            simulateSwipe() {
                frappe.show_alert({ message: "Lectura de tarjeta exitosa", indicator: "green" });
                // Emit success to let PaymentPad confirm the transaction
                this.$emit('success');
            }
        }
    }
});
```

---

## 4. Lifecycle Event Hooks

You can intercept and hook into crucial POS states:

*   `onItemAdd(item, cart)`: Triggered when a product is added. Ideal for volume-based pricing or custom taxes.
*   `beforePayment(paymentData)`: Executes asynchronously before completing a transaction. Return `false` to block checkout.
*   `afterPayment(paymentResult)`: Executed after database submission. Useful for analytical pings or sending notifications.

```javascript
window.EnhancedPos.registerPlugin({
    name: "tax_validator",
    hook: "pos_event_listener",
    
    // Check tax values before confirming payment
    async beforePayment(paymentData) {
        const confirm = await frappe.confirm("¿Confirmar cobro por " + paymentData.paid_amount + "?");
        return confirm; // If user selects No, payment is canceled
    },
    
    // Log analytical data on completion
    afterPayment(result) {
        console.log("Transacción completada:", result);
    }
});
```
