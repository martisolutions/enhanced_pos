# Architecture: Enhanced POS

This document describes the internal architecture of the Enhanced POS Vue 3 frontend.

---

## Component Tree

```
Home.vue  (orchestrator)
│
├── PosHeader.vue            — Top navigation bar
│   └── [PluginSlot: header_action]  — Extra buttons from plugins
│
├── SessionStatusBar.vue     — Green/red session indicator
│
├── [PluginSlot: sale_screen_top]    — Plugin zone above the sale screen
│
├── (when activeScreen === 'sale')
│   ├── ProductCatalog.vue   — Search, category filter, product grid
│   ├── [PluginSlot: catalog_panel]  — Plugin zone below the catalog
│   ├── PosCart.vue          — Cart items, totals, checkout button
│   └── [PluginSlot: cart_panel]     — Plugin zone below the cart
│
├── (when activeScreen === 'payment')
│   ├── PaymentPad.vue       — Payment method selector + keypad
│   └── [PluginSlot: payment_panel]  — Plugin zone below the keypad
│
├── StartupModal.vue         — Fallback local opening session dialog
├── InvoiceFetchModal.vue    — Fallback local invoice fetch dialog
├── QuickCreateModal.vue     — Quick item creation form
├── GenericItemModal.vue     — "Otros" generic item pricing form
└── [PluginSlot: modal_extra]        — Plugin-owned custom modals
```

---

## Composables

The business logic is split into three composables, each with a single responsibility:

### `useSession(call)`
**File**: `pos/src/composables/useSession.ts`

Manages POS session state, visual settings and the product catalog.

| Exposed | Type | Description |
|---------|------|-------------|
| `state` | `Ref<POSState>` | Full POS session state |
| `visualSettings` | `Ref<VisualSettings>` | Theme, compact mode, images, stock |
| `products` | `Ref<Product[]>` | Current product catalog |
| `hasOpenSession` | `ComputedRef<boolean>` | True if a POS opening entry exists |
| `currentOpening` | `ComputedRef<POSOpeningEntry>` | Active opening entry data |
| `currency` | `ComputedRef<string>` | Active currency code |
| `themeClass` | `ComputedRef<string>` | CSS class for the active theme |
| `loadState()` | `async` | Fetches session + settings from backend |
| `loadProducts(search, group)` | `async` | Fetches the product catalog |
| `triggerStartupDialog(onSuccess, fallback)` | `void` | Opens opening dialog (Frappe or local fallback) |
| `openClosingEntry()` | `async` | Creates and navigates to closing entry |
| `openRecentOrdersDialog()` | `void` | Opens the recent orders search dialog |

**Plugin hooks fired**: `onSessionLoad`, `onProductsLoad`

---

### `useCart(state, openGenericItemModal)`
**File**: `pos/src/composables/useCart.ts`

Manages cart state and all cart mutations.

| Exposed | Type | Description |
|---------|------|-------------|
| `cart` | `Ref<CartItem[]>` | Cart line items |
| `invoiceToPay` | `Ref<any>` | Fetched invoice data (split-pay flow) |
| `cartTotal` | `ComputedRef<number>` | Sum of qty × rate |
| `cartGroups` | `ComputedRef<CartGroup[]>` | Cart grouped by invoice reference |
| `addToCart(item)` | `void` | Adds/increments an item; intercepts generic item |
| `increaseQty(row)` | `void` | Increments quantity |
| `decreaseQty(row)` | `void` | Decrements quantity; removes at 0 |
| `removeInvoiceReference(row)` | `void` | Removes invoice reference + its children |
| `clearCart()` | `void` | Empties the cart |

**Plugin hooks fired**: `onItemAdd`, `onCartChange`

---

### `usePayment(cart, invoiceToPay, cartTotal, clearCart, state, loadPayments, call)`
**File**: `pos/src/composables/usePayment.ts`

Manages payment keypad input and the payment confirmation flow.

| Exposed | Type | Description |
|---------|------|-------------|
| `activeScreen` | `Ref<'sale' \| 'payment'>` | Controls which screen is shown |
| `paymentMethods` | `Ref<string[]>` | Available payment methods |
| `selectedPaymentMethod` | `Ref<string>` | Currently selected method |
| `paymentInput` | `Ref<string>` | Raw keypad input string |
| `paymentAmount` | `ComputedRef<number>` | Parsed payment amount |
| `paymentDue` | `ComputedRef<number>` | Remaining amount to be paid |
| `canConfirmPayment` | `ComputedRef<boolean>` | True when payment can be confirmed |
| `displayPaymentInput` | `ComputedRef<string>` | Formatted display string |
| `appendPaymentKey(key)` | `void` | Appends a digit or dot to keypad |
| `removeLastPaymentKey()` | `void` | Backspace on keypad |
| `setExactAmount()` | `void` | Sets input to exact cart total |
| `goToPaymentScreen()` | `async` | Transitions to payment screen |
| `backToSaleScreen()` | `void` | Returns to sale screen |
| `confirmPayment()` | `async` | Processes and saves the payment |

**Plugin hooks fired**: `beforePayment`, `afterPayment`

---

## Plugin System

### PluginSlot Component

`PluginSlot.vue` is a generic component that reads the `PluginService` registry and renders all plugins registered for a given `hook` name:

```vue
<PluginSlot hook="catalog_panel" :ctx="posCtx" />
```

For each registered plugin it will:
1. Render `plugin.component` if provided, passing `plugin.props(ctx)` + `ctx` as props
2. Render a `<button>` with `plugin.label` if no component but an `action` is provided

### PosContext Object

Every plugin receives a `PosContext` object — a controlled, read-only view of the POS state:

```typescript
interface PosContext {
  state: Readonly<POSState>;       // Session state
  cart: Readonly<CartItem[]>;      // Current cart
  products: Readonly<Product[]>;   // Catalog
  cartTotal: number;               // Computed total
  currency: string;                // Currency code
  addToCart(item): void;           // Safe cart mutation
  loadProducts(search?, group?): Promise<void>; // Catalog reload
}
```

---

## Data Flow

```
Backend (Python API)
        │
        ▼
   useSession ──── loadState() ──────────────▶ state
        │          loadProducts() ──────────▶ products
        │
        ▼
    useCart ──── addToCart() ──────────────▶ cart
        │        increaseQty/decreaseQty()
        │
        ▼
   usePayment ── confirmPayment() ─────────▶ backend
        │        keypad operations
        │
        ▼
    Home.vue ─── posCtx ──────────────────▶ PluginSlot ──▶ Plugin components
              └─ events ─────────────────▶ Modal components
```

---

## Sale Lifecycle

```
1. onMounted  → loadState() → loadProducts() → loadPaymentMethods()
2. User clicks product → addToCart()  → [plugin: onItemAdd, onCartChange]
3. User clicks "Pagar" → goToPaymentScreen() → loadPaymentMethods()
4. User selects method + enters amount → keypad updates paymentInput
5. User clicks "Confirmar" → confirmPayment()
   → [plugin: beforePayment]  (can cancel)
   → backend API call
   → clearCart()
   → [plugin: afterPayment]
   → back to sale screen
```
