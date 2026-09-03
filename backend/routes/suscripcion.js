const express = require('express');
const { PreApproval } = require('mercadopago');
const db = require('../db');
const { estadoDe, tienePagoActivo, PRECIO_CLP, TRIAL_DIAS } = require('../suscripcion');
const { getClienteMercadoPago, avisoMercadoPagoNoConfigurado } = require('../mercadopagoApp');

const router = express.Router();

router.get('/', (req, res) => {
  const estado = estadoDe(req.usuario.id);
  if (!estado) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({
    permitido: !!estado.permitido,
    // Distinto de "permitido": Postulaciones exige suscripcion paga de
    // verdad, no alcanza con estar en la prueba gratis (ver
    // requireSuscripcionPaga). El resto de la app usa "permitido".
    postulaciones_permitido: !!tienePagoActivo(req.usuario.id).pagado,
    fecha_fin_prueba: estado.fecha_fin_prueba,
    suscripcion_vence: estado.suscripcion_vence,
    suscripcion_fuente: estado.suscripcion_fuente,
    precio_clp: PRECIO_CLP,
    trial_dias: TRIAL_DIAS,
  });
});

// Crea la suscripcion recurrente en MercadoPago y devuelve el checkout
// hospedado (init_point) para que el frontend redirija ahi. external_reference
// es el usuario_id -- asi el webhook sabe a que cuenta corresponde el aviso.
router.post('/mercadopago/checkout', async (req, res) => {
  const cliente = getClienteMercadoPago();
  if (!cliente) {
    avisoMercadoPagoNoConfigurado('suscripcion/mercadopago/checkout');
    return res.status(503).json({ error: 'Pago con MercadoPago no disponible todavia' });
  }
  const usuario = db.prepare('SELECT id, email FROM usuarios WHERE id = ?').get(req.usuario.id);
  const urlVuelta = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',')[0].trim();
  try {
    const preapproval = await new PreApproval(cliente).create({
      body: {
        reason: 'Agenda Inteligente - Suscripcion mensual',
        external_reference: String(usuario.id),
        payer_email: usuario.email,
        back_url: urlVuelta,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRECIO_CLP,
          currency_id: 'CLP',
        },
      },
    });
    db.prepare('UPDATE usuarios SET mercadopago_preapproval_id = ? WHERE id = ?').run(preapproval.id, usuario.id);
    res.json({ init_point: preapproval.init_point });
  } catch (err) {
    console.error('[suscripcion] Error creando preapproval de MercadoPago:', err.message);
    res.status(502).json({ error: 'No se pudo iniciar el pago con MercadoPago' });
  }
});

module.exports = router;
