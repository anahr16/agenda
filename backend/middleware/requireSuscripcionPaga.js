// Gate mas estricto que requireSuscripcionActiva: exige suscripcion paga de
// verdad, no alcanza con estar dentro de la prueba gratis. Postulaciones es
// el "plus" pago -- Agenda/Annie siguen dentro de la prueba gratis via
// requireSuscripcionActiva. Ver tienePagoActivo() en suscripcion.js.
const { tienePagoActivo } = require('../suscripcion');

module.exports = function requireSuscripcionPaga(req, res, next) {
  const estado = tienePagoActivo(req.usuario.id);
  if (!estado) return res.status(401).json({ error: 'Usuario no encontrado' });
  if (estado.pagado) return next();
  return res.status(402).json({ error: 'Postulaciones requiere suscripcion paga', suscripcion_requerida: true });
};
