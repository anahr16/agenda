const path = require('path');
const cron = require('node-cron');
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const db = require('./db');

let firebaseApp = null;
let avisoFirebaseMostrado = false;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  const rutaCredenciales = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!rutaCredenciales) return null;
  try {
    const serviceAccount = require(path.resolve(rutaCredenciales));
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    return firebaseApp;
  } catch (err) {
    console.error('[recordatorios] No se pudo inicializar Firebase:', err.message);
    return null;
  }
}

function formatoUTC(date) {
  return date.toISOString().slice(0, 19);
}

async function enviarPush(fcmToken, cita) {
  const app = getFirebaseApp();
  if (!app) {
    if (!avisoFirebaseMostrado) {
      console.warn(
        '[recordatorios] FIREBASE_SERVICE_ACCOUNT_PATH no configurado: los recordatorios se loguean pero no se envian push reales.'
      );
      avisoFirebaseMostrado = true;
    }
    console.log(`[recordatorios] (simulado) cita #${cita.id} con ${cita.cliente_nombre} a las ${cita.inicio}`);
    return;
  }
  await getMessaging(app).send({
    token: fcmToken,
    notification: {
      title: 'Proximo turno',
      body: `${cita.cliente_nombre} a las ${cita.inicio}`,
    },
  });
}

async function procesarRecordatorios() {
  const minutosAntes = Number(process.env.RECORDATORIO_MINUTOS_ANTES || 30);
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + minutosAntes * 60000);

  const citas = db
    .prepare(
      `SELECT citas.*, clientes.nombre AS cliente_nombre
       FROM citas
       JOIN clientes ON clientes.id = citas.cliente_id
       WHERE citas.recordatorio_enviado = 0
         AND citas.estado != 'cancelada'
         AND citas.inicio > ?
         AND citas.inicio <= ?`
    )
    .all(formatoUTC(ahora), formatoUTC(limite));

  if (citas.length === 0) return;

  const usuarios = db.prepare('SELECT * FROM usuarios WHERE fcm_token IS NOT NULL').all();
  if (usuarios.length === 0) return;

  for (const cita of citas) {
    for (const usuario of usuarios) {
      try {
        await enviarPush(usuario.fcm_token, cita);
      } catch (err) {
        console.error(`[recordatorios] Error enviando push para cita #${cita.id}:`, err.message);
      }
    }
    db.prepare('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?').run(cita.id);
  }
}

function iniciarRecordatorios() {
  cron.schedule('* * * * *', () => {
    procesarRecordatorios().catch((err) => {
      console.error('[recordatorios] Error procesando recordatorios:', err.message);
    });
  });
  console.log('[recordatorios] Scheduler de recordatorios iniciado (corre cada minuto).');
}

module.exports = iniciarRecordatorios;
module.exports.procesarRecordatorios = procesarRecordatorios;
