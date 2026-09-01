const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { calcularProbabilidad } = require('../probabilidadLlamada');
const { puedeChatear, puedeHablar, registrarChat, registrarTts } = require('../annieLimite');

const router = express.Router();
const client = new Anthropic();

// Haiku en vez de Sonnet: medido en real, ~2-2.4x mas rapido (908ms vs
// 2205ms en una respuesta simple) y sigue usando bien la herramienta de
// agendar_entrevista (fechas relativas tipo "el jueves que viene" incluidas).
// Esta tarea (chat corto + una sola herramienta) no necesita el modelo mas
// grande.
const MODELO = 'claude-haiku-4-5-20251001';

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

// Calcular el dia de la semana de una fecha es un punto ciego tipico de los
// LLM (incluso Haiku se equivoco una vez diciendo "martes" para un
// miercoles) -- se lo pasamos ya calculado en vez de dejar que lo infiera,
// asi no arrastra ese error a fechas relativas como "el lunes que viene".
function diaSemanaLocal(date = new Date()) {
  return date.toLocaleDateString('es-419', { weekday: 'long' });
}

const HERRAMIENTAS = [
  {
    name: 'agendar_entrevista',
    description:
      'Agenda o reprograma una entrevista de TRABAJO en el calendario (con una empresa). Si ya existe una postulacion para esa empresa la actualiza; si no, crea una nueva postulacion en estado "entrevista". Para cualquier otra cosa (una cita personal, un recordatorio, un cumpleanos, algo con la familia) usa crear_evento en vez de esta.',
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
  {
    name: 'crear_evento',
    description:
      'Crea un evento o recordatorio PERSONAL en la Agenda -- cualquier cosa que no sea una entrevista de trabajo con una empresa: una cita con alguien (ej. "cita con mi esposo"), un control medico, un cumpleanos, un recordatorio suelto, etc.',
    input_schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Titulo corto del evento, ej. "Cita con mi esposo" o "Control medico".' },
        fecha: { type: 'string', description: 'Fecha del evento, formato YYYY-MM-DD, en la hora local de la usuaria.' },
        hora: {
          type: 'string',
          description:
            'Hora del evento en formato HH:mm (24hs), en la hora local de la usuaria. Si la usuaria no menciona una hora puntual, omitir este campo (el evento queda como "todo el dia").',
        },
        notas: { type: 'string', description: 'Notas adicionales, opcional.' },
        tipo: {
          type: 'string',
          enum: ['personal', 'medica', 'profesional', 'social'],
          description: 'Tipo de evento. Si no se puede inferir del pedido, usar "personal".',
        },
      },
      required: ['titulo', 'fecha'],
    },
  },
];

function buscarPostulacionPorEmpresa(empresa, usuarioId) {
  return db
    .prepare('SELECT * FROM postulaciones WHERE lower(empresa) = lower(?) AND usuario_id = ? ORDER BY creado_en DESC')
    .get(empresa, usuarioId);
}

function agendarEntrevista({ empresa, puesto, fecha_entrevista }, usuarioId) {
  const fechaAlmacenable = aFechaAlmacenable(fecha_entrevista);
  const existente = buscarPostulacionPorEmpresa(empresa, usuarioId);
  if (existente) {
    db.prepare(
      "UPDATE postulaciones SET fecha_entrevista = ?, estado = 'entrevista', recordatorio_entrevista_enviado = 0 WHERE id = ?"
    ).run(fechaAlmacenable, existente.id);
    return db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(existente.id);
  }
  const hoy = fechaLocalNaive().slice(0, 10);
  const resultado = db
    .prepare(
      `INSERT INTO postulaciones (empresa, puesto, fecha_postulacion, estado, fecha_entrevista, usuario_id)
       VALUES (?, ?, ?, 'entrevista', ?, ?)`
    )
    .run(empresa, puesto || 'Sin especificar', hoy, fechaAlmacenable, usuarioId);
  return db.prepare('SELECT * FROM postulaciones WHERE id = ?').get(resultado.lastInsertRowid);
}

function crearEvento({ titulo, fecha, hora, notas, tipo }, usuarioId) {
  const resultado = db
    .prepare(
      "INSERT INTO eventos (titulo, fecha, hora, notas, tipo, usuario_id) VALUES (?, ?, ?, ?, COALESCE(?, 'personal'), ?)"
    )
    .run(titulo, fecha, hora || null, notas || null, tipo || null, usuarioId);
  return db.prepare('SELECT * FROM eventos WHERE id = ?').get(resultado.lastInsertRowid);
}

function contextoPostulaciones(usuarioId) {
  const filas = db
    .prepare(
      'SELECT empresa, puesto, estado, fecha_entrevista, fecha_postulacion, compatibilidad_oferta FROM postulaciones WHERE usuario_id = ? ORDER BY creado_en DESC LIMIT 30'
    )
    .all(usuarioId);
  if (filas.length === 0) return 'Todavia no hay postulaciones cargadas.';
  return filas
    .map((p) => {
      const detalles = [`estado: ${p.estado}`];
      if (p.fecha_entrevista) detalles.push(`entrevista: ${p.fecha_entrevista}`);
      const probabilidad = calcularProbabilidad(p);
      if (probabilidad !== null) detalles.push(`probabilidad de llamada: ${probabilidad}%`);
      if (p.compatibilidad_oferta !== null && p.compatibilidad_oferta !== undefined) {
        detalles.push(`compatibilidad con la oferta: ${p.compatibilidad_oferta}%`);
      }
      return `- ${p.empresa} (${p.puesto}) · ${detalles.join(' · ')}`;
    })
    .join('\n');
}

function systemPrompt(idioma, usuarioId) {
  const instruccionIdioma =
    idioma === 'en'
      ? 'You speak English, warm, close and direct, in a few sentences (max 2-3).'
      : 'Hablas en espanol neutro (sin "vos" ni modismos regionales de ningun pais en particular), calida, cercana y directa, en pocas oraciones (maximo 2-3).';
  return `Eres Annie, la asistente de Agenda Inteligente. Revisas los mails de postulaciones laborales de la usuaria y la ayudas a no perderse ninguna entrevista.
${instruccionIdioma}
La fecha y hora actual (hora local de la usuaria) es ${fechaLocalNaive()}, que es ${diaSemanaLocal()}. Usa ese dia de la semana tal cual para calcular fechas relativas ("el lunes que viene", "el viernes", etc.) -- no lo recalcules vos misma.
Cuando la usuaria te pida agendar, mover o cambiar una entrevista de TRABAJO (menciona una empresa), usa agendar_entrevista -- si no sabe el puesto, usa "Sin especificar" como valor. Para cualquier otra cosa personal (una cita con alguien, un control medico, un cumpleanos, un recordatorio suelto) usa crear_evento en vez de tratarla como si fuera laboral.
Estas son las postulaciones actuales, con dos datos calculados que pueden aparecer:
"probabilidad de llamada" (estimacion heuristica de que la contacten, NO una garantia) y "compatibilidad con la oferta" (que tan bien calza su perfil con esa oferta puntual, calculado con IA). Si te pregunta cuales son sus postulaciones mas prometedoras o a cuales priorizar, usa estos datos, pero aclarale que son estimaciones, no certezas.
${contextoPostulaciones(usuarioId)}
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
  if (!puedeChatear(req.usuario.id)) {
    return res.status(429).json({
      error: 'Llegaste al límite diario de mensajes con Annie. Probá de nuevo mañana.',
      limite_alcanzado: true,
    });
  }

  const mensajes = [...(Array.isArray(historial) ? historial.slice(-10) : []), { role: 'user', content: mensaje }];
  const acciones = [];
  const usuario = db.prepare('SELECT idioma FROM usuarios WHERE id = ?').get(req.usuario.id);
  const prompt = systemPrompt(usuario?.idioma, req.usuario.id);

  try {
    let respuesta = await client.messages.create({
      model: MODELO,
      max_tokens: 1024,
      system: prompt,
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
            resultado = agendarEntrevista(uso.input, req.usuario.id);
            acciones.push(resultado);
          } else if (uso.name === 'crear_evento') {
            resultado = crearEvento(uso.input, req.usuario.id);
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
        model: MODELO,
        max_tokens: 1024,
        system: prompt,
        tools: HERRAMIENTAS,
        messages: mensajes,
      });
    }

    const texto = respuesta.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    registrarChat(req.usuario.id);
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
  if (!puedeHablar(req.usuario.id)) {
    return res.status(429).json({ error: 'Llegaste al límite diario de voz de Annie.', limite_alcanzado: true });
  }
  console.log(`[annie-tts] Pedido de voz (${new Date().toISOString()}): "${texto}"`);

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
        // stability baja + style alto es la combinacion que ElevenLabs mismo
        // advierte que genera artefactos, mas notorio en frases cortas.
        // speed levemente bajo el 1.0 normal: la primera palabra de una
        // frase sonaba "atropellada" (arranca mas rapido de lo que asienta
        // despues) -- comun en TTS, se suaviza bajando un poco el ritmo
        // general.
        voice_settings: { stability: 0.65, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.9 },
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error(`[annie-tts] ElevenLabs respondio ${respuesta.status}: ${detalle}`);
      return res.status(502).json({ error: 'No se pudo generar la voz de Annie.' });
    }

    const audio = Buffer.from(await respuesta.arrayBuffer());
    registrarTts(req.usuario.id);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    console.error('[annie-tts] Error consultando ElevenLabs:', err.message);
    res.status(502).json({ error: 'No se pudo generar la voz de Annie.' });
  }
});

// Resumen de "mientras no estuviste" para el saludo -- lo que paso en
// Postulaciones (nueva postulacion detectada, cambio de estado) desde la
// ultima vez que Annie saludo a esta usuaria. Corta y actualiza el corte en
// el mismo pedido para que el proximo saludo no repita lo ya contado.
router.get('/actividad-pendiente', (req, res) => {
  const usuario = db.prepare('SELECT ultima_bienvenida FROM usuarios WHERE id = ?').get(req.usuario.id);
  // Si nunca se guardo un corte (primera vez que se llama este endpoint para
  // esta usuaria), no hay que devolver vacio -- hay que traer todo lo que
  // haya en el log, porque para ella es la primera vez que se entera.
  const desde = usuario?.ultima_bienvenida || '0000-00-00';
  const actividad = db
    .prepare('SELECT mensaje FROM actividad_postulaciones WHERE usuario_id = ? AND creado_en > ? ORDER BY creado_en ASC')
    .all(req.usuario.id, desde);
  db.prepare("UPDATE usuarios SET ultima_bienvenida = datetime('now') WHERE id = ?").run(req.usuario.id);
  res.json({ actividad: actividad.map((a) => a.mensaje) });
});

module.exports = router;
