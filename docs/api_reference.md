# API Reference: Enhanced POS Plugin System

This is the complete public API available to external plugins via `window.EnhancedPos`.

---

## `window.EnhancedPos`

The global namespace exposed by Enhanced POS. Available after the POS Vue app boots.

```typescript
window.EnhancedPos = {
  registerPlugin(plugin: PosPlugin): void,
  PluginService: PluginRegistry,
}
```

---

## `registerPlugin(plugin)`

Registers a plugin into the Enhanced POS system.

```javascript
window.EnhancedPos.registerPlugin(plugin);
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plugin` | `PosPlugin` | ✅ | Plugin definition object (see below) |

> **Note**: If a plugin with the same `name` is already registered, it will be **replaced**.

---

## `PosPlugin` Interface

```typescript
interface PosPlugin {
  // ── Required ─────────────────────────────────────────────────────
  name: string;     // Unique identifier
  hook: string;     // Target hook (UI zone or lifecycle event)

  // ── UI extension (for UIHooks) ───────────────────────────────────
  label?: string;                               // Display label for action buttons
  component?: object;                           // Vue component to render
  props?: (ctx: PosContext) => Record<string, any>; // Dynamic props factory
  class?: string;                               // CSS classes for action button
  action?: (ctx: PosContext) => void;           // Click handler (no component)
  disabled?: (ctx: PosContext) => boolean;      // Disable condition

  // ── Lifecycle callbacks ──────────────────────────────────────────
  onSessionLoad?: (state: POSState) => void;
  onProductsLoad?: (products: Product[]) => void;
  onCartChange?: (cart: CartItem[]) => void;
  onItemAdd?: (item: any, cart: CartItem[]) => void;
  beforePayment?: (data: PaymentData) => Promise<boolean | void> | boolean | void;
  afterPayment?: (result: any) => Promise<void> | void;
}
```

---

## UI Hooks (zones where components render)

| Hook | Where it renders |
|------|-----------------|
| `sale_screen_top` | Above the entire sale screen (catalog + cart) |
| `catalog_panel` | Below the product catalog grid |
| `cart_panel` | Below the cart summary |
| `payment_panel` | Below the payment keypad |
| `header_action` | As a button in the top navigation bar |
| `modal_extra` | A plugin-owned modal (plugin controls its visibility) |

---

## Lifecycle Hooks (event callbacks, no UI)

| Hook | When it fires | Arguments |
|------|--------------|-----------|
| `onSessionLoad` | After POS session state is loaded | `(state: POSState)` |
| `onProductsLoad` | After product catalog is fetched | `(products: Product[])` |
| `onCartChange` | After any cart mutation | `(cart: CartItem[])` |
| `onItemAdd` | When an item is added to the cart | `(item, cart: CartItem[])` |
| `beforePayment` | Before confirming payment | `(data: PaymentData)` → return `false` to cancel |
| `afterPayment` | After payment is confirmed | `(result: any)` |

---

## `PosContext` Object

Passed to every plugin component (as the `ctx` prop) and to `action`, `disabled`, `props` callbacks.

```typescript
interface PosContext {
  state: Readonly<POSState>;       // Current session state
  cart: Readonly<CartItem[]>;      // Current cart items
  products: Readonly<Product[]>;   // Current product catalog
  cartTotal: number;               // Computed sum of cart
  currency: string;                // Active currency (e.g. "EUR")
  addToCart(item: Partial<Product> & { item_code: string }): void;
  loadProducts(search?: string, group?: string): Promise<void>;
}
```

> ⚠️ `state`, `cart`, and `products` are **read-only snapshots**. Do not attempt to mutate them directly. Use `addToCart()` and `loadProducts()` for safe interactions.

---

## `POSState` Object

```typescript
interface POSState {
  opening_entries: POSOpeningEntry[];  // Active POS opening entries
  invoice_type: string;                // "POS Invoice" or "Sales Invoice"
  show_invoice_picker: number;         // 1 = show invoice picker in header
  auto_create_delivery_note: number;   // 1 = auto-create DN on payment
  enhanced_pos_settings: string;       // Name of active settings doc
  user: string;                        // Current logged-in user
  enable_quick_item_creation: number;  // 1 = show quick create button
  enable_generic_item: number;         // 1 = show "Otros" generic item
  generic_item_code: string;           // Item code for the generic item
}
```

---

## `PaymentData` Object

Passed to `beforePayment` callback.

```typescript
interface PaymentData {
  invoice_name?: string;   // Set when paying a fetched invoice
  mode_of_payment: string; // Payment method name
  paid_amount: number;     // Amount entered by the cashier
}
```

---

## `PluginService` Methods

Advanced access via `window.EnhancedPos.PluginService`:

```typescript
PluginService.register(plugin: PosPlugin): void
PluginService.unregister(name: string): void
PluginService.getPluginsForHook(hook: string): PosPlugin[]
```

---

## Backend Asset Injection

To load your plugin JS automatically when the POS opens, add to your app's `hooks.py`:

```python
# your_app/hooks.py

# JavaScript files to load inside the POS
enhanced_pos_js = [
    "/assets/your_app/js/pos_plugin.js"
]

# Optional CSS
enhanced_pos_css = [
    "/assets/your_app/css/pos_plugin.css"
]
```
