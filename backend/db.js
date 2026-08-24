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
    notas TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migracion: agrega recordatorio_enviado si la tabla citas ya existia sin esa columna.
const columnasCitas = db.prepare('PRAGMA table_info(citas)').all();
if (!columnasCitas.some((columna) => columna.name === 'recordatorio_enviado')) {
  db.exec('ALTER TABLE citas ADD COLUMN recordatorio_enviado INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;
