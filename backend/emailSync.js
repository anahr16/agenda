const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { convert } = require('html-to-text');
const cron = require('node-cron');
const db = require('./db');
const PARSERS = require('./emailParsers');
const { obtenerDescripcion } = require('./jobPageScraper');

const DIAS_ATRAS = 3;
const ESTADOS_TERMINALES = ['rechazada', 'oferta'];

const OPCIONES_HTML_A_TEXTO = {
  wordwrap: false,
  selectors: [
    { selector: 'h1', options: { uppercase: false } },
    { selector: 'h2', options: { uppercase: false } },
    { selector: 'h3', options: { uppercase: false } },
    { selector: 'a', options: { ignoreHref: true } },
    { selector: 'img', format: 'skip' },
  ],
};

// Algunos mails no traen parte de texto plano (solo HTML); en ese caso se
// convierte el HTML a texto para poder aplicar los mismos regex.
function textoDelMail(parsed) {
  if (parsed.text && parsed.text.trim()) return parsed.text;
  return convert(parsed.html || '', OPCIONES_HTML_A_TEXTO);
}

function config() {
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_APP_PASSWORD;
  if (!user || !pass) return null;
  return {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  };
}

function yaProcesado(messageId) {
  return !!db.prepare('SELECT 1 FROM postulaciones_emails_procesados WHERE message_id = ?').get(messageId);
}

function marcarProcesado(messageId) {
  db.prepare('INSERT OR IGNORE INTO postulaciones_emails_procesados (message_id) VALUES (?)').run(messageId);
}

function buscarPostulacion(empresa, puesto) {
  return db
    .prepare('SELECT * FROM postulaciones WHERE lower(empresa) = lower(?) AND lower(puesto) = lower(?)')
    .get(empresa, puesto);
}

function buscarPostulacionesPorPuesto(puesto) {
  return db.prepare('SELECT * FROM postulaciones WHERE lower(puesto) = lower(?)').all(puesto);
}

function crearPostulacion({ empresa, puesto, portal, link, fecha }) {
  const resultado = db
    .prepare(
      `INSERT INTO postulaciones (empresa, puesto, portal, link, fecha_postulacion, estado, notas)
       VALUES (?, ?, ?, ?, ?, 'enviada', 'Detectada automaticamente por email')`
    )
    .run(empresa, puesto, portal, link || null, fecha);
  return resultado.lastInsertRowid;
}

function actualizarEstadoPostulacion(id, estado) {
  db.prepare('UPDATE postulaciones SET estado = ? WHERE id = ?').run(estado, id);
}

function actualizarDescripcion(id, descripcion) {
  db.prepare('UPDATE postulaciones SET descripcion = ? WHERE id = ?').run(descripcion, id);
}

async function procesarNuevaPostulacion(datos, parserUsado, fechaMail) {
  if (buscarPostulacion(datos.empresa, datos.puesto)) return;
  const id = crearPostulacion({
    empresa: datos.empresa,
    puesto: datos.puesto,
    portal: parserUsado.portal,
    link: datos.link,
    fecha: fechaMail.toISOString().slice(0, 10),
  });
  console.log(`[email-sync] Postulacion detectada: ${datos.empresa} - ${datos.puesto} (${parserUsado.portal})`);

  if (!datos.link) return;
  try {
    const descripcion = await obtenerDescripcion(datos.link);
    if (descripcion) actualizarDescripcion(id, descripcion);
  } catch (err) {
    console.warn(`[email-sync] No se pudo traer la descripcion de ${datos.link}:`, err.message);
  }
}

function procesarCambioEstado(datos) {
  const candidatas = datos.empresa
    ? [buscarPostulacion(datos.empresa, datos.puesto)].filter(Boolean)
    : buscarPostulacionesPorPuesto(datos.puesto);

  if (candidatas.length !== 1) {
    console.warn(
      `[email-sync] Cambio de estado (${datos.estado}) para "${datos.puesto}" no identifico una unica postulacion (${candidatas.length} candidatas)`
    );
    return;
  }

  const postulacion = candidatas[0];
  if (ESTADOS_TERMINALES.includes(postulacion.estado)) return;
  if (datos.estado === 'vista' && postulacion.estado !== 'enviada') return;
  if (postulacion.estado === datos.estado) return;

  actualizarEstadoPostulacion(postulacion.id, datos.estado);
  console.log(`[email-sync] Estado actualizado: ${postulacion.empresa} - ${postulacion.puesto} -> ${datos.estado}`);
}

let avisoDesactivadoMostrado = false;

async function sincronizarEmails() {
  const cfg = config();
  if (!cfg) {
    if (!avisoDesactivadoMostrado) {
      console.warn(
        '[email-sync] IMAP_USER/IMAP_APP_PASSWORD no configurados: sincronizacion de postulaciones por email desactivada.'
      );
      avisoDesactivadoMostrado = true;
    }
    return;
  }

  const client = new ImapFlow(cfg);
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const desde = new Date(Date.now() - DIAS_ATRAS * 24 * 60 * 60 * 1000);
      const uids = await client.search({ since: desde }, { uid: true });
      if (!uids || uids.length === 0) return;

      for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
        const remitente = msg.envelope.from?.[0]?.address || '';
        const parsersDelRemitente = PARSERS.filter((p) => p.remitente.test(remitente));
        if (parsersDelRemitente.length === 0) continue;

        const messageId = msg.envelope.messageId || `${msg.uid}@${remitente}`;
        if (yaProcesado(messageId)) continue;

        const parsed = await simpleParser(msg.source);
        const texto = textoDelMail(parsed);

        let datos = null;
        let parserUsado = null;
        for (const parser of parsersDelRemitente) {
          datos = parser.extraer(parsed.subject || '', texto);
          if (datos) {
            parserUsado = parser;
            break;
          }
        }

        if (!datos) {
          console.warn(`[email-sync] Mail de ${remitente} no matcheo ningun formato conocido (asunto: "${parsed.subject}")`);
          marcarProcesado(messageId);
          continue;
        }

        if (parserUsado.tipo === 'nueva_postulacion') {
          await procesarNuevaPostulacion(datos, parserUsado, msg.envelope.date || new Date());
        } else if (parserUsado.tipo === 'cambio_estado') {
          procesarCambioEstado(datos);
        }

        marcarProcesado(messageId);
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

function iniciarSincronizacionEmails() {
  cron.schedule('*/10 * * * *', () => {
    sincronizarEmails().catch((err) => {
      console.error('[email-sync] Error sincronizando postulaciones por email:', err.message);
    });
  });
  console.log('[email-sync] Scheduler de sincronizacion de postulaciones iniciado (corre cada 10 minutos).');
}

module.exports = iniciarSincronizacionEmails;
module.exports.sincronizarEmails = sincronizarEmails;
