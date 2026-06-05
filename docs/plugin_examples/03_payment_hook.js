/**
 * Example 03: Intercept and validate payment with beforePayment hook.
 *
 * - Blocks payments under a configurable minimum
 * - Asks for confirmation before proceeding
 * - Logs completed transactions
 *
 * hooks.py:
 *   enhanced_pos_js = ["/assets/your_app/js/03_payment_hook.js"]
 */

const MINIMUM_PAYMENT = 0.01; // Change to your desired minimum

window.EnhancedPos.registerPlugin({
  name: 'example-payment-validator',
  hook: 'lifecycle', // hook is informational for lifecycle-only plugins

  /**
   * Called before confirming a payment.
   * Return false to cancel. Return true (or nothing) to allow.
   */
  async beforePayment(paymentData) {
    const { mode_of_payment, paid_amount, invoice_name } = paymentData;

    // 1. Block payments below minimum
    if (paid_amount < MINIMUM_PAYMENT) {
      frappe.msgprint({
        title: 'Importe insuficiente',
        message: `El importe mínimo es ${MINIMUM_PAYMENT}€. Ingresado: ${paid_amount}€`,
        indicator: 'red',
      });
      return false;
    }

    // 2. Ask for confirmation on large amounts
    if (paid_amount > 500) {
      return new Promise((resolve) => {
        frappe.confirm(
          `Vas a cobrar <b>${paid_amount}€</b> con <b>${mode_of_payment}</b>.<br>¿Confirmar?`,
          () => resolve(true),
          () => resolve(false)
        );
      });
    }

    // 3. Allow by default
    return true;
  },

  /** Called after the payment has been saved. */
  async afterPayment(result) {
    console.log('[PaymentPlugin] Transaction completed:', result);

    // Example: send to your own analytics endpoint
    // await frappe.call({
    //   method: 'your_app.api.track_transaction',
    //   args: { payment_entry: result.payment_entry, amount: result.amount },
    // });

    frappe.show_alert({ message: '✅ Pago registrado correctamente', indicator: 'green' });
  },
});
