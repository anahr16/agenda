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
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );
`);

module.exports = db;
