const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const postulaciones = db.prepare('SELECT * FROM postulaciones ORDER BY fecha_postulacion DESC, creado_en DESC').all();
  res.json(postulaciones);
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM postulaciones').get().n;
  const porEstado = db.prepare('SELECT estado, COUNT(*) AS n FROM postulaciones GROUP BY estado').all();
  const porPortal = db
    .prepare("SELECT COALESCE(portal, 'Sin especificar') AS portal, COUNT(*) AS n FROM postulaciones GROUP BY portal")
    .all();
  res.json({ total, porEstado, porPortal });
});

router.get('/:id', (req, res) => {
  const postulacion = db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(req.params.id);
  if (!postulacion) {
    return res.status(404).json({ error: 'Postulacion no encontrada' });
  }
  res.json(postulacion);
});

router.post('/', (req, res) => {
  const { empresa, puesto, portal, descripcion, link, fecha_postulacion, estado, fecha_entrevista, notas } = req.body || {};
  if (!empresa || !puesto || !fecha_postulacion) {
    return res.status(400).json({ error: 'empresa, puesto y fecha_postulacion son obligatorios' });
  }
  const resultado = db
    .prepare(
      `INSERT INTO postulaciones (empresa, puesto, portal, descripcion, link, fecha_postulacion, estado, fecha_entrevista, notas)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 'enviada'), ?, ?)`
    )
    .run(
      empresa,
      puesto,
      portal || null,
      descripcion || null,
      link || null,
      fecha_postulacion,
      estado || null,
      fecha_entrevista || null,
      notas || null
    );
  const nuevaPostulacion = db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(resultado.lastInsertRowid);
  res.status(201).json(nuevaPostulacion);
});

router.put('/:id', (req, res) => {
  const postulacion = db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(req.params.id);
  if (!postulacion) {
    return res.status(404).json({ error: 'Postulacion no encontrada' });
  }
  const { empresa, puesto, portal, descripcion, link, fecha_postulacion, estado, fecha_entrevista, notas } = req.body || {};
  if (!empresa || !puesto || !fecha_postulacion) {
    return res.status(400).json({ error: 'empresa, puesto y fecha_postulacion son obligatorios' });
  }
  const recordatorioEntrevista =
    fecha_entrevista !== postulacion.fecha_entrevista ? 0 : postulacion.recordatorio_entrevista_enviado;
  db
    .prepare(
      `UPDATE postulaciones
       SET empresa = ?, puesto = ?, portal = ?, descripcion = ?, link = ?, fecha_postulacion = ?, estado = COALESCE(?, estado), fecha_entrevista = ?, notas = ?, recordatorio_entrevista_enviado = ?
       WHERE id = ?`
    )
    .run(
      empresa,
      puesto,
      portal || null,
      descripcion || null,
      link || null,
      fecha_postulacion,
      estado || null,
      fecha_entrevista || null,
      notas || null,
      recordatorioEntrevista,
      req.params.id
    );
  const actualizada = db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(req.params.id);
  res.json(actualizada);
});

router.delete('/:id', (req, res) => {
  const postulacion = db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(req.params.id);
  if (!postulacion) {
    return res.status(404).json({ error: 'Postulacion no encontrada' });
  }
  db.prepare('DELETE FROM postulaciones WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
