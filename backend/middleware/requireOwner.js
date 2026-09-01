// Gate para funciones viejas (clientes/citas, el turnero original antes de
// Postulaciones/Agenda/Annie) que nunca se migraron a multi-tenancy real --
// en vez de invertir en separar esos datos por usuario para una funcion que
// no esta en uso, se las deja visibles solo para la cuenta dueña.
const db = require('../db');

module.exports = function requireOwner(req, res, next) {
  const usuario = db.prepare('SELECT es_owner FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!usuario?.es_owner) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
};
