/**
 * Example 02: Inject a Vue component panel below the product catalog.
 *
 * The component receives `ctx` (PosContext) as a prop, giving it
 * live, reactive access to cart, products, totals, etc.
 *
 * hooks.py:
 *   enhanced_pos_js = ["/assets/your_app/js/02_catalog_panel.js"]
 */

const StockSummaryPanel = {
  props: ['ctx'],
  template: `
    <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-2 flex justify-between items-center">
      <div>
        <p class="font-bold text-indigo-900 text-sm">Panel de Resumen</p>
        <p class="text-xs text-indigo-700 mt-1">
          {{ ctx.products.length }} productos cargados
        </p>
      </div>
      <div class="text-right">
        <p class="text-xs text-indigo-600 font-semibold">Carrito actual</p>
        <p class="text-indigo-900 font-bold">
          {{ ctx.currency }} {{ ctx.cartTotal.toFixed(2) }}
        </p>
        <p class="text-xs text-indigo-500">{{ ctx.cart.length }} línea(s)</p>
      </div>
    </div>
  `,
};

window.EnhancedPos.registerPlugin({
  name: 'example-catalog-panel',
  hook: 'catalog_panel',
  component: StockSummaryPanel,
});
