// Recordatorios por VOZ de Annie -- distinto de Telegram (recordatoriosEventos.js)
// y push (recordatoriosEntrevistas.js), que siguen siendo el canal principal
// porque no dependen de tener la pestana abierta. Esto es un extra: si la
// usuaria tiene la app abierta justo cuando se dispara un recordatorio,
// Annie ademas lo dice en voz alta. El frontend hace polling de este
// endpoint (mismo intervalo que ya usa para novedades de postulaciones, ver
// shell.ts) y marca cada item como "ya avisado por voz" con su propia
// columna (recordatorio_voz_enviado / recordatorio_voz_entrevista_enviado),
// separada de la de Telegram/push -- ambos canales tienen que dispararse
// igual, uno no reemplaza al otro.

const express = require('express');
const db = require('../db');

const router = express.Router();

function formatoUTC(date) {
  return date.toISOString().slice(0, 19);
}

function ahoraNaive(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

router.get('/pendientes', (req, res) => {
  const minutosAntes = Number(process.env.RECORDATORIO_MINUTOS_ANTES || 30);
  const ahora = new Date();

  const desdeNaive = ahoraNaive(ahora);
  const hastaNaive = ahoraNaive(new Date(ahora.getTime() + minutosAntes * 60000));
  const eventos = db
    .prepare('SELECT * FROM eventos WHERE usuario_id = ? AND recordatorio_voz_enviado = 0 AND hora IS NOT NULL')
    .all(req.usuario.id)
    .filter((e) => {
      const momento = `${e.fecha}T${e.hora}:00`;
      return momento > desdeNaive && momento <= hastaNaive;
    });

  const postulaciones = db
    .prepare(
      `SELECT * FROM postulaciones
       WHERE usuario_id = ?
         AND recordatorio_voz_entrevista_enviado = 0
         AND fecha_entrevista IS NOT NULL
         AND fecha_entrevista > ?
         AND fecha_entrevista <= ?`
    )
    .all(req.usuario.id, formatoUTC(ahora), formatoUTC(new Date(ahora.getTime() + minutosAntes * 60000)));

  for (const e of eventos) {
    db.prepare('UPDATE eventos SET recordatorio_voz_enviado = 1 WHERE id = ?').run(e.id);
  }
  for (const p of postulaciones) {
    db.prepare('UPDATE postulaciones SET recordatorio_voz_entrevista_enviado = 1 WHERE id = ?').run(p.id);
  }

  res.json({ eventos, entrevistas: postulaciones });
});

module.exports = router;
