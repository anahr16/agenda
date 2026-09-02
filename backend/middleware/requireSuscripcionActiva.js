// Gate para las rutas que requieren prueba/suscripcion activa -- bloquea el
// grupo de rutas entero (no una accion puntual, para eso ya esta
// annieLimite.js). Ver suscripcion.js para como se calcula "permitido".
const { estadoDe } = require('../suscripcion');

module.exports = function requireSuscripcionActiva(req, res, next) {
  const estado = estadoDe(req.usuario.id);
  if (!estado) return res.status(401).json({ error: 'Usuario no encontrado' });
  if (estado.permitido) return next();
  return res.status(402).json({ error: 'Se requiere una suscripcion activa', suscripcion_requerida: true });
};
