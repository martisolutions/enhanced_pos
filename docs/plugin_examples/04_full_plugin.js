/**
 * Example 04: Full plugin — UI panel + header button + lifecycle hooks.
 *
 * This example demonstrates a loyalty points system plugin that:
 *  - Shows a loyalty panel below the cart (cart_panel)
 *  - Adds a "Ver Puntos" button in the header (header_action)
 *  - Tracks points on each item add (onItemAdd)
 *  - Awards points after payment (afterPayment)
 *  - Loads customer data when the session starts (onSessionLoad)
 *
 * hooks.py:
 *   enhanced_pos_js = ["/assets/your_app/js/04_full_plugin.js"]
 */

// ── Internal plugin state ──────────────────────────────────────────────────
const loyaltyState = {
  points: 0,
  customerName: '',
};

// ── Cart panel: shows accumulated points ──────────────────────────────────
const LoyaltyPanel = {
  props: ['ctx', 'points', 'customerName'],
  template: `
    <div v-if="ctx.cart.length > 0" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
      <div class="flex justify-between items-center">
        <div>
          <p class="font-bold text-amber-900 text-sm">⭐ Puntos de Fidelización</p>
          <p class="text-xs text-amber-700 mt-1">
            Esta compra genera <b>{{ estimatedPoints }}</b> puntos
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold text-amber-600">{{ points }}</p>
          <p class="text-xs text-amber-500">puntos acumulados</p>
        </div>
      </div>
    </div>
  `,
  computed: {
    estimatedPoints() {
      return Math.floor(this.ctx.cartTotal);
    },
  },
};

// ── Register the full plugin ───────────────────────────────────────────────
window.EnhancedPos.registerPlugin({
  name: 'loyalty-points-system',
  hook: 'cart_panel',
  component: LoyaltyPanel,

  // Pass reactive data to the component
  props(ctx) {
    return {
      points: loyaltyState.points,
      customerName: loyaltyState.customerName,
    };
  },

  // Lifecycle: load customer on session start
  onSessionLoad(state) {
    console.log('[Loyalty] POS session started for user:', state.user);
    loyaltyState.points = 0; // Reset; real app would fetch from backend
  },

  // Lifecycle: track items added
  onItemAdd(item, cart) {
    console.log('[Loyalty] Item added to cart:', item.item_code);
  },

  // Lifecycle: cart changed
  onCartChange(cart) {
    // Preview points based on cart total
    const total = cart.reduce((s, r) => s + r.qty * r.rate, 0);
    console.log('[Loyalty] Cart total preview:', total, '→', Math.floor(total), 'points');
  },

  // Lifecycle: award points after successful payment
  async afterPayment(result) {
    const awarded = Math.floor(result.amount || 0);
    loyaltyState.points += awarded;
    frappe.show_alert({
      message: `⭐ ¡${awarded} puntos añadidos! Total: ${loyaltyState.points} puntos`,
      indicator: 'orange',
    });

    // Real app: save to backend
    // await frappe.call({
    //   method: 'your_app.api.award_loyalty_points',
    //   args: { points: awarded, user: frappe.session.user },
    // });
  },
});

// ── Header button: show total points ──────────────────────────────────────
window.EnhancedPos.registerPlugin({
  name: 'loyalty-header-button',
  label: `⭐ Puntos`,
  hook: 'header_action',
  class: 'btn border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm font-semibold rounded-lg px-4 py-2',
  action(ctx) {
    frappe.msgprint({
      title: 'Puntos de Fidelización',
      message: `Puntos acumulados en esta sesión: <b>${loyaltyState.points}</b>`,
      indicator: 'orange',
    });
  },
});
