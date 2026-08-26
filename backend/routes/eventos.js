// Eventos/recordatorios sueltos de la Agenda -- a diferencia de las
// entrevistas (que vienen de Postulaciones) o las citas (ligadas a un
// cliente), estos son de cualquier tipo y se cargan directo desde la
// pantalla de Agenda.

const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const eventos = db.prepare('SELECT * FROM eventos ORDER BY fecha, hora').all();
  res.json(eventos);
});

router.post('/', (req, res) => {
  const { titulo, fecha, hora, notas, tipo } = req.body || {};
  if (!titulo || !fecha) {
    return res.status(400).json({ error: 'titulo y fecha son obligatorios' });
  }
  const resultado = db
    .prepare('INSERT INTO eventos (titulo, fecha, hora, notas, tipo) VALUES (?, ?, ?, ?, COALESCE(?, \'personal\'))')
    .run(titulo, fecha, hora || null, notas || null, tipo || null);
  res.status(201).json(db.prepare('SELECT * FROM eventos WHERE id = ?').get(resultado.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  const { titulo, fecha, hora, notas, tipo } = req.body || {};
  if (!titulo || !fecha) {
    return res.status(400).json({ error: 'titulo y fecha son obligatorios' });
  }
  const cambioFechaHora = fecha !== evento.fecha || (hora || null) !== evento.hora;
  const recordatorioEnviado = cambioFechaHora ? 0 : evento.recordatorio_enviado;
  db
    .prepare(
      "UPDATE eventos SET titulo = ?, fecha = ?, hora = ?, notas = ?, tipo = COALESCE(?, 'personal'), recordatorio_enviado = ? WHERE id = ?"
    )
    .run(titulo, fecha, hora || null, notas || null, tipo || null, recordatorioEnviado, req.params.id);
  res.json(db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  db.prepare('DELETE FROM eventos WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
