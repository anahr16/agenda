const cron = require('node-cron');
const db = require('./db');
const { enviarTelegram } = require('./telegram');

const DIAS_SEGUIMIENTO = Number(process.env.SEGUIMIENTO_POSTULACIONES_DIAS || 2);

async function procesarRecordatoriosSeguimiento() {
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_SEGUIMIENTO);
  const limiteStr = limite.toISOString().slice(0, 10);

  const postulaciones = db
    .prepare(
      `SELECT * FROM postulaciones
       WHERE estado = 'enviada'
         AND recordatorio_seguimiento_enviado = 0
         AND fecha_postulacion <= ?`
    )
    .all(limiteStr);

  for (const postulacion of postulaciones) {
    const mensaje = `📋 Postulaste a "${postulacion.puesto}" en ${postulacion.empresa} hace ${DIAS_SEGUIMIENTO} días y todavía no hay novedades. ¿Le hacés seguimiento?`;
    try {
      await enviarTelegram(mensaje);
    } catch (err) {
      console.error(`[recordatorios-postulaciones] Error enviando Telegram para postulacion #${postulacion.id}:`, err.message);
      continue;
    }
    db.prepare('UPDATE postulaciones SET recordatorio_seguimiento_enviado = 1 WHERE id = ?').run(postulacion.id);
    console.log(`[recordatorios-postulaciones] Recordatorio de seguimiento enviado: ${postulacion.empresa} - ${postulacion.puesto}`);
  }
}

function iniciarRecordatoriosPostulaciones() {
  cron.schedule('0 * * * *', () => {
    procesarRecordatoriosSeguimiento().catch((err) => {
      console.error('[recordatorios-postulaciones] Error procesando:', err.message);
    });
  });
  console.log('[recordatorios-postulaciones] Scheduler de seguimiento de postulaciones iniciado (corre cada hora).');
}

module.exports = iniciarRecordatoriosPostulaciones;
module.exports.procesarRecordatoriosSeguimiento = procesarRecordatoriosSeguimiento;
