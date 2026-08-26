const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { convert } = require('html-to-text');
const cron = require('node-cron');
const db = require('./db');
const PARSERS = require('./emailParsers');
const { pareceLaboral } = PARSERS;
const { obtenerDescripcion } = require('./jobPageScraper');
const { enviarTelegram } = require('./telegram');
const { calcularCompatibilidad } = require('./compatibilidadOferta');
const { leerPerfil } = require('./perfil');

const DIAS_ATRAS = Number(process.env.EMAIL_SYNC_DIAS_ATRAS || 3);
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

function actualizarCompatibilidad(id, compatibilidad, razon) {
  db.prepare('UPDATE postulaciones SET compatibilidad_oferta = ?, compatibilidad_razon = ? WHERE id = ?').run(
    compatibilidad ?? null,
    razon ?? null,
    id
  );
}

function mensajeCambioEstado({ empresa, puesto, estado }) {
  switch (estado) {
    case 'oferta':
      return `🎉 ¡Oferta de ${empresa} (${puesto})!`;
    case 'entrevista':
      return `📅 Te agendaron una entrevista con ${empresa} (${puesto}).`;
    case 'rechazada':
      return `❌ ${empresa} (${puesto}) respondió que no avanzás esta vez.`;
    case 'vista':
      return `👀 ${empresa} (${puesto}) vio tu postulación.`;
    default:
      return `${empresa} (${puesto}) actualizó tu postulación a "${estado}".`;
  }
}

// Aviso por Telegram de una postulacion nueva o un cambio de estado que el
// sistema SI reconocio (a diferencia de avisarMailNoReconocido, que es para
// lo que no reconoce). Antes esto quedaba en silencio total salvo que se
// tuviera la app abierta -- Annie solo lo anunciaba (voz/notificacion del
// navegador) mientras el frontend estaba con la pestaña abierta, comparando
// cada 60s contra el ultimo estado que vio (shell.ts). Sin la app abierta,
// no habia forma de enterarse.
async function avisarPorTelegram(mensaje) {
  try {
    await enviarTelegram(mensaje);
  } catch (err) {
    console.error('[email-sync] No se pudo avisar por Telegram:', err.message);
  }
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
  await avisarPorTelegram(`✅ Postulación detectada: ${datos.empresa} — ${datos.puesto} (${parserUsado.portal}).`);

  if (!datos.link) return;
  let descripcion;
  try {
    descripcion = await obtenerDescripcion(datos.link);
    if (descripcion) actualizarDescripcion(id, descripcion);
  } catch (err) {
    console.warn(`[email-sync] No se pudo traer la descripcion de ${datos.link}:`, err.message);
  }

  if (!descripcion) return;
  try {
    const compat = await calcularCompatibilidad(leerPerfil(), descripcion);
    if (compat) actualizarCompatibilidad(id, compat.compatibilidad, compat.razon);
  } catch (err) {
    console.warn(`[email-sync] No se pudo calcular compatibilidad con la oferta:`, err.message);
  }
}

async function procesarCambioEstado(datos) {
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
  await avisarPorTelegram(mensajeCambioEstado({ empresa: postulacion.empresa, puesto: postulacion.puesto, estado: datos.estado }));
}

function guardarParaRevision(remitente, asunto, texto, fecha) {
  db.prepare(
    'INSERT INTO postulaciones_emails_revision (remitente, asunto, cuerpo, fecha_recibido) VALUES (?, ?, ?, ?)'
  ).run(remitente, asunto || null, texto, (fecha || new Date()).toISOString());
}

// Red de contencion para mails que no matchean ningun portal conocido (ni
// por remitente ni porque el formato del contenido cambio): si igual
// *parecen* de un proceso de postulacion (por palabras clave), el mail
// completo se guarda en `postulaciones_emails_revision` (bandeja de
// revision en la pantalla de Postulaciones) y ademas se avisa por Telegram,
// en vez de perderlo en silencio -- es el caso de empresas que escriben
// directo desde su propio ATS (ej. TicMoAI).
async function avisarMailNoReconocido(remitente, asunto, texto, fecha) {
  if (!pareceLaboral(asunto, texto)) return;
  guardarParaRevision(remitente, asunto, texto, fecha);
  const extracto = texto.replace(/\s+/g, ' ').trim().slice(0, 220);
  const mensaje = `📧 Mail que parece de una postulación pero no reconozco el formato:\n${remitente}\n"${asunto || '(sin asunto)'}"\n${extracto}${
    extracto.length === 220 ? '…' : ''
  }\n\nQuedó guardado en la bandeja de revisión de Postulaciones.`;
  try {
    await enviarTelegram(mensaje);
    console.log(`[email-sync] Aviso de mail no reconocido enviado por Telegram (${remitente})`);
  } catch (err) {
    console.error('[email-sync] No se pudo avisar por Telegram de un mail no reconocido:', err.message);
  }
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
        const messageId = msg.envelope.messageId || `${msg.uid}@${remitente}`;
        if (yaProcesado(messageId)) continue;

        const parsersDelRemitente = PARSERS.filter((p) => p.remitente.test(remitente));

        if (parsersDelRemitente.length === 0) {
          // Remitente desconocido (ni Chiletrabajos, Computrabajo, LinkedIn ni
          // Trabajando.cl) -- puede ser una empresa escribiendo directo desde
          // su propio ATS. Se lee el contenido igual para poder avisar si
          // parece de una postulacion, en vez de descartarlo sin mirarlo.
          const parsed = await simpleParser(msg.source);
          const texto = textoDelMail(parsed);
          await avisarMailNoReconocido(remitente, parsed.subject || '', texto, msg.envelope.date);
          marcarProcesado(messageId);
          continue;
        }

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
          await avisarMailNoReconocido(remitente, parsed.subject || '', texto, msg.envelope.date);
          marcarProcesado(messageId);
          continue;
        }

        if (parserUsado.tipo === 'nueva_postulacion') {
          await procesarNuevaPostulacion(datos, parserUsado, msg.envelope.date || new Date());
        } else if (parserUsado.tipo === 'cambio_estado') {
          await procesarCambioEstado(datos);
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
