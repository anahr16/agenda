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
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
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
// Migracion: compatibilidad de la oferta con el perfil (ver compatibilidadOferta.js).
if (!columnasPostulaciones.some((columna) => columna.name === 'compatibilidad_oferta')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN compatibilidad_oferta INTEGER');
}
if (!columnasPostulaciones.some((columna) => columna.name === 'compatibilidad_razon')) {
  db.exec('ALTER TABLE postulaciones ADD COLUMN compatibilidad_razon TEXT');
}

module.exports = db;
