// Bandeja de revision de mails que "parecen" de una postulacion pero no
// matchearon ningun parser conocido (ver avisarMailNoReconocido en
// emailSync.js). Se guardan completos para poder cargarlos a Postulaciones
// a mano sin tener que ir a buscarlos al correo.

const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const mails = db
    .prepare('SELECT * FROM postulaciones_emails_revision WHERE usuario_id = ? ORDER BY fecha_recibido DESC, id DESC')
    .all(req.usuario.id);
  res.json(mails);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM postulaciones_emails_revision WHERE id = ? AND usuario_id = ?').run(
    req.params.id,
    req.usuario.id
  );
  res.status(204).send();
});

module.exports = router;
