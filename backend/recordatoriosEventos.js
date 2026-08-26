// Recordatorio por Telegram para los eventos sueltos de la Agenda (los que
// tienen hora -- los "todo el dia" no tienen un momento puntual para avisar
// antes). Igual que con las postulaciones, se eligio Telegram en vez de
// push porque no depende de tener la app/pestana abierta.
//
// fecha/hora de un evento se guardan tal cual las carga la usuaria (hora
// LOCAL, sin conversion a UTC -- a diferencia de fecha_entrevista). Se
// asume que el server corre en la misma zona horaria que la usuaria (mismo
// supuesto que ya usa el resto de la app, ver systemPrompt() en annie.js).

const cron = require('node-cron');
const db = require('./db');
const { enviarTelegram } = require('./telegram');

function ahoraNaive(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function procesarRecordatoriosEventos() {
  const minutosAntes = Number(process.env.RECORDATORIO_MINUTOS_ANTES || 30);
  const ahora = new Date();
  const desde = ahoraNaive(ahora);
  const hasta = ahoraNaive(new Date(ahora.getTime() + minutosAntes * 60000));

  const eventos = db
    .prepare('SELECT * FROM eventos WHERE recordatorio_enviado = 0 AND hora IS NOT NULL')
    .all()
    .filter((e) => {
      const momento = `${e.fecha}T${e.hora}:00`;
      return momento > desde && momento <= hasta;
    });

  for (const evento of eventos) {
    try {
      await enviarTelegram(`⏰ ${evento.titulo} a las ${evento.hora}${evento.notas ? ` — ${evento.notas}` : ''}`);
    } catch (err) {
      console.error(`[recordatorios-eventos] Error avisando evento #${evento.id}:`, err.message);
    }
    db.prepare('UPDATE eventos SET recordatorio_enviado = 1 WHERE id = ?').run(evento.id);
  }
}

function iniciarRecordatoriosEventos() {
  cron.schedule('* * * * *', () => {
    procesarRecordatoriosEventos().catch((err) => {
      console.error('[recordatorios-eventos] Error procesando recordatorios de eventos:', err.message);
    });
  });
  console.log('[recordatorios-eventos] Scheduler de recordatorios de eventos iniciado (corre cada minuto).');
}

module.exports = iniciarRecordatoriosEventos;
module.exports.procesarRecordatoriosEventos = procesarRecordatoriosEventos;
