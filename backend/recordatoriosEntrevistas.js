const cron = require('node-cron');
const { getMessaging } = require('firebase-admin/messaging');
const db = require('./db');
const { getFirebaseApp, avisoFirebaseNoConfigurado } = require('./firebaseApp');

function formatoUTC(date) {
  return date.toISOString().slice(0, 19);
}

async function enviarPush(fcmToken, postulacion) {
  const app = getFirebaseApp();
  if (!app) {
    avisoFirebaseNoConfigurado('recordatorios-entrevistas');
    console.log(
      `[recordatorios-entrevistas] (simulado) entrevista con ${postulacion.empresa} a las ${postulacion.fecha_entrevista}`
    );
    return;
  }
  await getMessaging(app).send({
    token: fcmToken,
    notification: {
      title: 'Entrevista próxima',
      body: `${postulacion.empresa} - ${postulacion.puesto} a las ${postulacion.fecha_entrevista}`,
    },
  });
}

async function procesarRecordatoriosEntrevistas() {
  const minutosAntes = Number(process.env.RECORDATORIO_MINUTOS_ANTES || 30);
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + minutosAntes * 60000);

  const postulaciones = db
    .prepare(
      `SELECT * FROM postulaciones
       WHERE recordatorio_entrevista_enviado = 0
         AND fecha_entrevista IS NOT NULL
         AND fecha_entrevista > ?
         AND fecha_entrevista <= ?`
    )
    .all(formatoUTC(ahora), formatoUTC(limite));

  if (postulaciones.length === 0) return;

  // A diferencia de emailSync.js (un solo mailbox), postulaciones ya tiene
  // usuario_id real para cada cuenta -- cada entrevista se le avisa solo a
  // quien es dueña de esa postulacion puntual, no a todas las cuentas
  // registradas con notificaciones activas.
  for (const postulacion of postulaciones) {
    const usuario = postulacion.usuario_id
      ? db.prepare('SELECT fcm_token FROM usuarios WHERE id = ? AND fcm_token IS NOT NULL').get(postulacion.usuario_id)
      : null;
    if (usuario) {
      try {
        await enviarPush(usuario.fcm_token, postulacion);
      } catch (err) {
        console.error(`[recordatorios-entrevistas] Error enviando push para postulacion #${postulacion.id}:`, err.message);
      }
    }
    db.prepare('UPDATE postulaciones SET recordatorio_entrevista_enviado = 1 WHERE id = ?').run(postulacion.id);
  }
}

function iniciarRecordatoriosEntrevistas() {
  cron.schedule('* * * * *', () => {
    procesarRecordatoriosEntrevistas().catch((err) => {
      console.error('[recordatorios-entrevistas] Error procesando recordatorios de entrevistas:', err.message);
    });
  });
  console.log('[recordatorios-entrevistas] Scheduler de recordatorios de entrevistas iniciado (corre cada minuto).');
}

module.exports = iniciarRecordatoriosEntrevistas;
module.exports.procesarRecordatoriosEntrevistas = procesarRecordatoriosEntrevistas;
