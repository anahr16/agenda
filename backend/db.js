const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'turnero.sqlite'));

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    inicio TEXT NOT NULL,
    fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'confirmada',
    notas TEXT,
    recordatorio_enviado INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    fcm_token TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS postulaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa TEXT NOT NULL,
    puesto TEXT NOT NULL,
    portal TEXT,
    descripcion TEXT,
    link TEXT,
    fecha_postulacion TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'enviada',
    fecha_entrevista TEXT,
    notas TEXT,
    recordatorio_seguimiento_enviado INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS postulaciones_emails_procesados (
    message_id TEXT PRIMARY KEY,
    procesado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS postulaciones_emails_revision (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remitente TEXT,
    asunto TEXT,
    cuerpo TEXT,
    fecha_recibido TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT,
    notas TEXT,
    tipo TEXT NOT NULL DEFAULT 'personal',
    recordatorio_enviado INTEGER NOT NULL DEFAULT 0,
    recordatorio_voz_enviado INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Log de "algo paso" en Postulaciones (nueva postulacion detectada, cambio de
  -- estado) -- alimenta el resumen de "mientras no estuviste" que Annie dice al
  -- saludar (routes/annie.js, corte en usuarios.ultima_bienvenida). No hace
  -- falta un flag de "ya avisado por voz": mientras la pestaña esta abierta,
  -- detectarNovedades() en shell.ts ya anuncia esto en vivo comparando contra
  -- la ultima lista de postulaciones conocida -- este log es solo para lo que
  -- paso con la app cerrada, que detectarNovedades no puede ver.
  CREATE TABLE IF NOT EXISTS actividad_postulaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postulacion_id INTEGER,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (postulacion_id) REFERENCES postulaciones(id)
  );

  -- Cupo diario de Annie (chat + voz) por cuenta -- ver annieLimite.js.
  -- Clave compuesta (usuario_id, fecha): una fila por dia por usuario, se crea
  -- sola la primera vez que se consulta ese dia (INSERT OR IGNORE).
  CREATE TABLE IF NOT EXISTS annie_uso_diario (
    usuario_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    chat_usados INTEGER NOT NULL DEFAULT 0,
    tts_usados INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (usuario_id, fecha)
  );
`);

// Migracion: agrega recordatorio_enviado si la tabla eventos ya existia sin esa columna.
const columnasEventos = db.prepare('PRAGMA table_info(eventos)').all();
if (!columnasEventos.some((columna) => columna.name === 'recordatorio_enviado')) {
  db.exec('ALTER TABLE eventos ADD COLUMN recordatorio_enviado INTEGER NOT NULL DEFAULT 0');
}
if (!columnasEventos.some((columna) => columna.name === 'tipo')) {
  db.exec("ALTER TABLE eventos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'personal'");
}
if (!columnasEventos.some((columna) => columna.name === 'recordatorio_voz_enviado')) {
  db.exec('ALTER TABLE eventos ADD COLUMN recordatorio_voz_enviado INTEGER NOT NULL DEFAULT 0');
}

// Migracion: agrega recordatorio_enviado si la tabla citas ya existia sin esa columna.
const columnasCitas = db.prepare('PRAGMA table_info(citas)').all();
if (!columnasCitas.some((columna) => columna.name === 'recordatorio_enviado')) {
  db.exec('ALTER TABLE citas ADD COLUMN recordatorio_enviado INTEGER NOT NULL DEFAULT 0');
}

// Migracion: agrega fecha_entrevista si la tabla postulaciones ya existia sin esa columna.
const columnasPostulaciones = db.prepare('PRAGMA table_info(postulaciones)').all();
if (!columnasPostulaciones.some((columna) => columna.name === 'fecha_entrevista')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN fecha_entrevista TEXT');
}
if (!columnasPostulaciones.some((columna) => columna.name === 'recordatorio_seguimiento_enviado')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN recordatorio_seguimiento_enviado INTEGER NOT NULL DEFAULT 0');
}
if (!columnasPostulaciones.some((columna) => columna.name === 'recordatorio_entrevista_enviado')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN recordatorio_entrevista_enviado INTEGER NOT NULL DEFAULT 0');
}
if (!columnasPostulaciones.some((columna) => columna.name === 'recordatorio_voz_entrevista_enviado')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN recordatorio_voz_entrevista_enviado INTEGER NOT NULL DEFAULT 0');
}
// Migracion: compatibilidad de la oferta con el perfil (ver compatibilidadOferta.js).
if (!columnasPostulaciones.some((columna) => columna.name === 'compatibilidad_oferta')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN compatibilidad_oferta INTEGER');
}
if (!columnasPostulaciones.some((columna) => columna.name === 'compatibilidad_razon')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN compatibilidad_razon TEXT');
}

// Migracion: datos de perfil y preferencias (pantalla de Configuracion).
const columnasUsuarios = db.prepare('PRAGMA table_info(usuarios)').all();
if (!columnasUsuarios.some((columna) => columna.name === 'nombre')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN nombre TEXT');
}
if (!columnasUsuarios.some((columna) => columna.name === 'foto_perfil')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT');
}
if (!columnasUsuarios.some((columna) => columna.name === 'idioma')) {
  db.exec("ALTER TABLE usuarios ADD COLUMN idioma TEXT NOT NULL DEFAULT 'es'");
}
if (!columnasUsuarios.some((columna) => columna.name === 'tema')) {
  db.exec("ALTER TABLE usuarios ADD COLUMN tema TEXT NOT NULL DEFAULT 'claro'");
}
if (!columnasUsuarios.some((columna) => columna.name === 'notificaciones_activas')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN notificaciones_activas INTEGER NOT NULL DEFAULT 1');
}
// Migracion: marca de "ultima vez que Annie saludo" -- corte para el resumen
// de actividad_postulaciones que arma el "mientras no estuviste" del saludo.
if (!columnasUsuarios.some((columna) => columna.name === 'ultima_bienvenida')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN ultima_bienvenida TEXT');
}

// Migracion: multi-tenancy -- hasta aca todo (postulaciones, eventos, la
// actividad que arma el saludo de Annie, la bandeja de mails sin reconocer)
// era una unica base de datos global sin nocion de "de quien es cada fila".
// Se agrega usuario_id a las 4 tablas de abajo y se lo asigna, una unica vez
// por columna nueva, a la cuenta que ya existia (la primera fila de
// usuarios). Un usuario_id NULL despues de esta migracion es un bug real, no
// algo para reasignar en silencio en un reinicio futuro -- por eso el
// backfill vive adentro del mismo guard que crea la columna.
const primeraUsuaria = db.prepare('SELECT id FROM usuarios ORDER BY id ASC LIMIT 1').get();

const columnasPostulacionesTenant = db.prepare('PRAGMA table_info(postulaciones)').all();
if (!columnasPostulacionesTenant.some((columna) => columna.name === 'usuario_id')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN usuario_id INTEGER');
  if (primeraUsuaria) {
    db.prepare('UPDATE postulaciones SET usuario_id = ? WHERE usuario_id IS NULL').run(primeraUsuaria.id);
  }
}

const columnasEventosTenant = db.prepare('PRAGMA table_info(eventos)').all();
if (!columnasEventosTenant.some((columna) => columna.name === 'usuario_id')) {
  db.exec('ALTER TABLE eventos ADD COLUMN usuario_id INTEGER');
  if (primeraUsuaria) {
    db.prepare('UPDATE eventos SET usuario_id = ? WHERE usuario_id IS NULL').run(primeraUsuaria.id);
  }
}

const columnasActividadTenant = db.prepare('PRAGMA table_info(actividad_postulaciones)').all();
if (!columnasActividadTenant.some((columna) => columna.name === 'usuario_id')) {
  db.exec('ALTER TABLE actividad_postulaciones ADD COLUMN usuario_id INTEGER');
  if (primeraUsuaria) {
    db.prepare('UPDATE actividad_postulaciones SET usuario_id = ? WHERE usuario_id IS NULL').run(primeraUsuaria.id);
  }
}

const columnasRevisionTenant = db.prepare('PRAGMA table_info(postulaciones_emails_revision)').all();
if (!columnasRevisionTenant.some((columna) => columna.name === 'usuario_id')) {
  db.exec('ALTER TABLE postulaciones_emails_revision ADD COLUMN usuario_id INTEGER');
  if (primeraUsuaria) {
    db.prepare('UPDATE postulaciones_emails_revision SET usuario_id = ? WHERE usuario_id IS NULL').run(
      primeraUsuaria.id
    );
  }
}

// Migracion: marca de cuenta "dueña" -- emailSync.js y los recordatorios por
// Telegram/push siguen atados a un unico mailbox/chat de Telegram (variables
// de entorno, no por usuario), asi que necesitan saber a que cuenta pertenece
// esa actividad ahora que puede haber mas de una cuenta registrada. Se marca
// unicamente a la cuenta que ya existia; cualquier cuenta publica nueva queda
// en 0 (ver ownerUsuario.js).
if (!columnasUsuarios.some((columna) => columna.name === 'es_owner')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN es_owner INTEGER NOT NULL DEFAULT 0');
  if (primeraUsuaria) {
    db.prepare('UPDATE usuarios SET es_owner = 1 WHERE id = ?').run(primeraUsuaria.id);
  }
}

// Migracion: perfil/CV por cuenta -- antes era un unico perfil.txt global
// (ver perfil.js), asi que la compatibilidad con IA solo tenia sentido para
// la cuenta dueña. Cada cuenta ahora tiene su propio texto de perfil.
if (!columnasUsuarios.some((columna) => columna.name === 'perfil_cv')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN perfil_cv TEXT');
}

// Migracion: credenciales de Computrabajo (encriptadas, ver encriptado.js)
// para el scraper de "mis postulaciones" -- ver computrabajoScraper.js.
// Guardadas por cuenta aunque hoy solo la dueña las usa (mas simple que un
// gate aparte, y es el mismo patron self-limiting que ya hay en otros
// lugares: nadie mas las va a cargar todavia).
if (!columnasUsuarios.some((columna) => columna.name === 'computrabajo_email')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN computrabajo_email TEXT');
}
if (!columnasUsuarios.some((columna) => columna.name === 'computrabajo_password_enc')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN computrabajo_password_enc TEXT');
}
if (!columnasUsuarios.some((columna) => columna.name === 'computrabajo_cookies_enc')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN computrabajo_cookies_enc TEXT');
}

// Migracion: suscripcion -- prueba gratuita + estado pago, unificado entre
// MercadoPago (web) y Google Play (Android). No se guarda un "estado" como
// texto aparte: se deriva siempre comparando datetime('now') contra estas
// dos fechas (ver suscripcion.js), evitando que un enum quede desincronizado
// de la fecha real en algun lado.
const TRIAL_DIAS_MIGRACION = Number(process.env.TRIAL_DIAS || 14);
if (!columnasUsuarios.some((columna) => columna.name === 'fecha_fin_prueba')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN fecha_fin_prueba TEXT');
  // Backfill: cuentas que ya existian antes de este cambio arrancan con una
  // prueba nueva y completa desde HOY, no desde su fecha de alta original --
  // lo contrario las dejaria bloqueadas de golpe, sin aviso, el dia que se
  // despliegue este codigo (a la cuenta dueña no le afecta, ver es_owner).
  db.exec(`UPDATE usuarios SET fecha_fin_prueba = datetime('now', '+${TRIAL_DIAS_MIGRACION} days') WHERE fecha_fin_prueba IS NULL`);
}
if (!columnasUsuarios.some((columna) => columna.name === 'suscripcion_vence')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN suscripcion_vence TEXT');
}
if (!columnasUsuarios.some((columna) => columna.name === 'suscripcion_fuente')) {
  db.exec("ALTER TABLE usuarios ADD COLUMN suscripcion_fuente TEXT"); // 'mercadopago' | 'google_play'
}
if (!columnasUsuarios.some((columna) => columna.name === 'mercadopago_preapproval_id')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN mercadopago_preapproval_id TEXT');
}
if (!columnasUsuarios.some((columna) => columna.name === 'google_play_purchase_token')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN google_play_purchase_token TEXT');
}

// Log de auditoria de eventos de suscripcion (webhooks de MercadoPago y
// notificaciones de Google Play) -- mismo espiritu que actividad_postulaciones.
// Sin constraint de dedup: la idempotencia real es que cada webhook siempre
// vuelve a consultar el estado autoritativo al proveedor en vez de confiar
// en los numeros que trae el aviso, asi que procesar el mismo evento dos
// veces da el mismo resultado. Esta tabla es solo para poder ver que paso.
db.exec(`
  CREATE TABLE IF NOT EXISTS suscripcion_eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    fuente TEXT NOT NULL,
    tipo TEXT NOT NULL,
    referencia_externa TEXT,
    payload TEXT,
    procesado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
