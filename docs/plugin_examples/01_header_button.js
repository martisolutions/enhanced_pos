/**
 * Example 01: Add a button to the Enhanced POS header bar.
 *
 * Drop this file into your Frappe app's public/js/ folder and
 * declare it in hooks.py:
 *
 *   enhanced_pos_js = ["/assets/your_app/js/01_header_button.js"]
 */

window.EnhancedPos.registerPlugin({
  name: 'example-header-button',
  label: 'Reimprimir Ticket',
  hook: 'header_action',

  // Optional: CSS classes for the button
  class: 'btn border border-gray-300 hover:bg-gray-100 text-sm font-semibold rounded-lg px-4 py-2',

  // Optional: Disable when no session is open
  disabled(ctx) {
    return ctx.state.opening_entries.length === 0;
  },

  // Click handler — receives the live PosContext
  action(ctx) {
    frappe.show_alert({
      message: `Reimprimiendo último ticket. Sesión: ${ctx.state.enhanced_pos_settings}`,
      indicator: 'blue',
    });

    // Example: call your own backend endpoint
    // frappe.call({
    //   method: 'your_app.api.reprint_last_receipt',
    //   args: { pos_profile: ctx.state.opening_entries[0]?.pos_profile },
    // });
  },
});
