// Estado de prueba/suscripcion por cuenta -- ver "Fase 1" del plan y la
// seccion de suscripciones en readme.md. Mismo molde que annieLimite.js:
// funciones planas, sin estado propio (todo vive en la fila de usuarios).
const db = require('./db');

const TRIAL_DIAS = Number(process.env.TRIAL_DIAS || 14);
const PRECIO_CLP = Number(process.env.PRECIO_SUSCRIPCION_CLP || 10000);

// Toda la comparacion de fechas la hace SQLite, no JS -- datetime('now') de
// SQLite es UTC en formato 'YYYY-MM-DD HH:MM:SS'; mezclar eso con
// new Date().toISOString() (formato distinto, con 'T'/'Z'/milisegundos) es
// un bug clasico de comparacion de fechas como si fueran texto.
function estadoDe(usuarioId) {
  return db
    .prepare(
      `SELECT es_owner, fecha_fin_prueba, suscripcion_vence, suscripcion_fuente,
        (es_owner = 1
          OR (fecha_fin_prueba IS NOT NULL AND datetime('now') < fecha_fin_prueba)
          OR (suscripcion_vence IS NOT NULL AND datetime('now') < suscripcion_vence)
        ) AS permitido
      FROM usuarios WHERE id = ?`
    )
    .get(usuarioId);
}

// A diferencia de estadoDe() (permite trial O suscripcion paga), esto exige
// suscripcion paga de verdad -- para Postulaciones, que la usuaria pidio
// dejar afuera de la prueba gratis a proposito (el "plus" que justifica
// pagar). es_owner sigue sin bloquearse nunca.
function tienePagoActivo(usuarioId) {
  return db
    .prepare(
      `SELECT (es_owner = 1
          OR (suscripcion_vence IS NOT NULL AND datetime('now') < suscripcion_vence)
        ) AS pagado
      FROM usuarios WHERE id = ?`
    )
    .get(usuarioId);
}

function registrarEvento(usuarioId, fuente, tipo, referenciaExterna, payload) {
  db.prepare(
    'INSERT INTO suscripcion_eventos (usuario_id, fuente, tipo, referencia_externa, payload) VALUES (?, ?, ?, ?, ?)'
  ).run(usuarioId, fuente, tipo, referenciaExterna ?? null, payload ? JSON.stringify(payload) : null);
}

module.exports = { TRIAL_DIAS, PRECIO_CLP, estadoDe, tienePagoActivo, registrarEvento };
