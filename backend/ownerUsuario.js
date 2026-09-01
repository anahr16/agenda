// emailSync.js y los recordatorios por Telegram/push (recordatorios.js,
// recordatoriosEntrevistas.js, recordatoriosEventos.js,
// recordatoriosPostulaciones.js, resumenSemanal.js) estan atados a un unico
// mailbox/chat de Telegram por variables de entorno -- no son multi-tenant,
// y no tiene sentido que lo sean. Necesitan saber a que cuenta especifica
// (la dueña real de ese mailbox) pertenece la actividad que procesan, para no
// mezclarla con cuentas publicas nuevas ni avisarles a ellas por error.
const db = require('./db');

function obtenerIdDueña() {
  return db.prepare('SELECT id FROM usuarios WHERE es_owner = 1 LIMIT 1').get()?.id ?? null;
}

module.exports = { obtenerIdDueña };
