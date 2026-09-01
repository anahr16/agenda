// Resumen semanal por Telegram de la busqueda laboral -- en vez de solo
// avisos sueltos (nueva postulacion, cambio de estado), un vistazo general
// cada semana: cuantas postulaciones nuevas, el total acumulado por
// estado, y que hay agendado (entrevistas + eventos) para los proximos 7
// dias.

const cron = require('node-cron');
const db = require('./db');
const { enviarTelegram } = require('./telegram');
const { obtenerIdDueña } = require('./ownerUsuario');

function formatoUTC(date) {
  return date.toISOString().slice(0, 19);
}

function formatoLocal(iso) {
  const fecha = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return fecha.toLocaleString('es-419', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Telegram es un unico chat compartido, no por usuario -- el resumen es solo
// de la actividad de la cuenta dueña (ver ownerUsuario.js). Si no hay ninguna
// cuenta marcada como dueña, no hay resumen posible.
function construirResumen(usuarioId) {
  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const en7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const hoy = new Date().toISOString().slice(0, 10);

  const nuevas = db
    .prepare(
      'SELECT empresa, puesto, portal FROM postulaciones WHERE usuario_id = ? AND creado_en >= datetime(?) ORDER BY creado_en DESC'
    )
    .all(usuarioId, hace7dias.toISOString());

  const total = db.prepare('SELECT COUNT(*) n FROM postulaciones WHERE usuario_id = ?').get(usuarioId).n;
  const porEstado = db
    .prepare('SELECT estado, COUNT(*) n FROM postulaciones WHERE usuario_id = ? GROUP BY estado')
    .all(usuarioId);

  const entrevistas = db
    .prepare(
      `SELECT empresa, puesto, fecha_entrevista FROM postulaciones
       WHERE usuario_id = ? AND fecha_entrevista IS NOT NULL AND fecha_entrevista >= ? AND fecha_entrevista <= ?
       ORDER BY fecha_entrevista`
    )
    .all(usuarioId, formatoUTC(new Date()), formatoUTC(en7dias));

  const eventos = db
    .prepare('SELECT titulo, fecha, hora FROM eventos WHERE usuario_id = ? AND fecha >= ? AND fecha <= ? ORDER BY fecha, hora')
    .all(usuarioId, hoy, en7dias.toISOString().slice(0, 10));

  const lineas = ['📊 Resumen semanal de tu búsqueda laboral', ''];

  lineas.push(`Postulaciones nuevas esta semana: ${nuevas.length}`);
  nuevas.slice(0, 10).forEach((p) => lineas.push(`  · ${p.empresa} — ${p.puesto}${p.portal ? ` (${p.portal})` : ''}`));
  if (nuevas.length > 10) lineas.push(`  · …y ${nuevas.length - 10} más`);

  lineas.push('', `Total acumulado: ${total} postulaciones`);
  porEstado.forEach((e) => lineas.push(`  · ${e.estado}: ${e.n}`));

  if (entrevistas.length > 0) {
    lineas.push('', 'Entrevistas en los próximos 7 días:');
    entrevistas.forEach((e) => lineas.push(`  · ${e.empresa} (${e.puesto}) — ${formatoLocal(e.fecha_entrevista)}`));
  }

  if (eventos.length > 0) {
    lineas.push('', 'Eventos en los próximos 7 días:');
    eventos.forEach((e) => lineas.push(`  · ${e.titulo} — ${e.fecha}${e.hora ? ` ${e.hora}` : ''}`));
  }

  return lineas.join('\n');
}

async function enviarResumenSemanal() {
  const usuarioId = obtenerIdDueña();
  if (!usuarioId) return;
  try {
    await enviarTelegram(construirResumen(usuarioId));
    console.log('[resumen-semanal] Resumen semanal enviado por Telegram.');
  } catch (err) {
    console.error('[resumen-semanal] No se pudo enviar el resumen semanal:', err.message);
  }
}

function iniciarResumenSemanal() {
  // Domingos a las 9:00 (hora del server, ver supuesto de zona horaria en recordatoriosEventos.js).
  cron.schedule('0 9 * * 0', () => {
    enviarResumenSemanal().catch((err) => {
      console.error('[resumen-semanal] Error generando el resumen semanal:', err.message);
    });
  });
  console.log('[resumen-semanal] Scheduler de resumen semanal iniciado (domingos 9:00).');
}

module.exports = iniciarResumenSemanal;
module.exports.enviarResumenSemanal = enviarResumenSemanal;
