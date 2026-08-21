const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const citas = db.prepare('SELECT * FROM citas ORDER BY inicio').all();
  res.json(citas);
});

router.get('/:id', (req, res) => {
  const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(req.params.id);
  if (!cita) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }
  res.json(cita);
});

router.post('/', (req, res) => {
  const { cliente_id, inicio, fin, estado, notas } = req.body || {};
  if (!cliente_id || !inicio || !fin) {
    return res.status(400).json({ error: 'cliente_id, inicio y fin son obligatorios' });
  }
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cliente_id);
  if (!cliente) {
    return res.status(400).json({ error: 'cliente_id no corresponde a un cliente existente' });
  }
  const resultado = db
    .prepare('INSERT INTO citas (cliente_id, inicio, fin, estado, notas) VALUES (?, ?, ?, COALESCE(?, \'confirmada\'), ?)')
    .run(cliente_id, inicio, fin, estado || null, notas || null);
  const nuevaCita = db.prepare('SELECT * FROM citas WHERE id = ?').get(resultado.lastInsertRowid);
  res.status(201).json(nuevaCita);
});

router.put('/:id', (req, res) => {
  const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(req.params.id);
  if (!cita) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }
  const { cliente_id, inicio, fin, estado, notas } = req.body || {};
  if (!cliente_id || !inicio || !fin) {
    return res.status(400).json({ error: 'cliente_id, inicio y fin son obligatorios' });
  }
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cliente_id);
  if (!cliente) {
    return res.status(400).json({ error: 'cliente_id no corresponde a un cliente existente' });
  }
  db
    .prepare('UPDATE citas SET cliente_id = ?, inicio = ?, fin = ?, estado = COALESCE(?, estado), notas = ? WHERE id = ?')
    .run(cliente_id, inicio, fin, estado || null, notas || null, req.params.id);
  const actualizada = db.prepare('SELECT * FROM citas WHERE id = ?').get(req.params.id);
  res.json(actualizada);
});

router.delete('/:id', (req, res) => {
  const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(req.params.id);
  if (!cita) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }
  db.prepare('DELETE FROM citas WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
