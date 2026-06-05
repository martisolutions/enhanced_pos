# Developer Guide: Extending Enhanced POS with Plugins

The **Enhanced POS** supports a dynamic, modular plugin framework. Other Frappe apps can inject
custom logic, UI components, and lifecycle hooks **without modifying the Enhanced POS codebase**.

For a quick overview of all available hooks and types, see the [API Reference](api_reference.md).
For internal architecture details, see [Architecture](architecture.md).

---

## 1. Backend Asset Injection

Declare your JS/CSS files in your app's `hooks.py`. The POS will load them automatically on startup:

```python
# your_app/hooks.py

enhanced_pos_js = [
    "/assets/your_app/js/pos_plugin.js"
]

# Optional — additional styles
enhanced_pos_css = [
    "/assets/your_app/css/pos_plugin.css"
]
```

---

## 2. Registering a Plugin

Once your JS is loaded, use the global `window.EnhancedPos.registerPlugin()` function:

```javascript
// your_app/public/js/pos_plugin.js

window.EnhancedPos.registerPlugin({
  name: 'my-plugin',   // Unique identifier — required
  hook: 'catalog_panel', // Where to render / which event to listen to
  // ... rest of plugin definition
});
```

---

## 3. UI Hook Examples

### A. `header_action` — Add a button to the top bar

The simplest form: a button with a label and click handler.

```javascript
window.EnhancedPos.registerPlugin({
  name: 'print-last-receipt',
  label: 'Reimprimir Ticket',
  hook: 'header_action',
  class: 'btn border border-gray-300 hover:bg-gray-100 text-sm font-semibold rounded-lg px-4 py-2',
  action(ctx) {
    frappe.show_alert({ message: 'Buscando última transacción...', indicator: 'blue' });
    console.log('Cart at time of click:', ctx.cart);
  },
  disabled(ctx) {
    return !ctx.state.opening_entries.length; // Disable when no session
  },
});
```

---

### B. `catalog_panel` — Panel below the product catalog

Inject a Vue component beneath the product grid. The component receives the full `PosContext` as the `ctx` prop.

```javascript
window.EnhancedPos.registerPlugin({
  name: 'stock-summary-panel',
  hook: 'catalog_panel',
  component: {
    props: ['ctx'],
    template: `
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2">
        <p class="font-bold text-blue-900">Stock Summary</p>
        <p class="text-sm text-blue-700">{{ ctx.products.length }} products loaded</p>
        <p class="text-sm text-blue-700">Cart total: {{ ctx.currency }} {{ ctx.cartTotal.toFixed(2) }}</p>
      </div>
    `,
  },
});
```

---

### C. `cart_panel` — Panel below the cart

```javascript
window.EnhancedPos.registerPlugin({
  name: 'discount-button',
  label: 'Descuento 10%',
  hook: 'cart_panel',
  action(ctx) {
    // ctx.addToCart is a safe mutation function
    console.log('Current cart:', ctx.cart);
    frappe.show_alert('Applying discount...');
  },
});
```

---

### D. `payment_panel` — Custom payment widget

Inject a full payment integration below the standard keypad.

```javascript
window.EnhancedPos.registerPlugin({
  name: 'stripe-terminal',
  hook: 'payment_panel',
  component: {
    props: ['ctx'],
    data() { return { status: 'idle' }; },
    template: `
      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-2">
        <p class="font-bold text-indigo-900 mb-2">Stripe Terminal</p>
        <p class="text-xs text-indigo-700 mb-4">Status: {{ status }}</p>
        <button
          class="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700"
          @click="charge"
        >
          Cobrar con Tarjeta — {{ ctx.currency }} {{ ctx.cartTotal.toFixed(2) }}
        </button>
      </div>
    `,
    methods: {
      async charge() {
        this.status = 'Processing...';
        // Call your Stripe backend here
        await frappe.call({ method: 'your_app.api.charge_stripe', args: { amount: this.ctx.cartTotal } });
        this.status = 'Done ✓';
      }
    }
  },
});
```

---

### E. `modal_extra` — Plugin-owned custom modal

Your plugin controls when its modal is visible via its own state.

```javascript
const MyModal = {
  props: ['ctx'],
  data() { return { visible: false }; },
  template: `
    <div v-if="visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 class="font-bold text-lg mb-4">Mi Modal de Plugin</h3>
        <p>Total del carrito: {{ ctx.cartTotal }}</p>
        <button @click="visible = false">Cerrar</button>
      </div>
    </div>
  `,
  mounted() {
    // Expose a way to open it from outside
    window._myPluginModal = this;
  }
};

window.EnhancedPos.registerPlugin({
  name: 'my-custom-modal',
  hook: 'modal_extra',
  component: MyModal,
});

// Open the modal from a header button:
window.EnhancedPos.registerPlugin({
  name: 'open-my-modal-btn',
  label: 'Mi Modal',
  hook: 'header_action',
  action() {
    if (window._myPluginModal) window._myPluginModal.visible = true;
  },
});
```

---

## 4. Lifecycle Hook Examples

### `onItemAdd` — React to cart additions

```javascript
window.EnhancedPos.registerPlugin({
  name: 'item-tracker',
  hook: 'onItemAdd', // hook value is ignored for lifecycle-only plugins
  onItemAdd(item, cart) {
    console.log(`[Tracker] Item added: ${item.item_code}`);
    console.log(`[Tracker] Cart now has ${cart.length} lines`);
  },
});
```

### `onCartChange` — React to any cart mutation

```javascript
window.EnhancedPos.registerPlugin({
  name: 'cart-analytics',
  hook: 'lifecycle',
  onCartChange(cart) {
    const total = cart.reduce((s, r) => s + r.qty * r.rate, 0);
    console.log('[Analytics] Cart updated. New total:', total);
  },
});
```

### `beforePayment` — Validate or cancel a payment

Return `false` to block the payment. Return nothing (or `true`) to allow it.

```javascript
window.EnhancedPos.registerPlugin({
  name: 'payment-validator',
  hook: 'lifecycle',
  async beforePayment(paymentData) {
    if (paymentData.paid_amount < 1) {
      frappe.msgprint('El importe mínimo es 1€.');
      return false; // ← cancels the payment
    }
    // Ask for confirmation
    return new Promise(resolve => {
      frappe.confirm(
        `¿Confirmar cobro de ${paymentData.paid_amount}€ con ${paymentData.mode_of_payment}?`,
        () => resolve(true),
        () => resolve(false)
      );
    });
  },
});
```

### `afterPayment` — Post-payment side effects

```javascript
window.EnhancedPos.registerPlugin({
  name: 'receipt-printer',
  hook: 'lifecycle',
  async afterPayment(result) {
    console.log('[Printer] Payment confirmed:', result);
    await frappe.call({ method: 'your_app.api.print_receipt', args: { result } });
    frappe.show_alert({ message: 'Ticket impreso ✓', indicator: 'green' });
  },
});
```

### `onSessionLoad` — Initialize on POS boot

```javascript
window.EnhancedPos.registerPlugin({
  name: 'session-init',
  hook: 'lifecycle',
  onSessionLoad(state) {
    console.log('[Plugin] POS booted. Profile:', state.opening_entries[0]?.pos_profile);
  },
});
```

---

## 5. Using Dynamic Props

Use `props` (a factory function) to pass reactive data to your component:

```javascript
window.EnhancedPos.registerPlugin({
  name: 'smart-panel',
  hook: 'cart_panel',
  props(ctx) {
    return {
      itemCount: ctx.cart.length,
      total: ctx.cartTotal,
      currency: ctx.currency,
    };
  },
  component: {
    props: ['itemCount', 'total', 'currency', 'ctx'],
    template: `
      <div class="p-3 bg-gray-50 rounded-xl mt-2 text-sm text-gray-600">
        {{ itemCount }} líneas · Total: {{ currency }} {{ total.toFixed(2) }}
      </div>
    `
  }
});
```

```

---

## 6. Extending the Customer Display (Pantalla Secundaria)

The Customer Display (`/pos/customer-display`) is also fully extensible. It supports loading registered plugins and has its own designated UI slot hook for custom payment interfaces:

### UI Hook: `customer_payment_panel`
This hook renders a component inside the customer display card during checkout (when `activeScreen === 'payment'`).

```javascript
window.EnhancedPos.registerPlugin({
  name: 'klarna-customer-qr',
  hook: 'customer_payment_panel',
  component: {
    props: ['ctx'],
    data() {
      return { qrCodeUrl: null };
    },
    template: `
      <div v-if="qrCodeUrl" class="bg-white p-4 rounded-xl shadow mt-4 text-center">
        <img :src="qrCodeUrl" class="w-40 h-40 mx-auto" />
        <p class="text-xs text-slate-500 mt-2">Escanea para pagar con Klarna</p>
      </div>
    `,
    mounted() {
      // Listen to custom updates from the main POS plugin
      const bc = new BroadcastChannel('pos_customer_display');
      bc.onmessage = (event) => {
        if (event.data.type === 'KLARNA_QR_UPDATE') {
          this.qrCodeUrl = event.data.payload.qrCodeUrl;
        }
      };
    }
  }
});
```

### Broadcasting custom data from the POS main page
Plugins on the POS main page can broadcast custom events directly to the customer display via `ctx.broadcastToDisplay(type, payload)`.

```javascript
// Inside a beforePayment hook in your main POS plugin:
async beforePayment(paymentData) {
  if (paymentData.mode_of_payment === 'Klarna') {
    // 1. Initialize session on backend
    const session = await frappe.xcall('klarna_integration.api.create_session', { amount: paymentData.paid_amount });
    
    // 2. Broadcast the QR code directly to the customer display
    // (the 'klarna-customer-qr' plugin running in the customer window will intercept and show it)
    window.EnhancedPos.PluginService.getPluginsForHook('lifecycle')[0]
      .broadcastToDisplay('KLARNA_QR_UPDATE', { qrCodeUrl: session.qr_code_url });
  }
}
```

---

## 7. Testing Your Plugin

Open the POS in the browser, then run in the DevTools console:

```javascript
// Verify registration
window.EnhancedPos.PluginService.getPluginsForHook('catalog_panel');

// Register a minimal test plugin
window.EnhancedPos.registerPlugin({
  name: 'test-plugin',
  hook: 'catalog_panel',
  component: {
    template: '<div style="background:red;color:white;padding:8px;border-radius:8px">🔌 Plugin OK</div>'
  }
});

// Unregister it
window.EnhancedPos.PluginService.unregister('test-plugin');
```
