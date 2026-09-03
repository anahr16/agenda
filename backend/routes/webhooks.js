// Webhooks de medios de pago -- montado en index.js FUERA de requireAuth
// (MercadoPago no manda JWT). Cada handler verifica su propia firma.
const express = require('express');
const { PreApproval, WebhookSignatureValidator, InvalidWebhookSignatureError } = require('mercadopago');
const db = require('../db');
const { registrarEvento } = require('../suscripcion');
const { getClienteMercadoPago } = require('../mercadopagoApp');

const router = express.Router();

router.post('/mercadopago', async (req, res) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhooks/mercadopago] MERCADOPAGO_WEBHOOK_SECRET no configurado, se ignora el aviso');
    return res.sendStatus(200);
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      dataId: req.query['data.id'],
      secret,
    });
  } catch (err) {
    const razon = err instanceof InvalidWebhookSignatureError ? err.reason : err.message;
    console.warn('[webhooks/mercadopago] Firma invalida, se descarta el aviso:', razon);
    return res.sendStatus(401);
  }

  // Responder rapido -- MercadoPago reintenta cada 15 min si no hay 200 a
  // tiempo. El procesamiento sigue despues, la firma ya quedo verificada.
  res.sendStatus(200);

  if (req.body?.type !== 'subscription_preapproval') return;
  const preapprovalId = req.body?.data?.id;
  if (!preapprovalId) return;

  const cliente = getClienteMercadoPago();
  if (!cliente) return;

  try {
    // Nunca confiar en los numeros que trae el aviso -- se vuelve a
    // consultar el estado real y autoritativo a la API de MercadoPago.
    const preapproval = await new PreApproval(cliente).get({ id: preapprovalId });
    const usuarioId = Number(preapproval.external_reference);
    if (!usuarioId) return;

    registrarEvento(usuarioId, 'mercadopago', preapproval.status, preapprovalId, preapproval);

    if (preapproval.status === 'authorized') {
      if (preapproval.next_payment_date) {
        db.prepare(
          `UPDATE usuarios SET suscripcion_vence = datetime(?), suscripcion_fuente = 'mercadopago', mercadopago_preapproval_id = ? WHERE id = ?`
        ).run(preapproval.next_payment_date, preapproval.id, usuarioId);
      } else {
        db.prepare(
          `UPDATE usuarios SET suscripcion_vence = datetime('now', '+1 months'), suscripcion_fuente = 'mercadopago', mercadopago_preapproval_id = ? WHERE id = ?`
        ).run(preapproval.id, usuarioId);
      }
    }
    // Si esta pausada/cancelada no se toca suscripcion_vence: ya se pago ese
    // periodo, se vence solo en la fecha que ya tenia guardada.
  } catch (err) {
    console.error('[webhooks/mercadopago] Error procesando aviso:', err.message);
  }
});

module.exports = router;
