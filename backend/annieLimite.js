// Cupo diario de Annie (chat + voz) por cuenta -- protege la facturacion de
// Anthropic/ElevenLabs de la usuaria dueña de esas claves contra cualquier
// cuenta publica nueva. Configurable por env var para poder ajustar el
// numero sin tocar codigo; sin configurar, cae a 40/dia cada uno.
const db = require('./db');

const LIMITE_CHAT_DIARIO = Number(process.env.ANNIE_LIMITE_CHAT_DIARIO || 40);
const LIMITE_TTS_DIARIO = Number(process.env.ANNIE_LIMITE_TTS_DIARIO || 40);

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function esOwner(usuarioId) {
  return !!db.prepare('SELECT es_owner FROM usuarios WHERE id = ?').get(usuarioId)?.es_owner;
}

function fila(usuarioId) {
  db.prepare('INSERT OR IGNORE INTO annie_uso_diario (usuario_id, fecha) VALUES (?, ?)').run(usuarioId, hoy());
  return db.prepare('SELECT * FROM annie_uso_diario WHERE usuario_id = ? AND fecha = ?').get(usuarioId, hoy());
}

// La cuenta dueña nunca se limita -- mismo criterio que estadoDe() en
// suscripcion.js (es_owner tampoco se bloquea por prueba/suscripcion).
function puedeChatear(usuarioId) {
  if (esOwner(usuarioId)) return true;
  return fila(usuarioId).chat_usados < LIMITE_CHAT_DIARIO;
}

function puedeHablar(usuarioId) {
  if (esOwner(usuarioId)) return true;
  return fila(usuarioId).tts_usados < LIMITE_TTS_DIARIO;
}

// Se registra el uso recien despues de una respuesta exitosa -- un error de
// Anthropic/ElevenLabs (502, timeout, etc.) no deberia gastarle cupo a la
// usuaria por algo que no fue culpa suya.
function registrarChat(usuarioId) {
  db.prepare('UPDATE annie_uso_diario SET chat_usados = chat_usados + 1 WHERE usuario_id = ? AND fecha = ?').run(
    usuarioId,
    hoy()
  );
}

function registrarTts(usuarioId) {
  db.prepare('UPDATE annie_uso_diario SET tts_usados = tts_usados + 1 WHERE usuario_id = ? AND fecha = ?').run(
    usuarioId,
    hoy()
  );
}

module.exports = { LIMITE_CHAT_DIARIO, LIMITE_TTS_DIARIO, puedeChatear, puedeHablar, registrarChat, registrarTts };
