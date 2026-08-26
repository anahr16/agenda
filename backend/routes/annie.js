const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const router = express.Router();
const client = new Anthropic();

// El resto de la app (formulario de Postulaciones, Agenda) guarda fecha_entrevista
// como hora LOCAL sin offset (el form convierte con `new Date(local).toISOString()`,
// que en el navegador interpreta el string como hora local). Para que Annie guarde
// consistente con eso, le pedimos la hora en el mismo formato "naive" y la
// convertimos acá con el mismo mecanismo, pero en el reloj del server.
function fechaLocalNaive(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function aFechaAlmacenable(fechaNaive) {
  return new Date(fechaNaive).toISOString().slice(0, 19);
}

const HERRAMIENTAS = [
  {
    name: 'agendar_entrevista',
    description:
      'Agenda o reprograma una entrevista de trabajo en el calendario. Si ya existe una postulacion para esa empresa la actualiza; si no, crea una nueva postulacion en estado "entrevista".',
    input_schema: {
      type: 'object',
      properties: {
        empresa: { type: 'string', description: 'Nombre de la empresa' },
        puesto: { type: 'string', description: 'Puesto al que postula. Si no se sabe, usar "Sin especificar".' },
        fecha_entrevista: {
          type: 'string',
          description:
            'Fecha y hora de la entrevista en formato ISO 8601 SIN zona horaria (ej. 2026-08-28T13:00:00), tal como la usuaria la dice en su hora local. No hagas conversion de zona horaria, solo escribi la hora tal cual.',
        },
      },
      required: ['empresa', 'fecha_entrevista'],
    },
  },
];

function buscarPostulacionPorEmpresa(empresa) {
  return db.prepare('SELECT * FROM postulaciones WHERE lower(empresa) = lower(?) ORDER BY creado_en DESC').get(empresa);
}

function agendarEntrevista({ empresa, puesto, fecha_entrevista }) {
  const fechaAlmacenable = aFechaAlmacenable(fecha_entrevista);
  const existente = buscarPostulacionPorEmpresa(empresa);
  if (existente) {
    db.prepare(
      "UPDATE postulaciones SET fecha_entrevista = ?, estado = 'entrevista', recordatorio_entrevista_enviado = 0 WHERE id = ?"
    ).run(fechaAlmacenable, existente.id);
    return db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(existente.id);
  }
  const hoy = fechaLocalNaive().slice(0, 10);
  const resultado = db
    .prepare(
      `INSERT INTO postulaciones (empresa, puesto, fecha_postulacion, estado, fecha_entrevista)
       VALUES (?, ?, ?, 'entrevista', ?)`
    )
    .run(empresa, puesto || 'Sin especificar', hoy, fechaAlmacenable);
  return db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(resultado.lastInsertRowid);
}

function contextoPostulaciones() {
  const filas = db
    .prepare('SELECT empresa, puesto, estado, fecha_entrevista FROM postulaciones ORDER BY creado_en DESC LIMIT 30')
    .all();
  if (filas.length === 0) return 'Todavia no hay postulaciones cargadas.';
  return filas
    .map((p) => `- ${p.empresa} (${p.puesto}) · estado: ${p.estado}${p.fecha_entrevista ? ` · entrevista: ${p.fecha_entrevista}` : ''}`)
    .join('\n');
}

function systemPrompt() {
  return `Eres Annie, la asistente de Agenda Inteligente. Revisas los mails de postulaciones laborales de la usuaria y la ayudas a no perderse ninguna entrevista.
Hablas en espanol neutro (sin "vos" ni modismos regionales de ningun pais en particular), calida, cercana y directa, en pocas oraciones (maximo 2-3).
La fecha y hora actual (hora local de la usuaria) es ${fechaLocalNaive()}.
Cuando la usuaria te pida agendar, mover o cambiar una entrevista, usa la herramienta agendar_entrevista. Si no sabe el puesto, usa "Sin especificar" como valor.
Estas son las postulaciones actuales:
${contextoPostulaciones()}
Despues de usar una herramienta, confirmale a la usuaria en una oracion corta lo que hiciste.`;
}

router.post('/chat', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Annie no tiene la IA configurada todavia.' });
  }
  const { mensaje, historial } = req.body || {};
  if (!mensaje || typeof mensaje !== 'string') {
    return res.status(400).json({ error: 'Falta el mensaje' });
  }

  const mensajes = [...(Array.isArray(historial) ? historial.slice(-10) : []), { role: 'user', content: mensaje }];
  const acciones = [];

  try {
    let respuesta = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: systemPrompt(),
      tools: HERRAMIENTAS,
      messages: mensajes,
    });

    while (respuesta.stop_reason === 'tool_use') {
      const usos = respuesta.content.filter((b) => b.type === 'tool_use');
      mensajes.push({ role: 'assistant', content: respuesta.content });

      const resultados = usos.map((uso) => {
        let resultado;
        try {
          if (uso.name === 'agendar_entrevista') {
            resultado = agendarEntrevista(uso.input);
            acciones.push(resultado);
          } else {
            resultado = { error: 'Herramienta desconocida' };
          }
        } catch (err) {
          resultado = { error: err.message };
        }
        return { type: 'tool_result', tool_use_id: uso.id, content: JSON.stringify(resultado) };
      });

      mensajes.push({ role: 'user', content: resultados });

      respuesta = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: systemPrompt(),
        tools: HERRAMIENTAS,
        messages: mensajes,
      });
    }

    const texto = respuesta.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    res.json({
      respuesta: texto || 'Listo.',
      historial: [...mensajes, { role: 'assistant', content: respuesta.content }],
      acciones,
    });
  } catch (err) {
    console.error('[annie] Error consultando la IA:', err.message);
    res.status(502).json({ error: 'Annie no pudo responder, intenta de nuevo en un rato.' });
  }
});

router.post('/tts', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return res.status(503).json({ error: 'La voz de Annie no esta configurada todavia.' });
  }
  const { texto } = req.body || {};
  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({ error: 'Falta el texto' });
  }

  try {
    const respuesta = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: texto,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.6, use_speaker_boost: true },
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error(`[annie-tts] ElevenLabs respondio ${respuesta.status}: ${detalle}`);
      return res.status(502).json({ error: 'No se pudo generar la voz de Annie.' });
    }

    const audio = Buffer.from(await respuesta.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    console.error('[annie-tts] Error consultando ElevenLabs:', err.message);
    res.status(502).json({ error: 'No se pudo generar la voz de Annie.' });
  }
});

module.exports = router;
