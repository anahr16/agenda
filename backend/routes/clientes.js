const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nombre').all();
  res.json(clientes);
});

router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }
  res.json(cliente);
});

router.post('/', (req, res) => {
  const { nombre, telefono } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: 'nombre es obligatorio' });
  }
  const resultado = db
    .prepare('INSERT INTO clientes (nombre, telefono) VALUES (?, ?)')
    .run(nombre, telefono || null);
  const nuevoCliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(resultado.lastInsertRowid);
  res.status(201).json(nuevoCliente);
});

router.put('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }
  const { nombre, telefono } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: 'nombre es obligatorio' });
  }
  db.prepare('UPDATE clientes SET nombre = ?, telefono = ? WHERE id = ?').run(nombre, telefono || null, req.params.id);
  const actualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  res.json(actualizado);
});

router.delete('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }
  db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
