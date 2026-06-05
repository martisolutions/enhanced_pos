/**
 * Example 05: Klarna Payment Integration Hook.
 *
 * This example shows how to integrate an external payment gateway (Klarna) into the
 * POS checkout flow. It intercepts the checkout process when Klarna is selected,
 * interacts with a custom Frappe backend API, displays a modal with a QR code or
 * status indicator, polls for payment confirmation, and then proceeds or cancels.
 *
 * How to load:
 * 1. Place this file in your custom app, e.g., your_app/public/js/klarna_pos_plugin.js
 * 2. Declare it in your app's hooks.py:
 *
 *    enhanced_pos_js = ["/assets/your_app/js/klarna_pos_plugin.js"]
 */

// Name of the Klarna Mode of Payment configured in your ERPNext POS Profile
const KLARNA_PAYMENT_METHOD = 'Klarna';

window.EnhancedPos.registerPlugin({
  name: 'klarna-payment-integration',
  hook: 'lifecycle', // Lifecycle plugin (no fixed UI slot)

  /**
   * Triggers when the cashier confirms the payment.
   * If 'Klarna' is selected, this intercepts the flow.
   *
   * @param {PaymentData} paymentData - { invoice_name, mode_of_payment, paid_amount }
   * @returns {Promise<boolean>} Return true to complete payment, false to abort/block.
   */
  async beforePayment(paymentData) {
    const { mode_of_payment, paid_amount, invoice_name } = paymentData;

    // Only intercept if Klarna is selected
    if (mode_of_payment !== KLARNA_PAYMENT_METHOD) {
      return true;
    }

    try {
      // 1. Initialize Klarna session on your custom backend
      frappe.show_alert({ message: __('Iniciando pasarela Klarna...'), indicator: 'blue' });
      
      const session = await frappe.xcall('klarna_integration.api.create_pos_payment_session', {
        amount: paid_amount,
        reference_invoice: invoice_name || null
      });

      if (!session || !session.client_token) {
        throw new Error(__('No se pudo iniciar la sesión de pago con Klarna.'));
      }

      // 2. Open a dialog to show payment status and QR code
      return await new Promise((resolve) => {
        let checkInterval = null;
        let timeoutTimer = null;

        const dialog = new frappe.ui.Dialog({
          title: __('Pago con Klarna'),
          static: true, // Prevent closing by clicking outside
          fields: [
            {
              fieldtype: 'HTML',
              fieldname: 'klarna_status_html',
              options: `
                <div class="text-center p-4">
                  <div class="mb-3">
                    <!-- Standard QR code image or loader -->
                    <img src="${session.qr_code_url || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(session.payment_url)}" 
                         alt="Klarna QR Code" 
                         style="width: 150px; height: 150px; margin: 0 auto;" />
                  </div>
                  <p class="font-bold text-gray-800 text-base">${__('Escanea el código QR para pagar')}</p>
                  <p class="text-xs text-gray-500 mt-1">${__('Esperando confirmación del cliente...')}</p>
                  <div class="mt-4 flex justify-center items-center gap-2">
                    <span class="spinner-border spinner-border-sm text-indigo-600" role="status" style="width: 1rem; height: 1rem; border-width: 0.15em;"></span>
                    <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">${__('Verificando pago...')}</span>
                  </div>
                </div>
              `
            }
          ],
          primary_action_label: __('Cancelar Pago'),
          primary_action: () => {
            // Cashier manually cancelled the checkout
            cleanup();
            frappe.show_alert({ message: __('Pago cancelado por el cajero'), indicator: 'red' });
            resolve(false);
            dialog.hide();
          }
        });

        const cleanup = () => {
          if (checkInterval) clearInterval(checkInterval);
          if (timeoutTimer) clearTimeout(timeoutTimer);
        };

        // 3. Poll backend to verify if payment was completed by the client
        checkInterval = setInterval(async () => {
          try {
            const status = await frappe.xcall('klarna_integration.api.check_pos_payment_status', {
              session_id: session.session_id
            });

            if (status.completed) {
              cleanup();
              frappe.show_alert({ message: __('¡Pago recibido de Klarna!'), indicator: 'green' });
              resolve(true); // Proceed to create invoice/payment entry in ERPNext
              dialog.hide();
            } else if (status.failed) {
              cleanup();
              frappe.msgprint({
                title: __('Pago Rechazado'),
                message: status.error_message || __('El pago fue rechazado o falló.'),
                indicator: 'red'
              });
              resolve(false);
              dialog.hide();
            }
          } catch (err) {
            console.error('Error checking Klarna payment status:', err);
          }
        }, 3000); // Check status every 3 seconds

        // 4. Set a safety timeout (e.g. 3 minutes)
        timeoutTimer = setTimeout(() => {
          cleanup();
          frappe.msgprint({
            title: __('Tiempo de Espera Agotado'),
            message: __('El pago de Klarna ha expirado por inactividad.'),
            indicator: 'orange'
          });
          resolve(false);
          dialog.hide();
        }, 180000);

        dialog.show();
      });

    } catch (error) {
      frappe.msgprint({
        title: __('Error de Integración'),
        message: error.message || __('Ocurrió un error inesperado al conectar con Klarna.'),
        indicator: 'red'
      });
      return false;
    }
  },

  /**
   * Hook that runs after the ERPNext payment transaction completes successfully.
   */
  async afterPayment(result) {
    if (result.method === KLARNA_PAYMENT_METHOD || result.mode_of_payment === KLARNA_PAYMENT_METHOD) {
      console.log('[Klarna] Checkout finalized successfully on backend:', result);
      // Perform receipt adjustments, auto-printing, or custom analytics tracing here
    }
  }
});
